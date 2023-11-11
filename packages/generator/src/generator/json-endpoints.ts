import { readJson, writeFile } from "@doyokit/utils";
import { format } from "prettier";
import type {
  GeneratorOptions,
  JsonEndpoint,
  JsonParserParams,
  MethodType,
  Operation,
} from "../types";

type Paths = { [key: string]: { [key: string]: Operation } };

export async function genJsonEndpoints(options: GeneratorOptions) {
  const json = readJson(options.source);
  const paths: Paths = json.paths;
  const endpoints: JsonEndpoint[] = [];

  for (const [url, operations] of Object.entries(paths)) {
    delete operations["parameters"];
    for (const [method, operation] of Object.entries(operations)) {
      const params: JsonParserParams = {
        id: url,
        url,
        method: method.toUpperCase() as MethodType,
        endpoints,
        hasGet: operations["get"] !== undefined,
        hasPost: operations["post"] !== undefined,
        hasPut: operations["put"] !== undefined,
        hasPatch: operations["patch"] !== undefined,
        hasDelete: operations["delete"] !== undefined,
        operations,
        parameters: operation.parameters,
        description: operation.description,
      };

      options.jsonParser!(params);
      endpoints.push({
        id: params.id,
        url: params.url,
        method: params.method,
        parameters: params.parameters,
        description: params.description,
        deprecated: operation.deprecated,
      });
    }
  }

  const formatted = await format(JSON.stringify(endpoints), { parser: "json" });
  writeFile(options.targets.jsonEndpoints, formatted);
}
