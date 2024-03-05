import type {
  MutationMethod,
  Path,
  PathParams,
  RestrictPath,
  RouteBody,
  RouteContentType,
  RouteHeaders,
  RouteMethod,
  RoutePathParams,
  RouteQuery,
  RouteResponses,
} from "./shared";

type _RouteShared<R extends RouteResponses, Q extends RouteQuery | undefined, H extends RouteHeaders | undefined> = {
  responses: R;
  query?: Q;
  headers?: H;
  summary?: string;
  description?: string;
  deprecated?: true;
};

type RouteCreateProperties<
  P extends Path,
  PP extends PathParams<P>,
  M extends RouteMethod,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery | undefined,
  H extends RouteHeaders | undefined,
> = _RouteShared<R, Q, H> &
  (PP extends undefined ? {} : {pathParams: NonNullable<PP>}) &
  (M extends MutationMethod ? {body?: B; contentType?: CT} : {});

/**
 * These are the generic properties that are inside a route object.
 */
export type RouteProperties<
  P extends Path,
  PP extends RoutePathParams | undefined,
  M extends RouteMethod,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery | undefined,
  H extends RouteHeaders | undefined,
> = {method: M; path: P} & _RouteShared<R, Q, H> & {pathParams: PP} & {body?: B; contentType?: CT};

function routeMethodFactory<M extends RouteMethod>(
  method: M,
): {
  <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery | undefined = undefined,
    H extends RouteHeaders | undefined = undefined,
  >(
    routeObj: RouteCreateProperties<"", undefined, M, B, CT, R, Q, H>,
  ): RouteProperties<"", undefined, M, B, CT, R, Q, H>;
  <
    P extends Path,
    PP extends PathParams<P>,
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery | undefined = undefined,
    H extends RouteHeaders | undefined = undefined,
  >(
    path: RestrictPath<P>,
    properties: RouteCreateProperties<P, PP, M, B, CT, R, Q, H>,
  ): RouteProperties<P, PP, M, B, CT, R, Q, H>;
};

function routeMethodFactory<M extends RouteMethod>(method: M) {
  return <
    P extends Path,
    PP extends PathParams<P>,
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery | undefined = undefined,
    H extends RouteHeaders | undefined = undefined,
  >(
    path: RestrictPath<P> | RouteCreateProperties<"", undefined, M, B, CT, R, Q, H>,
    properties?: RouteCreateProperties<P, PP, M, B, CT, R, Q, H>,
  ): RouteProperties<P, PP, M, B, CT, R, Q, H> | RouteProperties<"", undefined, M, B, CT, R, Q, H> => {
    if (typeof path === "string") {
      if (properties === undefined) throw new Error("Second argument must be route object.");
      const route = properties as typeof properties & {pathParams: PP};
      return {...route, path: path as P, method};
    }
    const route = path as typeof path & {pathParams: PP};
    return {...route, path: "" as P, method};
  };
}

export type Route = {method: RouteMethod; [key: string]: unknown};

/** Retrieve data from the server. Usually used to read a target entity. */
export const GET: ReturnType<typeof routeMethodFactory<"GET">> = routeMethodFactory("GET");

/** Send data to the server. Usually used to create a new entity. */
export const POST: ReturnType<typeof routeMethodFactory<"POST">> = routeMethodFactory("POST");

/** Replace data on the server. Usually used to create or overwrite a target. */
export const PUT: ReturnType<typeof routeMethodFactory<"PUT">> = routeMethodFactory("PUT");

/** Update data on the server. Usually used to update a target entity. */
export const PATCH: ReturnType<typeof routeMethodFactory<"PATCH">> = routeMethodFactory("PATCH");

/** Remove data from the server. Usually used to delete a target entity. */
export const DELETE: ReturnType<typeof routeMethodFactory<"DELETE">> = routeMethodFactory("DELETE");
