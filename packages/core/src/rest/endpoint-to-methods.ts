import type { EndpointOptions, RequestParameters, Route } from "@octokit/types";
import { isMap } from "util/types";
import type { Doyokit } from "../core";
import type {
  EndpointDecorations,
  EndpointsDefaultsAndDeclaration,
} from "./types";

type MethodMaps = Map<string, object>;
type NewMethods = { [key: string]: object };
type ProxyTarget = {
  doyokit: Doyokit;
  maps: MethodMaps;
  cache: Record<string, (...args: any[]) => any>;
};

const handler = {
  has({ maps }: ProxyTarget, methodName: string) {
    //return methodsMap.has(methodName);
    return maps.has(methodName);
  },
  getOwnPropertyDescriptor(target: ProxyTarget, methodName: string) {
    return {
      value: this.get(target, methodName), // ensures method is in the cache
      configurable: true,
      writable: true,
      enumerable: true,
    };
  },
  defineProperty(
    target: ProxyTarget,
    methodName: string,
    descriptor: PropertyDescriptor
  ) {
    Object.defineProperty(target.cache, methodName, descriptor);
    return true;
  },
  deleteProperty(target: ProxyTarget, methodName: string) {
    delete target.cache[methodName];
    return true;
  },
  ownKeys({ maps }: ProxyTarget) {
    return [...maps.keys()];
  },
  set(target: ProxyTarget, methodName: string, value: any) {
    return (target.cache[methodName] = value);
  },
  get({ doyokit, cache, maps }: ProxyTarget, methodName: string) {
    if (cache[methodName]) {
      return cache[methodName];
    }

    const method = maps.get(methodName);

    if (!method) {
      return undefined;
    }

    const { endpointDefaults, decorations, scope } = method as any;
    if (decorations) {
      cache[methodName] = decorate(
        doyokit,
        scope,
        methodName,
        endpointDefaults,
        decorations
      );
    } else {
      cache[methodName] = doyokit.request.defaults(endpointDefaults);
    }
    return cache[methodName];
  },
};

function parseEndpoints(
  routes: EndpointsDefaultsAndDeclaration,
  methodMaps: MethodMaps,
  scopes: string[] = []
) {
  for (const [ns, endpoints] of Object.entries(routes)) {
    if (!methodMaps.has(ns)) {
      methodMaps.set(ns, new Map());
    }
    scopes.push(ns);

    if (Array.isArray(endpoints)) {
      const [route, defaults, decorations] = endpoints;
      const [method, url] = route.split(/ /);
      const endpointDefaults = Object.assign(
        {
          method,
          url,
        },
        defaults
      );

      const scope = scopes.join(".");
      methodMaps.set(ns, {
        scope,
        methodName: ns,
        endpointDefaults,
        decorations,
      });
    } else {
      parseEndpoints(endpoints, methodMaps.get(ns) as MethodMaps);
    }
  }
}

function genProxy(
  doyokit: Doyokit,
  methodsMap: MethodMaps,
  newMethods: NewMethods
) {
  for (const [ns, props] of methodsMap.entries()) {
    if (!newMethods[ns]) {
      newMethods[ns] = {};
    }

    let hasChild = false;
    if (isMap(props)) {
      // detect if maps has child methods
      for (const [, testProps] of props.entries()) {
        hasChild = !Object.keys(testProps as any).includes("endpointDefaults");
        break;
      }
    }

    if (hasChild) {
      genProxy(doyokit, props as MethodMaps, newMethods[ns] as NewMethods);
    } else {
      newMethods[ns] = new Proxy(
        { doyokit, cache: {}, maps: props as MethodMaps },
        handler
      );
    }
  }
}

function decorate(
  doyokit: Doyokit,
  scope: string,
  methodName: string,
  defaults: EndpointOptions,
  decorations: EndpointDecorations
) {
  const requestWithDefaults = doyokit.request.defaults(defaults);

  /* istanbul ignore next */
  function withDecorations(
    ...args: [Route, RequestParameters?] | [EndpointOptions]
  ) {
    // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
    let options = requestWithDefaults.endpoint.merge(...args);

    // There are currently no other decorations than `.mapToData`
    if (decorations.mapToData) {
      options = Object.assign({}, options, {
        data: options[decorations.mapToData],
        [decorations.mapToData]: undefined,
      });
      return requestWithDefaults(options);
    }

    if (decorations.renamed) {
      const [newScope, newMethodName] = decorations.renamed;
      doyokit.log.warn(
        `doyokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`
      );
    }
    if (decorations.deprecated) {
      doyokit.log.warn(decorations.deprecated);
    }

    if (decorations.renamedParameters) {
      // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
      const options = requestWithDefaults.endpoint.merge(...args);

      for (const [name, alias] of Object.entries(
        decorations.renamedParameters
      )) {
        if (name in options) {
          doyokit.log.warn(
            `"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`
          );
          if (!(alias in options)) {
            options[alias] = options[name];
          }
          delete options[name];
        }
      }
      return requestWithDefaults(options);
    }

    // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
    return requestWithDefaults(...args);
  }
  return Object.assign(withDecorations, requestWithDefaults);
}

export function endpointToMethods<T>(
  doyokit: Doyokit,
  routes: EndpointsDefaultsAndDeclaration
) {
  const methodsMap: MethodMaps = new Map();
  parseEndpoints(routes, methodsMap);

  const newMethods: NewMethods = {};
  genProxy(doyokit, methodsMap, newMethods);
  return newMethods as T;
}
