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

type ResourceValues<R extends RouteResponses | undefined, H extends RouteHeaders | undefined> = {
  sharedResponses?: R;
  sharedHeaders?: H;
};

type ResourceCreateProperties<
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {basePath?: RestrictPath<BP>} & PathParamsRemoved<BP, BPP> & ResourceValues<SR, SH>;

type _ResourceCreateProperties<
  BP extends Path | undefined,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {basePath?: BP} & PathParamsUndef<BPP> & ResourceValues<SR, SH>;

type ResourceCreate = {
  basePath?: Path | undefined;
  pathParams?: RoutePathParams | undefined;
  sharedResponses?: RouteResponses | undefined;
  sharedHeaders?: RouteHeaders | undefined;
};
type _BP<Res extends ResourceCreate | undefined> =
  Res extends _ResourceCreateProperties<infer P, infer _PP, infer _R, infer _H> ? P : undefined;
type _BPP<Res extends ResourceCreate | undefined> =
  Res extends _ResourceCreateProperties<infer _P, infer PP, infer _R, infer _H> ? PP : undefined;
type _SR<Res extends ResourceCreate | undefined> =
  Res extends _ResourceCreateProperties<infer _P, infer _PP, infer R, infer _H> ? R : undefined;
type _SH<Res extends ResourceCreate | undefined> =
  Res extends _ResourceCreateProperties<infer _P, infer _PP, infer _R, infer H> ? H : undefined;

type RoutePropertiesCombined<
  Res extends ResourceCreate | undefined,
  // Route.
  P extends Path,
  PP extends RoutePathParams | undefined,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
> = RouteProperties<
  CombineStrings<_BP<Res>, P>,
  CombineZodSchemas<_BPP<Res>, PP>,
  M,
  B,
  CT,
  CombineObjects<_SR<Res>, R>,
  Q,
  CombineZodSchemas<_SH<Res>, H>
>;

function combineRouteWithResource<
  // Resource.
  Res extends ResourceCreate,
  // Route.
  P extends Path,
  PP extends RoutePathParams,
  M extends Method,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
>(
  route: RouteProperties<P, PP, M, B, CT, R, Q, H>,
  resourceProperties?: Res,
): RoutePropertiesCombined<Res, P, PP, M, B, CT, R, Q, H> {
  return {
    path: combineStrings(resourceProperties?.basePath, route.path),
    pathParams: combineZodSchemas(resourceProperties?.pathParams, route.pathParams),
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

type CombineStrings<A extends string | undefined, B extends string> = A extends string ? `${NonNullable<A>}${B}` : B;

function combineStrings<A extends string | undefined, B extends string>(a: A | undefined, b: B): CombineStrings<A, B> {
  if (a === undefined) return b as CombineStrings<A, B>;
  return `${a}${b}` as CombineStrings<A, B>;
}

type CombineObjects<A extends object | undefined, B extends object> = A extends object ? Omit<A, keyof B> & B : B;

function combineObjects<A extends object | undefined, B extends object>(a: A | undefined, b: B): CombineObjects<A, B> {
  if (a === undefined) return b as CombineObjects<A, B>;
  return {...a, ...b} as unknown as CombineObjects<A, B>;
}

type CombineZodSchemas<A extends z.ZodType | undefined, B extends z.ZodType | undefined> = A extends z.ZodType
  ? B extends z.ZodType
    ? z.ZodIntersection<A, B>
    : A
  : B;

function combineZodSchemas<A extends z.ZodType | undefined, B extends z.ZodType | undefined>(
  a: A | undefined,
  b: B | undefined,
): CombineZodSchemas<A, B> {
  if (a === undefined) return b as CombineZodSchemas<A, B>;
  if (b === undefined) return a as CombineZodSchemas<A, B>;
  return a.and(b) as CombineZodSchemas<A, B>;
}

function routeMethodFactory<M extends Method>(
  method: M,
): {
  <
    B extends RouteBody,
    CT extends RouteContentType,
    R extends RouteResponses,
    Q extends RouteQuery,
    H extends RouteHeaders,
  >(
    routeObj: RouteCreateProperties<"", undefined, M, B, CT, R, Q, H>,
  ): RouteProperties<"", undefined, M, B, CT, R, Q, H>;
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
  ): RouteProperties<P, PP, M, B, CT, R, Q, H>;
};

function routeMethodFactory<M extends Method>(method: M) {
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
  ): RouteProperties<P, PP, M, B, CT, R, Q, H> | RouteProperties<"", undefined, M, B, CT, R, Q, H> => {
    if (typeof path === "string") {
      if (properties === undefined) throw new Error("Second argument must be route object.");
      const route: _RouteCreateProperties<PP, B, CT, R, Q, H> = properties as typeof properties & PathParamsUndef<PP>;
      return {...route, path: path as P, method};
    }
    const route: _RouteCreateProperties<undefined, B, CT, R, Q, H> = path as typeof path & PathParamsUndef<undefined>;
    return {...route, path: "", method};
  };
}

export type Resource = {[key: string]: Route | Resource};

type FlushedResource<
  R extends Resource,
  BP extends Path | undefined,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {
  [K in keyof R]: R[K] extends RouteProperties<
    infer P,
    infer PP,
    infer M,
    infer B,
    infer CT,
    infer Res,
    infer Q,
    infer H
  >
    ? RoutePropertiesCombined<_ResourceCreateProperties<BP, BPP, SR, SH>, P, PP, M, B, CT, Res, Q, H>
    : R[K] extends Resource
      ? FlushedResource<R[K], BP, BPP, SR, SH>
      : never;
};

function flushResource<
  R extends Resource,
  BP extends Path,
  BPP extends RoutePathParams,
  SR extends RouteResponses,
  SH extends RouteHeaders,
>(
  resource: R,
  properties?: _ResourceCreateProperties<BP, BPP, SR, SH> | undefined,
): FlushedResource<R, BP, BPP, SR, SH> {
  const flushed: Resource = {};
  for (const key in resource) {
    const value = resource[key]!;
    // TODO: better check to see if it is a route!
    if ("method" in value) {
      // @ts-expect-error This is a hack to make the type system happy.
      flushed[key] = combineRouteWithResource(value as Route, properties);
    } else {
      flushed[key] = flushResource(value, properties);
    }
  }
  return flushed as FlushedResource<R, BP, BPP, SR, SH>;
}

export const GET = routeMethodFactory("GET");
export const POST = routeMethodFactory("POST");
export const PUT = routeMethodFactory("PUT");
export const PATCH = routeMethodFactory("PATCH");
export const DELETE = routeMethodFactory("DELETE");

export function resource<R extends Resource>(router: R): FlushedResource<R, undefined, undefined, undefined, undefined>;

export function resource<
  R extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
>(router: R, properties: ResourceCreateProperties<BP, BPP, SR, SH>): FlushedResource<R, BP, BPP, SR, SH>;

export function resource<
  R extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses,
  SH extends RouteHeaders,
>(router: R, properties?: ResourceCreateProperties<BP, BPP, SR, SH>): FlushedResource<R, BP, BPP, SR, SH> {
  const _properties = properties as _ResourceCreateProperties<BP, RoutePathParams, SR, SH> | undefined;
  return flushResource(router, _properties) as FlushedResource<R, BP, BPP, SR, SH>;
}

export type RouteReturnValue<R extends Route> = {
  [k in keyof R["responses"]]: {status: k} & (R["responses"][k] extends z.ZodType<infer T>
    ? T extends undefined | void
      ? {}
      : {body: T}
    : {}) & {headers?: Headers};
}[keyof R["responses"]];
