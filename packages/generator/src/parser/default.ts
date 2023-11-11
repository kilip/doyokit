import { camelCase } from "lodash";
import type { JsonParserParams } from "../types";

function generateScope(params: JsonParserParams) {
  let scope = params.url.replace(/\{.+\}/, "").replace("//", "/");
  scope = scope.replace(/^\//, "");
  scope = scope.replace(/\/$/, "");
  return scope;
}

function getParamsInPath(params: JsonParserParams) {
  const paramsInPath: string[] = [];
  params.parameters?.forEach((parameter) => {
    if (parameter.in == "path") {
      paramsInPath.push(parameter.name);
    }
  });

  return paramsInPath;
}

export function defaultJsonParser(params: JsonParserParams) {
  const numOperations = Object.keys(params.operations).length;
  const scope = generateScope(params);
  let id = params.method.toLowerCase();
  let testId = `${scope}/${id}`;
  const existing = params.endpoints.filter((val) => {
    return val.id == testId;
  });

  if (numOperations == 2 && params.hasGet && params.hasPost) {
    id = params.method === "GET" ? "search" : "create";
  } else if (existing.length > 0) {
    const paramsInPath = getParamsInPath(params);

    if (paramsInPath.length > 0) {
      id = `${id} by ${paramsInPath.join(" and ")}`;
      id = camelCase(id);
    }
  }
  params.id = `${scope}/${id}`;
}
