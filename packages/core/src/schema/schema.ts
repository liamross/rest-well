import type z from "zod";
import type {InferZod, Prettify} from "../type-utils";
import type {Route, RouteProperties} from "./route";
import type {
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

type _ResourceShared<
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
> = {
  sharedResponses?: SR;
  sharedHeaders?: SH;
};

type ResourceOptionCreateProperties<
  Res extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {routes: Res} & (BPP extends undefined ? {} : {pathParams: NonNullable<BPP>}) & _ResourceShared<SR, SH>;

type ResourceOptionProperties<
  BP extends Path,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {basePath: BP} & {pathParams: BPP} & _ResourceShared<SR, SH>;

export type Resource = {[key: string]: Route | Resource};

/**
 * Combine a route with a resource to create a new route with the combined
 * properties.
 */
type RoutePropertiesCombined<
  // Route.
  P extends Path,
  PP extends RoutePathParams | undefined,
  M extends RouteMethod,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery | undefined,
  H extends RouteHeaders | undefined,
  // Resource
  BP extends Path,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = RouteProperties<
  CombineStrings<BP, P>,
  CombineZodSchemas<BPP, PP>,
  M,
  B,
  CT,
  CombineObjects<SR, R>,
  Q,
  CombineZodSchemas<SH, H>
>;

function combineRouteWithResource<
  // Route.
  P extends Path,
  PP extends PathParams<P>,
  M extends RouteMethod,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
  // Resource.
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(
  route: RouteProperties<P, PP, M, B, CT, R, Q, H>,
  resourceProperties?: ResourceOptionProperties<BP, BPP, SR, SH>,
): RoutePropertiesCombined<P, PP, M, B, CT, R, Q, H, BP, BPP, SR, SH> {
  return {
    path: combineStrings<BP, P>(resourceProperties?.basePath, route.path),
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

type CombineStrings<A extends string | undefined, B extends string> = A extends string ? `${A}${B}` : B;
function combineStrings<A extends string | undefined, B extends string>(a: A | undefined, b: B): CombineStrings<A, B> {
  if (a !== undefined) return `${a}${b}` as CombineStrings<A, B>;
  return b as CombineStrings<A, B>;
}

type CombineObjects<A extends object | undefined, B extends object> = A extends object ? Omit<A, keyof B> & B : B;
function combineObjects<A extends object | undefined, B extends object>(a: A | undefined, b: B): CombineObjects<A, B> {
  if (a !== undefined) return {...a, ...b} as unknown as CombineObjects<A, B>;
  return b as CombineObjects<A, B>;
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

type FlushedResource<
  Res extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {
  [K in keyof Res]: Res[K] extends RouteProperties<
    infer P,
    infer PP,
    infer M,
    infer B,
    infer CT,
    infer R,
    infer Q,
    infer H
  >
    ? RoutePropertiesCombined<P, PP, M, B, CT, R, Q, H, BP, BPP, SR, SH>
    : Res[K] extends Resource
      ? FlushedResource<Res[K], BP, BPP, SR, SH>
      : never;
};

function isRoute(route: Route | Resource): route is Route {
  return "method" in route && typeof route.method === "string";
}

function flushResource<
  Res extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
>(resource: Res, properties: ResourceOptionProperties<BP, BPP, SR, SH>): FlushedResource<Res, BP, BPP, SR, SH> {
  const flushed: Resource = {};
  for (const key in resource) {
    const value = resource[key]!;
    if (isRoute(value)) {
      // Can't force this type using inference so we have to cast.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      flushed[key] = combineRouteWithResource(value as any, properties);
    } else {
      flushed[key] = flushResource(value, properties);
    }
  }
  return flushed as FlushedResource<Res, BP, BPP, SR, SH>;
}

export function resource<
  Res extends Resource,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(properties: ResourceOptionCreateProperties<Res, "", undefined, SR, SH>): FlushedResource<Res, "", undefined, SR, SH>;

export function resource<
  Res extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(
  basePath: RestrictPath<BP>,
  properties: ResourceOptionCreateProperties<Res, BP, BPP, SR, SH>,
): FlushedResource<Res, BP, BPP, SR, SH>;

export function resource<
  Res extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(
  pathOrProps: BP | ResourceOptionCreateProperties<Res, BP, BPP, SR, SH>,
  propsIfPath?: ResourceOptionCreateProperties<Res, BP, BPP, SR, SH>,
): FlushedResource<Res, BP, BPP, SR, SH> | FlushedResource<Res, "", undefined, SR, SH> {
  if (typeof pathOrProps === "string") {
    if (!propsIfPath) throw new Error("Second argument must be a resource properties object.");
    return flushResource(propsIfPath.routes, getResourceProps(pathOrProps, propsIfPath));
  }
  return flushResource(pathOrProps.routes, getResourceProps("", pathOrProps));
}

function getResourceProps<
  Res extends Resource,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
>(
  basePath: BP,
  props: ResourceOptionCreateProperties<Res, BP, BPP, SR, SH>,
): ResourceOptionProperties<BP, BPP, SR, SH> {
  const route = props as typeof props & {pathParams: BPP};
  return {...route, basePath};
}

type RouteRequestValue<R extends Route> =
  R extends RouteProperties<infer _P, infer PP, infer _M, infer B, infer _CT, infer _R, infer Q, infer H>
    ? (PP extends z.ZodType<infer O> ? {params: Prettify<O>} : {}) &
        (InferZod<B> extends undefined ? {} : {body: Prettify<z.infer<NonNullable<B>>>}) &
        (InferZod<Q> extends undefined ? {} : {query: Prettify<z.infer<NonNullable<Q>>>}) &
        (InferZod<H> extends undefined ? {} : {headers: Prettify<z.infer<NonNullable<H>>>})
    : never;

type RouteResponseValue<R extends Route> = {
  [k in keyof R["responses"]]: {status: k} & (R["responses"][k] extends z.ZodType<infer T>
    ? T extends undefined | void
      ? {}
      : {body: T}
    : {}) & {headers?: Headers};
}[keyof R["responses"]];

export type RouteImplementation<R extends Resource | Route> = R extends Resource
  ? {[K in keyof R]: RouteImplementation<R[K]>}
  : R extends Route
    ? (req: Prettify<RouteRequestValue<R>>) => Promise<Prettify<RouteResponseValue<R>>>
    : never;
