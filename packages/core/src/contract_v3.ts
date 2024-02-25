import type z from "zod";

type Path = string;

type QueryMethod = "GET";
type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";
type Method = QueryMethod | MutationMethod;

type ContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";

type PathParamValue = string | number | boolean | Date;

type _PathParamsObj<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? {} : Param)
        | keyof (_PathParamsObj<Rest> extends infer O extends {[key: string]: PathParamValue}
            ? O
            : {})]: PathParamValue;
    }
  : undefined;

type PathParams<S extends Path> =
  _PathParamsObj<S> extends infer O extends {[key: string]: PathParamValue} ? z.ZodType<O> : undefined;

type ResponseObject = {[key: number]: z.ZodSchema}; // TODO: maybe ensure this is something specific.
type ObjectSchema = z.ZodType<unknown>; // TODO: maybe ensure this turns into object.

type PathParamsRemoved<P extends Path, PP extends PathParams<P>> = PP extends undefined
  ? {}
  : {pathParams: NonNullable<PP>};
type PathParamsUndefined<P extends Path, PP extends PathParams<P>> = PP extends undefined
  ? {pathParams?: undefined}
  : {pathParams: NonNullable<PP>};

type BodyContentRemoved<M extends Method, B extends ObjectSchema, CT extends ContentType> = M extends MutationMethod
  ? {body?: B; contentType?: CT}
  : {};
type BodyContentUndefined<M extends Method, B extends ObjectSchema, CT extends ContentType> = M extends MutationMethod
  ? {body?: B; contentType?: CT}
  : {body?: undefined; contentType?: undefined};

/** All other route values including responses  */
type RouteValues<R extends ResponseObject, Q extends ObjectSchema, H extends ObjectSchema> = {
  responses: R;
  query?: Q;
  headers?: H;
  summary?: string;
  description?: string;
  deprecated?: true;
};

type RouteMethodFactoryInput<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends ObjectSchema,
  CT extends ContentType,
  R extends ResponseObject,
  Q extends ObjectSchema,
  H extends ObjectSchema,
> = RouteValues<R, Q, H> & PathParamsRemoved<P, PP> & BodyContentRemoved<M, B, CT>;

type _RouteMethodFactoryInputInner<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends ObjectSchema,
  CT extends ContentType,
  R extends ResponseObject,
  Q extends ObjectSchema,
  H extends ObjectSchema,
> = RouteValues<R, Q, H> & PathParamsUndefined<P, PP> & BodyContentUndefined<M, B, CT>;

type RouteProperties<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends ObjectSchema,
  CT extends ContentType,
  R extends ResponseObject,
  Q extends ObjectSchema,
  H extends ObjectSchema,
> = {method: M; path: P} & _RouteMethodFactoryInputInner<P, PP, M, B, CT, R, Q, H>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Route = {method: Method; path: Path} & RouteValues<ResponseObject, ObjectSchema, ObjectSchema>;

function routeMethodFactory<M extends Method, BP extends Path>(
  method: M,
  basePath: BP,
): {
  <
    B extends z.ZodType<unknown>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
  >(
    routeObj: RouteMethodFactoryInput<BP, PathParams<BP>, M, B, CT, R, Q, H>,
  ): RouteProperties<BP, PathParams<BP>, M, B, CT, R, Q, H>;
  <
    B extends z.ZodType<unknown>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
    P extends Path,
    PP extends PathParams<`${BP}${P}`>,
  >(
    path: P,
    routeObj: RouteMethodFactoryInput<`${BP}${P}`, PP, M, B, CT, R, Q, H>,
  ): RouteProperties<`${BP}${P}`, PP, M, B, CT, R, Q, H>;
};

function routeMethodFactory<M extends Method, BP extends Path>(method: M, basePath: BP) {
  return <
    B extends z.ZodType<unknown>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
    P extends Path,
    PP extends PathParams<`${BP}${P}`>,
  >(
    path: P | RouteMethodFactoryInput<BP, PathParams<BP>, M, B, CT, R, Q, H>,
    routeObj?: RouteMethodFactoryInput<`${BP}${P}`, PP, M, B, CT, R, Q, H>,
  ) => {
    if (typeof path === "string") {
      const route: _RouteMethodFactoryInputInner<`${BP}${P}`, PP, M, B, CT, R, Q, H> | undefined = routeObj;
      if (route === undefined) throw new Error("Second argument must be route object.");
      return {...route, path: `${basePath}${path}`, method};
    }
    const route: _RouteMethodFactoryInputInner<BP, PathParams<BP>, M, B, CT, R, Q, H> = path;
    return {...route, path: basePath, method};
  };
}

type AppRouterEmpty = {[key: string]: Route};

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

export function resource<Router extends AppRouterEmpty, P extends Path>(
  path: P,
  router: (helpers: ResourceRouteHelpers<P>) => Router,
): Router;

export function resource<Router extends AppRouterEmpty>(router: (helpers: ResourceRouteHelpers<"">) => Router): Router;

export function resource<Router extends AppRouterEmpty, P extends Path>(
  pathOrRouter: P | ((helpers: ResourceRouteHelpers<"">) => Router),
  routerOrUndefined?: (helpers: ResourceRouteHelpers<P>) => Router,
): Router {
  if (typeof pathOrRouter === "string") {
    if (routerOrUndefined === undefined) throw new Error("Second argument must be a function.");
    return routerOrUndefined(makeResourceHelpers(pathOrRouter));
  }
  return pathOrRouter(makeResourceHelpers(""));
}

type RouteResponse<R extends Route> = {
  [k in keyof R["responses"]]: k extends number
    ? {
        headers?: Headers;
        status: k;
        body: z.infer<R["responses"][k]>;
      }
    : never;
}[keyof R["responses"]];
