import { readFile, readJson, writeFile } from "@doyokit/utils";
import { existsSync } from "fs";
import handlebars from "handlebars";
import { format } from "prettier";
import sortKeys from "sort-keys";
import type { GeneratorOptions, JsonEndpoint } from "../types";

function toOpenApiUrl(endpoint: JsonEndpoint) {
  return (
    endpoint.url
      // stecial case for "Upload a release asset": remove ":origin" prefix
      .replace(/^\{origin\}/, "")
      // remove query parameters
      .replace(/\{?\?.*$/, "")
  );
}

export async function genEndpoints(options: GeneratorOptions) {
  const ENDPOINTS: JsonEndpoint[] = readJson(options.targets.jsonEndpoints);
  const endpointsByRoute: any = {};

  for (const endpoint of ENDPOINTS) {
    const route = `${endpoint.method} ${endpoint.url}`;
    endpointsByRoute[route] = {
      method: endpoint.method.toLowerCase(),
      url: toOpenApiUrl(endpoint),
      description: endpoint.description,
      deprecated: endpoint.deprecated,
    };
  }

  let templateFile = __dirname + "/templates/endpoints.ts.template";
  if (!existsSync(templateFile)) {
    templateFile =
      "node_modules/@doyokit/generator/templates/endpoints.ts.template";
  }

  const template = handlebars.compile(readFile(templateFile));

  const result = template({
    endpointsByRoute: sortKeys(endpointsByRoute, { deep: true }),
    responseType: options.responseType,
  });
  const formatted = await format(result, { parser: "typescript" });
  writeFile(options.targets.endpoints, formatted);
}
