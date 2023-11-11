import { readJson, writeFile } from "@doyokit/utils";
import { basename } from "path";
import { format } from "prettier";
import sortKeys from "sort-keys";
import type { GeneratorOptions, JsonEndpoint } from "../types";

function stringToJsdocComment(description?: string) {
  if (!description) return "";
  return (
    description &&
    "/**\n" +
      description
        .trim()
        .split("\n")
        .map((str) => " * " + str)
        .join("\n") +
      "\n */"
  );
}

function parseEndpoint(routes: any, endpoint: JsonEndpoint, ns?: string) {
  ns = ns ?? endpoint.id;
  const split = ns.split("/");
  const current = split[0];

  if (!routes[current]) {
    routes[current] = {};
  }
  if (split.length > 1) {
    const nextNs = split.splice(1).join("/");
    parseEndpoint(routes[current], endpoint, nextNs);
    return;
  }

  const nsSplit = endpoint.id.split("/");
  const namespace = nsSplit.slice(0, nsSplit.length - 1).join("/");
  routes[current] = {
    id: current,
    namespace,
    url: endpoint.url,
    method: endpoint.method,
    route: `${endpoint.method} ${endpoint.url}`,
    description: stringToJsdocComment(endpoint.description),
    deprecated: endpoint.deprecated,
  };
}

function getRoutes(ENDPOINTS: JsonEndpoint[]) {
  const routes: any = {};

  ENDPOINTS.forEach((endpoint) => {
    parseEndpoint(routes, endpoint);
  });
  return sortKeys(routes, { deep: true });
}

type ParseRouteCallbackParams = {
  deprecated: boolean;
  description: string;
  method: string;
  route: string;
  url: string;
  id: string;
  namespace: string;
};

function parseRoutes(
  routes: any,
  callback: (params: ParseRouteCallbackParams) => string,
  outputs: string[] = []
): string[] {
  for (const [ns, props] of Object.entries(routes)) {
    const keys = Object.keys(props as object);
    if (!keys.includes("url")) {
      outputs.push(`${ns}:{`);
      parseRoutes(props, callback, outputs);
      outputs.push("}");
      continue;
    }
    const output = callback(props as ParseRouteCallbackParams);
    outputs.push((props as ParseRouteCallbackParams).description);
    outputs.push(output);
  }
  return outputs;
}

async function genMethodTypes(options: GeneratorOptions, ROUTES: any) {
  const methodTypes = parseRoutes(ROUTES, (params) => {
    return `${params.id}:{
      parameters: RequestParameters & Omit<Endpoints["${params.route}"]["parameters"], "baseUrl" | "headers" | "mediaType">,
      response: Endpoints["${params.route}"]["response"]
    }`;
  });

  const contents = `
  import type { Endpoints } from './Endpoints';
  import type { RequestParameters } from "@octokit/types";
  export type RestEndpointMethodTypes = {
    ${methodTypes.join("\n")}
  }
  `;
  const formatted = await format(contents, { parser: "typescript" });
  writeFile(options.targets.restMethodTypes, formatted);
}

async function genMethods(options: GeneratorOptions, ROUTES: any) {
  const methods = parseRoutes(ROUTES, (params) => {
    const nsOutputs: string[] = [];
    params.namespace.split("/").forEach((ns) => {
      nsOutputs.push(`["${ns}"]`);
    });
    const nsJoin = nsOutputs.join("");
    return `${params.id}: {
      (params?: RestEndpointMethodTypes${nsJoin}["${params.id}"]["parameters"]): Promise<RestEndpointMethodTypes${nsJoin}["${params.id}"]["response"]>
      defaults: RequestInterface["defaults"];
      endpoint: EndpointInterface<{ url: string }>;
    }`;
  });

  const methodTypes = basename(options.targets.restMethodTypes);
  const contents = `
  import type { EndpointInterface, RequestInterface } from "@octokit/types";
  import type { RestEndpointMethodTypes } from "./${methodTypes}";
  export type RestEndpointMethods = {
    ${methods.join("\n")}
  }
  `;
  const formatted = await format(contents, { parser: "typescript" });
  writeFile(options.targets.restMethods, formatted);
}

async function genBarrel(options: GeneratorOptions) {
  const contents = `
  export * from "./Endpoints";
  export * from "./RestEndpointMethodTypes";
  export * from "./RestEndpointMethods";
  export * from "./Routes";
  export * from "./openapi-types";
  export * from "./plugin";
  `;
  const formatted = await format(contents, { parser: "typescript" });
  writeFile(options.targetDir + "/index.ts", formatted);
}

async function genPlugin(options: GeneratorOptions) {
  const contents = `
  import { endpointToMethods, type Doyokit } from "@doyokit/core";
  import type { RestEndpointMethods } from "./RestEndpointMethods";
  import Routes from "./Routes";

  export default function restPlugin(doyokit: Doyokit): RestEndpointMethods {
    const methods = endpointToMethods<RestEndpointMethods>(doyokit, Routes);
    return {
      ...methods,
    };
  }
  `;

  const formatted = await format(contents, { parser: "typescript" });
  writeFile(options.targetDir + "/plugin.ts", formatted);
}

export async function genRestTypes(options: GeneratorOptions) {
  const ENDPOINTS = readJson(options.targets.jsonEndpoints);
  const ROUTES: any = getRoutes(ENDPOINTS);

  await genMethodTypes(options, ROUTES);
  await genMethods(options, ROUTES);
  await genPlugin(options);
  await genBarrel(options);
}
