import os from "os";
import {
  genEndpoints,
  genJsonEndpoints,
  genOpenApiTypes,
  genRestTypes,
  genRoutes,
} from "./generator";
import { defaultJsonParser } from "./parser";
import type { GeneratorOptions } from "./types";

export function generateOptions(
  userOptions: Omit<GeneratorOptions, "targets" | "jsonParser">
): Required<GeneratorOptions> {
  const targetDir = userOptions.targetDir;
  const tempDir = userOptions.tempDir ?? os.tmpdir + "/doyokit";
  const source = userOptions.source;

  const options: Required<GeneratorOptions> = {
    targetDir,
    tempDir,
    source,
    responseType: "application/json",
    targets: {
      openapiTypes: targetDir + "/openapi-types.ts",
      jsonEndpoints: tempDir + "/Endpoints.json",
      endpoints: targetDir + "/Endpoints.ts",
      routes: targetDir + "/Routes.ts",
      restMethods: targetDir + "/RestEndpointMethods.ts",
      restMethodTypes: targetDir + "/RestEndpointMethodTypes.ts",
    },
    jsonParser: defaultJsonParser,
  };

  return options;
}

export async function start(options: GeneratorOptions) {
  await genOpenApiTypes(options);
  await genJsonEndpoints(options);
  await genEndpoints(options);
  await genRoutes(options);
  await genRestTypes(options);
}
