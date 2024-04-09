import type {
  MediaType,
  Method,
  MutationMethod,
  Path,
  PathParams,
  PathParamSchema,
  Prettify,
  RequestBody,
  RequestHeaders,
  RequestQuery,
  Responses,
  RestrictPath,
} from "../utils";

/** Shared route properties. */
type _RouteShared<R extends Responses, Q extends RequestQuery | undefined, H extends RequestHeaders | undefined> = {
  responses: R;
  query?: Q;
  headers?: H;
  summary?: string;
  description?: string;
  deprecated?: true;
};

/** Properties passed into a route method builder to create a route. */
type RouteCreateProperties<
  P extends Path,
  PP extends PathParamSchema<P>,
  M extends Method,
  R extends Responses,
  CT extends MediaType | undefined,
  B extends RequestBody | undefined,
  Q extends RequestQuery | undefined,
  H extends RequestHeaders | undefined,
> = _RouteShared<R, Q, H> &
  (PP extends undefined ? {} : {pathParams: NonNullable<PP>}) &
  (M extends MutationMethod ? {body?: B; contentType?: CT} : {});

/** A strongly typed route object. This is usually for internal use only. */
export type RouteProperties<
  P extends Path,
  PP extends PathParams | undefined,
  M extends Method,
  R extends Responses,
  CT extends MediaType | undefined,
  B extends RequestBody | undefined,
  Q extends RequestQuery | undefined,
  H extends RequestHeaders | undefined,
> = {method: M; path: P; pathParams: PP; body?: B; contentType?: CT} & _RouteShared<R, Q, H>;

/** A non-generic basic route object. This is usually for internal use only. */
export type Route = {
  // We include all the required properties.
  method: Method;
  path: string;
  responses: Responses;
  pathParams?: PathParams; // Included for typing route parsing.
  // Including headers and query break types by including UnknownObject in the
  // union. We don't want that and could work to fix it later but for now this
  // is fine.
  [key: string]: unknown;
};

// Overload for routeMethodFactory to allow for a route object as the first argument.
function routeMethodFactory<M extends Method>(
  method: M,
): {
  // No path as first argument, so empty string for path.
  <
    R extends Responses,
    CT extends MediaType | undefined,
    B extends RequestBody | undefined,
    Q extends RequestQuery | undefined = undefined,
    H extends RequestHeaders | undefined = undefined,
  >(
    routeObj: RouteCreateProperties<"", undefined, M, R, CT, B, Q, H>,
  ): Prettify<RouteProperties<"", undefined, M, R, CT, B, Q, H>>;

  // Path as first argument, so we parse out path params as well.
  <
    P extends Path,
    PP extends PathParamSchema<P>,
    R extends Responses,
    CT extends MediaType | undefined,
    B extends RequestBody | undefined,
    Q extends RequestQuery | undefined = undefined,
    H extends RequestHeaders | undefined = undefined,
  >(
    path: RestrictPath<P>,
    properties: RouteCreateProperties<P, PP, M, R, CT, B, Q, H>,
  ): Prettify<RouteProperties<P, PP, M, R, CT, B, Q, H>>;
};

/** Internal factory to create route methods. */
function routeMethodFactory<M extends Method>(method: M) {
  return <
    P extends Path,
    PP extends PathParamSchema<P>,
    R extends Responses,
    CT extends MediaType | undefined = undefined,
    B extends RequestBody | undefined = undefined,
    Q extends RequestQuery | undefined = undefined,
    H extends RequestHeaders | undefined = undefined,
  >(
    path: RestrictPath<P> | RouteCreateProperties<"", undefined, M, R, CT, B, Q, H>,
    properties?: RouteCreateProperties<P, PP, M, R, CT, B, Q, H>,
  ): RouteProperties<P, PP, M, R, CT, B, Q, H> | RouteProperties<"", undefined, M, R, CT, B, Q, H> => {
    if (typeof path === "string") {
      if (properties === undefined) throw new Error("Second argument must be route object.");
      const route = properties as typeof properties & {pathParams: PP};
      return {...route, path: path as P, method};
    }
    const route = path as typeof path & {pathParams: PP};
    return {...route, path: "" as P, method};
  };
}

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
