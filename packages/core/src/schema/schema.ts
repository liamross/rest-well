import type {z} from "zod";
import type {
  CombineObjects,
  CombineStrings,
  CombineZodSchemas,
  MediaType,
  Method,
  NoEmptyObject,
  Path,
  PathParams,
  PathParamSchema,
  Prettify,
  RequestBody,
  RequestHeaders,
  RequestQuery,
  Responses,
  ResponseWithHeaders,
  RestrictPath,
} from "../utils";
import type {Route, RouteProperties} from "./route";
import {combineObjects, combineStrings, combineZodSchemas} from "../utils";

/** Shared schema properties. */
type _SchemaShared<SR extends Responses | undefined = undefined, SH extends RequestHeaders | undefined = undefined> = {
  sharedResponses?: SR;
  sharedHeaders?: SH;
};

/** Properties passed into a schema builder. */
type SchemaCreateProperties<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParamSchema<BP>,
  SR extends Responses | undefined,
  SH extends RequestHeaders | undefined,
> = {routes: Res} & (BPP extends undefined ? {} : {pathParams: NonNullable<BPP>}) & _SchemaShared<SR, SH>;

/** The properties defined for the schema. */
type SchemaProperties<
  BP extends Path,
  BPP extends PathParams | undefined,
  SR extends Responses | undefined,
  SH extends RequestHeaders | undefined,
> = {basePath: BP; pathParams: BPP} & _SchemaShared<SR, SH>;

/** Non-generic schema properties. For internal use. */
type _SchemaProperties = {
  basePath: string;
  pathParams?: PathParams;
  sharedResponses?: Responses;
  sharedHeaders?: RequestHeaders;
};

/** A non-generic basic schema object. This is usually for internal use only. */
export type Schema = {[key: string]: Route | Schema};

/** Result of combining schema properties with a route. */
type RoutePropertiesCombined<
  // Route.
  P extends Path,
  PP extends PathParams | undefined,
  M extends Method,
  R extends Responses,
  CT extends MediaType | undefined,
  B extends RequestBody | undefined,
  Q extends RequestQuery | undefined,
  H extends RequestHeaders | undefined,
  // Schema
  BP extends Path,
  BPP extends PathParams | undefined,
  SR extends Responses | undefined,
  SH extends RequestHeaders | undefined,
> = RouteProperties<
  CombineStrings<BP, P>,
  CombineZodSchemas<BPP, PP>,
  M,
  CombineObjects<SR, R>,
  CT,
  B,
  Q,
  CombineZodSchemas<SH, H>
>;

/** Combine schema properties with a route. */
function combineRouteWithSchema(route: Route, schemaProperties?: _SchemaProperties): Route {
  return {
    path: combineStrings(schemaProperties?.basePath, route.path),
    pathParams: combineZodSchemas(schemaProperties?.pathParams, route.pathParams),
    headers: combineZodSchemas(schemaProperties?.sharedHeaders, route.headers as RequestHeaders | undefined),
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

/** All routes combined with schema properties. */
export type FlushedSchema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParamSchema<BP>,
  SR extends Responses | undefined,
  SH extends RequestHeaders | undefined,
> = {
  [K in keyof Res]: Res[K] extends RouteProperties<
    infer P,
    infer PP,
    infer M,
    infer R,
    infer CT,
    infer B,
    infer Q,
    infer H
  >
    ? Prettify<RoutePropertiesCombined<P, PP, M, R, CT, B, Q, H, BP, BPP, SR, SH>>
    : Res[K] extends Schema
      ? FlushedSchema<Res[K], BP, BPP, SR, SH>
      : never;
};

/** Combine all routes with the properties passed to the schema. */
function flushSchema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParamSchema<BP>,
  SR extends Responses | undefined,
  SH extends RequestHeaders | undefined,
>(schema: Res, properties: SchemaProperties<BP, BPP, SR, SH>): FlushedSchema<Res, BP, BPP, SR, SH> {
  const flushed: Schema = {};
  for (const key in schema) {
    const value = schema[key]!;
    if (isRoute(value)) {
      flushed[key] = combineRouteWithSchema(value, properties);
    } else {
      flushed[key] = flushSchema(value, properties);
    }
  }
  return flushed as FlushedSchema<Res, BP, BPP, SR, SH>;
}

export function schema<
  Res extends Schema,
  SR extends Responses | undefined = undefined,
  SH extends RequestHeaders | undefined = undefined,
>(properties: SchemaCreateProperties<Res, "", undefined, SR, SH>): FlushedSchema<Res, "", undefined, SR, SH>;

export function schema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParamSchema<BP>,
  SR extends Responses | undefined = undefined,
  SH extends RequestHeaders | undefined = undefined,
>(
  basePath: RestrictPath<BP>,
  properties: SchemaCreateProperties<Res, BP, BPP, SR, SH>,
): FlushedSchema<Res, BP, BPP, SR, SH>;

export function schema<
  Res extends Schema,
  BP extends Path,
  BPP extends PathParamSchema<BP>,
  SR extends Responses | undefined = undefined,
  SH extends RequestHeaders | undefined = undefined,
>(
  pathOrProps: BP | SchemaCreateProperties<Res, BP, BPP, SR, SH>,
  propsIfPath?: SchemaCreateProperties<Res, BP, BPP, SR, SH>,
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
  BPP extends PathParamSchema<BP>,
  SR extends Responses | undefined,
  SH extends RequestHeaders | undefined,
>(basePath: BP, props: SchemaCreateProperties<Res, BP, BPP, SR, SH>): SchemaProperties<BP, BPP, SR, SH> {
  const route = props as typeof props & {pathParams: BPP};
  return {...route, basePath};
}

export type RouteResponseValue<R extends Route> = {
  [k in keyof R["responses"]]: {status: k} & (R["responses"][k] extends z.ZodType<infer T>
    ? T extends undefined | void
      ? {}
      : {body: T}
    : R["responses"][k] extends ResponseWithHeaders
      ? {
          body: z.infer<R["responses"][k]["body"]>;
          headers: z.infer<R["responses"][k]["headers"]>;
        }
      : {});
}[keyof R["responses"]];

export type RouteRequestValue<R extends Route> =
  R extends RouteProperties<infer _P, infer PP, infer _M, infer _R, infer _CT, infer B, infer Q, infer H>
    ? TrimRoutePropertyKey<PP, "params"> &
        TrimRoutePropertyKey<B, "body"> &
        TrimRoutePropertyKey<Q, "query"> &
        TrimRoutePropertyKey<H, "headers">
    : {};

type TrimRoutePropertyKey<T, K extends string> = T extends z.ZodTypeAny
  ? NoEmptyObject<z.infer<T>> extends never
    ? {}
    : {[KK in K]: z.infer<T>}
  : {};

/**
 * Used to determine whether an object is a route.
 * @param route Either a route or a schema.
 * @returns True if the object is a route.
 */
export function isRoute<T>(route: T | Route): route is Route {
  return (
    typeof route === "object" &&
    route !== null &&
    "method" in route &&
    typeof route.method === "string" &&
    "path" in route &&
    typeof route.path === "string"
  );
}
