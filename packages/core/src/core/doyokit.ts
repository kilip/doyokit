import { request } from "@octokit/request";
import type { RequestParameters } from "@octokit/types";
import type { HookCollection } from "before-after-hook";
import { Collection } from "before-after-hook";

import { getUserAgent } from "universal-user-agent";
import type {
  Constructor,
  DoyokitOptions,
  DoyokitPlugin,
  Hooks,
  ReturnTypeOf,
  UnionToIntersection,
} from "./types";
import { VERSION } from "./version";

export class Doyokit {
  static VERSION = VERSION;
  static plugins: DoyokitPlugin[] = [];
  /**
   * Attach a plugin (or many) to your Octokit instance.
   *
   * @example
   * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
   */
  static plugin<
    S extends Constructor<any> & { plugins: any[] },
    T extends DoyokitPlugin[],
  >(this: S, ...newPlugins: T) {
    const currentPlugins = this.plugins;
    const NewOctokit = class extends this {
      static plugins = currentPlugins.concat(
        newPlugins.filter((plugin) => !currentPlugins.includes(plugin))
      );
    };

    return NewOctokit as typeof this &
      Constructor<UnionToIntersection<ReturnTypeOf<T>>>;
  }

  // assigned during constructor
  request: typeof request;

  log: {
    debug: (message: string, additionalInfo?: object) => any;
    info: (message: string, additionalInfo?: object) => any;
    warn: (message: string, additionalInfo?: object) => any;
    error: (message: string, additionalInfo?: object) => any;
    [key: string]: any;
  };

  hook: HookCollection<Hooks>;

  constructor(options: DoyokitOptions = {}) {
    const hook = new Collection<Hooks>();
    const requestDefaults: Required<RequestParameters> = {
      baseUrl: request.endpoint.DEFAULTS.baseUrl,
      headers: {},
      request: Object.assign({}, options.request, {
        // @ts-ignore internal usage only, no need to type
        hook: hook.bind(null, "request"),
      }),
      mediaType: {
        previews: [],
        format: "",
      },
    };
    // prepend default user agent with `options.userAgent` if set
    requestDefaults.headers["user-agent"] = [
      options.userAgent,
      `@doyokit.core/${VERSION} ${getUserAgent()}`,
    ]
      .filter(Boolean)
      .join(" ");

    if (options.baseUrl) {
      requestDefaults.baseUrl = options.baseUrl;
    }

    if (options.previews) {
      requestDefaults.mediaType.previews = options.previews;
    }

    if (options.timeZone) {
      requestDefaults.headers["time-zone"] = options.timeZone;
    }

    this.request = request.defaults(requestDefaults);
    this.log = Object.assign(
      {
        debug: () => {},
        info: () => {},
        warn: console.warn.bind(console),
        error: console.error.bind(console),
      },
      options.log
    );
    this.hook = hook;

    // apply plugins
    // https://stackoverflow.com/a/16345172
    const classConstructor = this.constructor as typeof Doyokit;
    classConstructor.plugins.forEach((plugin) => {
      Object.assign(this, plugin(this));
    });
  }
}
