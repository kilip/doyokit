import type { OperationObject, ParameterObject } from "openapi-typescript";

export type MethodType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type Operation = Omit<OperationObject, "parameters"> & {
  parameters: ParameterObject[];
};
export type JsonParserParams = {
  id: string;
  url: string;
  method: MethodType;
  operations: { [key: string]: Operation };
  parameters: ParameterObject[];
  /**
   * Endpoint description
   */
  description?: string;
  /**
   * Current JSON endpoints
   */
  endpoints: JsonEndpoint[];
  hasGet: boolean;
  hasPost: boolean;
  hasPut: boolean;
  hasPatch: boolean;
  hasDelete: boolean;
};

export interface JsonEndpoint {
  id: string;
  url: string;
  method: string;
  parameters: Operation["parameters"];
  description?: string;
  deprecated?: boolean;
}

export type JsonEndpointParser = (endpoint: JsonParserParams) => void;

export type Generator = (options: GeneratorOptions) => Promise<void>;

export interface GeneratorOptions {
  targetDir: string;
  tempDir: string;
  responseType: string;
  source: string;

  [option: string]: any;

  /**
   * OpenAPI json schema source file
   */

  targets: {
    openapiTypes: string;
    jsonEndpoints: string;
    endpoints: string;
    routes: string;
    restMethods: string;
    restMethodTypes: string;
  };

  jsonParser?: JsonEndpointParser;
}
