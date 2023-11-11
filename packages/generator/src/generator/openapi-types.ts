import { writeFile } from "@doyokit/utils";
import openapiTS from "openapi-typescript";
import type { GeneratorOptions } from "../types";

export async function genOpenApiTypes(options: GeneratorOptions) {
  const contents = await openapiTS(options.source);
  writeFile(options.targets.openapiTypes, contents);
}
