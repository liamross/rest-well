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

type _SchemaShared<
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
> = {sharedResponses?: SR; sharedHeaders?: SH};

type SchemaOptionCreateProperties<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {routes: Res} & (BPP extends undefined ? {} : {pathParams: NonNullable<BPP>}) & _SchemaShared<SR, SH>;

type SchemaOptionProperties<
  BP extends Path,
  BPP extends RoutePathParams | undefined,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
> = {basePath: BP; pathParams: BPP} & _SchemaShared<SR, SH>;

export type Schema = {[key: string]: Route | Schema};

/**
 * Combine a route with a schema to create a new route with the combined
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
  // Schema
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

function combineRouteWithSchema<
  // Route.
  P extends Path,
  PP extends PathParams<P>,
  M extends RouteMethod,
  B extends RouteBody,
  CT extends RouteContentType,
  R extends RouteResponses,
  Q extends RouteQuery,
  H extends RouteHeaders,
  // Schema.
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(
  route: RouteProperties<P, PP, M, B, CT, R, Q, H>,
  schemaProperties?: SchemaOptionProperties<BP, BPP, SR, SH>,
): RoutePropertiesCombined<P, PP, M, B, CT, R, Q, H, BP, BPP, SR, SH> {
  return {
    path: combineStrings<BP, P>(schemaProperties?.basePath, route.path),
    pathParams: combineZodSchemas(schemaProperties?.pathParams, route.pathParams),
    headers: combineZodSchemas(schemaProperties?.sharedHeaders, route.headers),
    responses: combineObjects(schemaProperties?.sharedResponses, route.responses),
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

type FlushedSchema<
  Res extends Schema,
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
    : Res[K] extends Schema
      ? FlushedSchema<Res[K], BP, BPP, SR, SH>
      : never;
};

function isRoute(route: Route | Schema): route is Route {
  return "method" in route && typeof route.method === "string";
}

function flushSchema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
>(schema: Res, properties: SchemaOptionProperties<BP, BPP, SR, SH>): FlushedSchema<Res, BP, BPP, SR, SH> {
  const flushed: Schema = {};
  for (const key in schema) {
    const value = schema[key]!;
    if (isRoute(value)) {
      // Can't force this type using inference so we have to cast.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      flushed[key] = combineRouteWithSchema(value as any, properties) as unknown as Route;
    } else {
      flushed[key] = flushSchema(value, properties);
    }
  }
  return flushed as FlushedSchema<Res, BP, BPP, SR, SH>;
}

export function schema<
  Res extends Schema,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(properties: SchemaOptionCreateProperties<Res, "", undefined, SR, SH>): FlushedSchema<Res, "", undefined, SR, SH>;

export function schema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(
  basePath: RestrictPath<BP>,
  properties: SchemaOptionCreateProperties<Res, BP, BPP, SR, SH>,
): FlushedSchema<Res, BP, BPP, SR, SH>;

export function schema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined = undefined,
  SH extends RouteHeaders | undefined = undefined,
>(
  pathOrProps: BP | SchemaOptionCreateProperties<Res, BP, BPP, SR, SH>,
  propsIfPath?: SchemaOptionCreateProperties<Res, BP, BPP, SR, SH>,
): FlushedSchema<Res, BP, BPP, SR, SH> | FlushedSchema<Res, "", undefined, SR, SH> {
  if (typeof pathOrProps === "string") {
    if (!propsIfPath) throw new Error("Second argument must be a schema properties object.");
    return flushSchema(propsIfPath.routes, getSchemaProps(pathOrProps, propsIfPath));
  }
  return flushSchema(pathOrProps.routes, getSchemaProps("", pathOrProps));
}

function getSchemaProps<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends RouteResponses | undefined,
  SH extends RouteHeaders | undefined,
>(basePath: BP, props: SchemaOptionCreateProperties<Res, BP, BPP, SR, SH>): SchemaOptionProperties<BP, BPP, SR, SH> {
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

export type RouteImplementation<R extends Schema | Route> = R extends Route
  ? (req: Prettify<RouteRequestValue<R>>) => Promise<Prettify<RouteResponseValue<R>>>
  : R extends Schema
    ? {[K in keyof R]: RouteImplementation<R[K]>}
    : never;
