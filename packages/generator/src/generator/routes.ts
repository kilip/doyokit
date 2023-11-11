import { readJson, writeFile } from "@doyokit/utils";
import { format } from "prettier";
import sortKeys from "sort-keys";
import type { GeneratorOptions, JsonEndpoint } from "../types";

function parseEndpoint(routes: any, endpoint: JsonEndpoint, ns?: string) {
  ns = ns ?? endpoint.id;
  const split = ns.split("/");
  const current = split[0];

  if (!routes[current]) {
    routes[current] = {};
  }

  if (split.length > 1) {
    const next = split.slice(1).join("/");
    const nextRoutes = routes[current];
    parseEndpoint(nextRoutes, endpoint, next);
    return;
  }

  const route = `${endpoint.method} ${endpoint.url}`;

  routes[current] = [route];
}

export async function genRoutes(options: GeneratorOptions) {
  const ENDPOINTS: JsonEndpoint[] = readJson(options.targets.jsonEndpoints);
  const routes: any = {};

  ENDPOINTS.forEach((endpoint) => {
    // TODO: deprecated handle
    parseEndpoint(routes, endpoint);
  });

  const sorted = JSON.stringify(sortKeys(routes, { deep: true }));
  const contents = `
  import type { EndpointsDefaultsAndDeclaration } from '@doyokit/core';
  const Routes: EndpointsDefaultsAndDeclaration = ${sorted}
  export default Routes
  `;

  const formatted = await format(contents, { parser: "typescript" });
  writeFile(options.targets.routes, formatted);
}
