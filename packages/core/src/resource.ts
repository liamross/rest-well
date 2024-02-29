import type z from "zod";
import type {RestrictPath} from "./path";
import type {AnySchema, ObjectSchema} from "./type-utils";

type Path = string;

type QueryMethod = "GET";
type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";

type Method = QueryMethod | MutationMethod;

type PathParamValue = string | number | boolean | Date;
type PathParamsInner = {[key: string]: PathParamValue};

export type RouteContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";
export type RoutePathParams = ObjectSchema<PathParamValue>;
export type RouteResponses = {[key: number]: AnySchema};
export type RouteBody = AnySchema;
export type RouteQuery = ObjectSchema;
export type RouteHeaders = ObjectSchema;

type _PathParamsInner<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? never : Param)
        // Allow any here since we don't care what the string is converted into by zod.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        | keyof (_PathParamsInner<Rest> extends infer O extends PathParamsInner ? O : {})]: any;
    }
  : undefined;

type PathParams<S extends Path> =
  _PathParamsInner<S> extends infer O extends PathParamsInner ? z.ZodType<O> : undefined;

type PathParamsRemoved<P extends Path, PP extends PathParams<P>> = PP extends undefined
  ? {}
  : {pathParams: NonNullable<PP>};

type PathParamsUndef<PP extends RoutePathParams | undefined> = {pathParams: PP};

type BodyContentRemoved<M extends Method, B extends RouteBody, CT extends RouteContentType> = M extends MutationMethod
  ? {body?: B; contentType?: CT}
  : {};

type BodyContentUndef<B extends RouteBody, CT extends RouteContentType> = {
  body?: B;
  contentType?: CT;
};

type RouteValues<R extends RouteResponses, Q extends RouteBody, H extends RouteHeaders> = {
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
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = RouteValues<R, Q, H> & PathParamsRemoved<P, PP> & BodyContentRemoved<M, B, CT>;

type _RouteCreateProperties<
  PP extends RoutePathParams | undefined,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = RouteValues<R, Q, H> & PathParamsUndef<PP> & BodyContentUndef<B, CT>;

export type RouteProperties<
  P extends Path,
  PP extends RoutePathParams | undefined,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = {method: M; path: P} & _RouteCreateProperties<PP, B, CT, R, Q, H>;

export type Route = {method: Method; path: Path} & RouteValues<RouteResponses, RouteQuery, RouteHeaders>;

type ResourceValues<R extends RouteResponses, H extends RouteHeaders> = {
  sharedResponses?: R;
  sharedHeaders?: H;
};

type ResourceCreateProperties<
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
> = {basePath?: RestrictPath<BP>} & PathParamsRemoved<BP, BPP> & ResourceValues<SR, SH>;

type _ResourceCreateProperties<
  BP extends Path,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses,
  SH extends RouteHeaders,
> = {basePath?: BP} & PathParamsUndef<BPP> & ResourceValues<SR, SH>;

type RoutePropertiesCombined<
  // Resource.
  BP extends Path | undefined,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
  // Route.
  _Route extends Route,
> =
  _Route extends RouteProperties<infer P, infer PP, infer M, infer B, infer CT, infer R, infer Q, infer H>
    ? RouteProperties<
        CombineStrings<BP, P>,
        CombineZodSchemas<BPP, PP>,
        M,
        B,
        CT,
        CombineObjects<SR, R>,
        Q,
        CombineZodSchemas<SH, H>
      >
    : never;

function combineRouteWithResource<
  // Resource.
  BP extends Path,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses,
  SH extends RouteHeaders,
  // Route.
  P extends Path,
  PP extends RoutePathParams | undefined,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
>(
  resourceProperties: _ResourceCreateProperties<BP, BPP, SR, SH> | undefined,
  route: RouteProperties<P, PP, M, B, CT, R, Q, H>,
): RoutePropertiesCombined<BP, BPP, SR, SH, typeof route> {
  return {
    path: combineStrings(resourceProperties?.basePath, route.path),
    pathParams: combineZodSchemas(resourceProperties?.pathParams, route.pathParams) as CombineZodSchemas<BPP, PP>,
    headers: combineZodSchemas(resourceProperties?.sharedHeaders, route.headers),
    responses: combineObjects(resourceProperties?.sharedResponses, route.responses),
    method: route.method,
    body: route.body,
    contentType: route.contentType,
    deprecated: route.deprecated,
    description: route.description,
    query: route.query,
    summary: route.summary,
  };
}

type CombineObjects<A extends object | undefined, B extends object> = Omit<A, keyof B> & B;

function combineObjects<A extends object, B extends object>(a: A | undefined, b: B): CombineObjects<A, B> {
  return {...a, ...b} as CombineObjects<A, B>;
}

type CombineStrings<A extends string | undefined, B extends string> = A extends undefined ? B : `${A}${B}`;

function combineStrings<A extends string, B extends string>(a: A | undefined, b: B): CombineStrings<A, B> {
  if (a === undefined) return b as CombineStrings<A, B>;
  return `${a}${b}` as CombineStrings<A, B>;
}

type CombineZodSchemas<A extends z.ZodType | undefined, B extends z.ZodType | undefined> = A extends z.ZodType
  ? B extends z.ZodType
    ? z.ZodIntersection<A, B>
    : A
  : B;

function combineZodSchemas<A extends z.ZodType, B extends z.ZodType>(
  a: A | undefined,
  b: B | undefined,
): CombineZodSchemas<A, B> {
  if (a === undefined) return b as CombineZodSchemas<A, B>;
  if (b === undefined) return a as CombineZodSchemas<A, B>;
  return a.and(b) as CombineZodSchemas<A, B>;
}

function routeMethodFactory<
  M extends Method,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
>(
  method: M,
  resourceProperties?: ResourceCreateProperties<BP, BPP, SR, SH>,
): {
  <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery,
    H extends RouteHeaders,
  >(
    routeObj: RouteCreateProperties<"", PathParams<"">, M, B, CT, R, Q, H>,
  ): RoutePropertiesCombined<BP, BPP, SR, SH, RouteProperties<"", undefined, M, B, CT, R, Q, H>>;
  <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery,
    H extends RouteHeaders,
    P extends Path,
    PP extends PathParams<P>,
  >(
    path: RestrictPath<P>,
    properties: RouteCreateProperties<P, PP, M, B, CT, R, Q, H>,
  ): RoutePropertiesCombined<BP, BPP, SR, SH, RouteProperties<P, PP, M, B, CT, R, Q, H>>;
};

function routeMethodFactory<
  M extends Method,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
>(method: M, _resourceProperties?: ResourceCreateProperties<BP, BPP, SR, SH>) {
  const resourceProperties = _resourceProperties as _ResourceCreateProperties<BP, BPP, SR, SH> | undefined;

  return <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery,
    H extends RouteHeaders,
    P extends Path,
    PP extends PathParams<P>,
  >(
    path: RestrictPath<P> | RouteCreateProperties<"", undefined, M, B, CT, R, Q, H>,
    properties?: RouteCreateProperties<P, PP, M, B, CT, R, Q, H>,
  ): RoutePropertiesCombined<BP, BPP, SR, SH, RouteProperties<P, PP, M, B, CT, R, Q, H>> => {
    if (typeof path === "string") {
      if (properties === undefined) throw new Error("Second argument must be route object.");
      const route: _RouteCreateProperties<PP, B, CT, R, Q, H> = properties as typeof properties & PathParamsUndef<PP>;
      const routeProps: RouteProperties<P, PP, M, B, CT, R, Q, H> = {...route, path: path as P, method};
      return combineRouteWithResource(resourceProperties, routeProps);
    }
    const route: _RouteCreateProperties<PP, B, CT, R, Q, H> = path as typeof path & PathParamsUndef<PP>;
    const routeProps: RouteProperties<P, PP, M, B, CT, R, Q, H> = {...route, path: "" as unknown as P, method};
    return combineRouteWithResource(resourceProperties, routeProps);
  };
}

type ResourceRouteHelpers<
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
> = {
  GET: ReturnType<typeof routeMethodFactory<"GET", BP, BPP, SR, SH>>;
  POST: ReturnType<typeof routeMethodFactory<"POST", BP, BPP, SR, SH>>;
  PUT: ReturnType<typeof routeMethodFactory<"PUT", BP, BPP, SR, SH>>;
  PATCH: ReturnType<typeof routeMethodFactory<"PATCH", BP, BPP, SR, SH>>;
  DELETE: ReturnType<typeof routeMethodFactory<"DELETE", BP, BPP, SR, SH>>;
};

export type Resource = {[key: string]: Route};

export function resource<
  R extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
>(
  router: (helpers: ResourceRouteHelpers<BP, BPP, SR, SH>) => R,
  properties?: ResourceCreateProperties<BP, BPP, SR, SH>,
): R {
  return router({
    GET: routeMethodFactory("GET", properties),
    POST: routeMethodFactory("POST", properties),
    PUT: routeMethodFactory("PUT", properties),
    PATCH: routeMethodFactory("PATCH", properties),
    DELETE: routeMethodFactory("DELETE", properties),
  });
}

export type RouteReturnValue<R extends Route> = {
  [k in keyof R["responses"]]: {status: k extends number ? k : never} & (R["responses"][k] extends z.ZodType<infer T>
    ? T extends undefined | void
      ? {}
      : {body: T}
    : {}) & {headers?: Headers};
}[keyof R["responses"]];
