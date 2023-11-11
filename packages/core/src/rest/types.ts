import type { RequestParameters, Route } from "@octokit/types";

export type EndpointDecorations = {
  mapToData?: string;
  deprecated?: string;
  renamed?: [string, string];
  renamedParameters?: {
    [name: string]: string;
  };
};

export type EndpointsDefaultsAndDeclaration = {
  [key: string]:
    | [Route, RequestParameters?, EndpointDecorations?]
    | EndpointsDefaultsAndDeclaration;
};
