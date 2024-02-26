import type z from "zod";
import type {Status} from "./status";

type Path = string;

type QueryMethod = "GET";
type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";

type Method = QueryMethod | MutationMethod;

type PathParamValue = string | number | boolean | Date;

export type RouteContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";
export type RoutePathParams = {[key: string]: PathParamValue};
export type RouteResponses = {[key: number]: z.ZodSchema};
export type RouteBody = z.ZodType<unknown>;
export type RouteQuery = z.ZodType<unknown>;
export type RouteHeaders = z.ZodType<unknown>;

type _PathParamsInner<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? {} : Param)
        | keyof (_PathParamsInner<Rest> extends infer O extends RoutePathParams ? O : {})]: PathParamValue;
    }
  : undefined;

type PathParams<S extends Path> =
  _PathParamsInner<S> extends infer O extends RoutePathParams ? z.ZodType<O> : undefined;

type PathParamsRemoved<P extends Path, PP extends PathParams<P>> = PP extends undefined
  ? {}
  : {pathParams: NonNullable<PP>};

type PathParamsUndefined<P extends Path, PP extends PathParams<P>> = PP extends undefined
  ? {pathParams?: undefined}
  : {pathParams: NonNullable<PP>};

type BodyContentRemoved<M extends Method, B extends RouteBody, CT extends RouteContentType> = M extends MutationMethod
  ? {body?: B; contentType?: CT}
  : {};

type BodyContentUndefined<M extends Method, B extends RouteBody, CT extends RouteContentType> = M extends MutationMethod
  ? {body?: B; contentType?: CT}
  : {body?: undefined; contentType?: undefined};

type RouteValues<R extends RouteResponses, Q extends RouteBody, H extends RouteHeaders> = {
  responses: R;
  query?: Q;
  headers?: H;
  summary?: string;
  description?: string;
  deprecated?: true;
};

type RouteMethodFactoryProperties<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = RouteValues<R, Q, H> & PathParamsRemoved<P, PP> & BodyContentRemoved<M, B, CT>;

type _RouteMethodFactoryProperties<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = RouteValues<R, Q, H> & PathParamsUndefined<P, PP> & BodyContentUndefined<M, B, CT>;

export type RouteProperties<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = {method: M; path: P} & _RouteMethodFactoryProperties<P, PP, M, B, CT, R, Q, H>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Route = {method: Method; path: Path} & RouteValues<RouteResponses, RouteQuery, RouteHeaders>;

function routeMethodFactory<M extends Method, BP extends Path>(
  method: M,
  basePath: BP,
): {
  <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery,
    H extends RouteHeaders,
  >(
    routeObj: RouteMethodFactoryProperties<BP, PathParams<BP>, M, B, CT, R, Q, H>,
  ): RouteProperties<BP, PathParams<BP>, M, B, CT, R, Q, H>;
  <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery,
    H extends RouteHeaders,
    P extends Path,
    PP extends PathParams<`${BP}${P}`>,
  >(
    path: P,
    properties: RouteMethodFactoryProperties<`${BP}${P}`, PP, M, B, CT, R, Q, H>,
  ): RouteProperties<`${BP}${P}`, PP, M, B, CT, R, Q, H>;
};

function routeMethodFactory<M extends Method, BP extends Path>(method: M, basePath: BP) {
  return <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends RouteQuery,
    H extends RouteHeaders,
    P extends Path,
    PP extends PathParams<`${BP}${P}`>,
  >(
    path: P | RouteMethodFactoryProperties<BP, PathParams<BP>, M, B, CT, R, Q, H>,
    properties?: RouteMethodFactoryProperties<`${BP}${P}`, PP, M, B, CT, R, Q, H>,
  ) => {
    if (typeof path === "string") {
      const route: _RouteMethodFactoryProperties<`${BP}${P}`, PP, M, B, CT, R, Q, H> | undefined = properties;
      if (route === undefined) throw new Error("Second argument must be route object.");
      return {...route, path: `${basePath}${path}`, method};
    }
    const route: _RouteMethodFactoryProperties<BP, PathParams<BP>, M, B, CT, R, Q, H> = path;
    return {...route, path: basePath, method};
  };
}

type ResourceRouteHelpers<P extends Path> = {
  GET: ReturnType<typeof routeMethodFactory<"GET", P>>;
  POST: ReturnType<typeof routeMethodFactory<"POST", P>>;
  PUT: ReturnType<typeof routeMethodFactory<"PUT", P>>;
  PATCH: ReturnType<typeof routeMethodFactory<"PATCH", P>>;
  DELETE: ReturnType<typeof routeMethodFactory<"DELETE", P>>;
};

function makeResourceHelpers<P extends Path>(path: P): ResourceRouteHelpers<P> {
  return {
    GET: routeMethodFactory("GET", path),
    POST: routeMethodFactory("POST", path),
    PUT: routeMethodFactory("PUT", path),
    PATCH: routeMethodFactory("PATCH", path),
    DELETE: routeMethodFactory("DELETE", path),
  };
}

export type Resource = {[key: string]: Route};

export function resource<R extends Resource, P extends Path>(
  path: P,
  router: (helpers: ResourceRouteHelpers<P>) => R,
): R;

export function resource<R extends Resource>(router: (helpers: ResourceRouteHelpers<"">) => R): R;

export function resource<R extends Resource, P extends Path>(
  pathOrRouter: P | ((helpers: ResourceRouteHelpers<"">) => R),
  routerOrUndefined?: (helpers: ResourceRouteHelpers<P>) => R,
): R {
  if (typeof pathOrRouter === "string") {
    if (routerOrUndefined === undefined) throw new Error("Second argument must be a function.");
    return routerOrUndefined(makeResourceHelpers(pathOrRouter));
  }
  return pathOrRouter(makeResourceHelpers(""));
}
