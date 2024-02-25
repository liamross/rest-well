import type z from "zod";
import type {Prettify, UnwrapInternalUse} from "./type-utils";

type Path = string;

type QueryMethod = "GET";
type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";
type Method = QueryMethod | MutationMethod;

type ContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";

type PathParamValue = string | number | boolean | Date;

type PathParams<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? z.ZodType<{
      [k in
        | (Param extends `${string}/${string}` ? {} : Param)
        | keyof (PathParams<Rest> extends z.ZodType<infer O> ? O : undefined)]: PathParamValue;
    }>
  : undefined;

type ResponseSchema = z.ZodSchema; // TODO: maybe ensure this is something specific.
type ObjectSchema = z.ZodType<unknown>; // TODO: maybe ensure this turns into object.

/** Ensures that pathParams exists for all params defined in path string. */
type PathWithParams<P extends Path, PP extends PathParams<P>> = {path: P} & OptionalPathParams<PP>;

type OptionalPathParams<PP extends PathParams<Path>> = PP extends undefined ? {} : {pathParams: NonNullable<PP>};

/** Ensures that mutation methods contain additional properties. */
type MethodWithMutation<M extends Method, B extends ObjectSchema, CT extends ContentType> = {
  method: M;
} & OptionalBodyContentType<M, B, CT>;

type OptionalBodyContentType<
  M extends Method,
  B extends ObjectSchema,
  CT extends ContentType,
> = M extends MutationMethod ? {body?: B; contentType?: CT} : {};

/** All other route values including responses  */
type RouteValues<R extends {[key: number]: ResponseSchema}, Q extends ObjectSchema, H extends ObjectSchema> = {
  responses: R;
  query?: Q;
  headers?: H;
  summary?: string;
  description?: string;
  deprecated?: true;
};

type CollectedParentProperties<
  $P extends Path,
  $PP extends readonly z.ZodType<{[key: string]: PathParamValue}>[],
  $R extends {[key: number]: ResponseSchema},
  $H extends readonly ObjectSchema[],
> = {
  path: $P;
  pathParams: $PP;
  responses: $R;
  headers: $H;
};

export const rootCollectedParentProperties: CollectedParentProperties<"", [], {}, []> = {
  path: "",
  pathParams: [],
  responses: {},
  headers: [],
};

type ContractProperties<
  BP extends Path,
  BPP extends PathParams<BP>,
  SR extends {[key: number]: z.ZodSchema},
  SH extends z.ZodSchema,
> = {
  basePath?: BP;
  sharedResponses?: SR;
  sharedHeaders?: SH;
} & OptionalPathParams<BPP>;

type RouteProperties<
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends ObjectSchema,
  CT extends ContentType,
  R extends {[key: number]: ResponseSchema},
  Q extends ObjectSchema,
  H extends ObjectSchema,
> = RouteValues<R, Q, H> & PathWithParams<P, PP> & MethodWithMutation<M, B, CT>;

type RouteWithParentProperties<
  //
  // Flushed parent properties.
  $P extends Path,
  $PP extends readonly z.ZodType<{[key: string]: PathParamValue}>[],
  $R extends {[key: number]: ResponseSchema},
  $H extends readonly ObjectSchema[],
  //
  // Base route properties.
  P extends Path,
  PP extends PathParams<P>,
  M extends Method,
  B extends ObjectSchema,
  CT extends ContentType,
  R extends {[key: number]: ResponseSchema},
  Q extends ObjectSchema,
  H extends ObjectSchema,
> = {
  // Combined properties with parents.
  path: `${$P}${P}`;
  responses: Omit<$R, keyof R> & R;
  pathParams: PP extends undefined ? $PP : readonly [...$PP, PP];
  headers: H extends undefined ? $H : readonly [...$H, H];

  // Unchanged (only exist on the leafs).
  method: M;
  query: Q | undefined;
  summary: string | undefined;
  description: string | undefined;
  deprecated: true | undefined;

  body: B | undefined;
  contentType: CT | undefined;
};

function mergeStringsIfDefined<A extends string, B extends string | undefined>(
  a: A,
  b: B,
): B extends undefined ? A : `${A}${B}` {
  return (b === undefined ? a : `${a}${b}`) as B extends undefined ? A : `${A}${B}`;
}

function appendToArrayIfDefined<T, A extends readonly T[], B extends T>(
  a: A,
  b: B | undefined,
): B extends undefined ? A : [...A, B] {
  return (b === undefined ? a : [...a, b]) as B extends undefined ? A : [...A, B];
}

export function combineContractWithParentProperties<
  $P extends Path,
  $PP extends readonly z.ZodType<{[key: string]: PathParamValue}>[],
  $R extends {[key: number]: ResponseSchema},
  $H extends readonly ObjectSchema[],
>(parentProperties: CollectedParentProperties<$P, $PP, $R, $H>) {
  return <BP extends Path, BPP extends PathParams<BP>, SR extends {[key: number]: z.ZodSchema}, SH extends z.ZodSchema>(
    contractProperties: ContractProperties<BP, BPP, SR, SH>,
  ) => {
    type ReturnValue = CollectedParentProperties<
      BP extends undefined ? $P : `${$P}${BP}`,
      BPP extends undefined ? $PP : readonly [...$PP, BPP],
      SR extends undefined ? $R : Omit<$R, keyof SR> & SR,
      SH extends undefined ? $H : readonly [...$H, SH]
    >;

    const path: ReturnValue["path"] = mergeStringsIfDefined(parentProperties.path, contractProperties.basePath!); // HACK for types

    const responses: ReturnValue["responses"] = {
      ...parentProperties.responses,
      ...contractProperties.sharedResponses,
    } as ReturnValue["responses"];

    const pathParams = (
      "pathParams" in contractProperties
        ? [...parentProperties.pathParams, contractProperties.pathParams]
        : parentProperties.pathParams
    ) as ReturnValue["pathParams"];

    const headers: ReturnValue["headers"] = appendToArrayIfDefined(
      parentProperties.headers,
      contractProperties.sharedHeaders,
    );

    const returnValue: ReturnValue = {path, responses, pathParams, headers};
    return returnValue;
  };
}

export function combineRouteWithParentProperties<
  $P extends Path,
  $PP extends readonly z.ZodType<{[key: string]: PathParamValue}>[],
  $R extends {[key: number]: ResponseSchema},
  $H extends readonly ObjectSchema[],
>(parentProperties: CollectedParentProperties<$P, $PP, $R, $H>) {
  return <
    P extends Path,
    PP extends PathParams<P>,
    M extends Method,
    B extends ObjectSchema,
    CT extends ContentType,
    R extends {[key: number]: ResponseSchema},
    Q extends ObjectSchema,
    H extends ObjectSchema,
  >(
    routeProperties: RouteProperties<P, PP, M, B, CT, R, Q, H>,
  ) => {
    type ReturnValue = RouteWithParentProperties<$P, $PP, $R, $H, P, PP, M, B, CT, R, Q, H>;

    const path: ReturnValue["path"] = `${parentProperties.path}${routeProperties.path}`;
    const responses: ReturnValue["responses"] = {...parentProperties.responses, ...routeProperties.responses};

    const pathParams = (
      "pathParams" in routeProperties
        ? [...parentProperties.pathParams, routeProperties.pathParams]
        : parentProperties.pathParams
    ) as ReturnValue["pathParams"];

    const headers = (
      "headers" in routeProperties ? [...parentProperties.headers, routeProperties.headers] : parentProperties.headers
    ) as ReturnValue["headers"];

    const method: ReturnValue["method"] = routeProperties.method;
    const query: ReturnValue["query"] = routeProperties.query;
    const summary: ReturnValue["summary"] = routeProperties.summary;
    const description: ReturnValue["description"] = routeProperties.description;
    const deprecated: ReturnValue["deprecated"] = routeProperties.deprecated;
    const body: ReturnValue["body"] = "body" in routeProperties ? routeProperties.body : undefined;
    const contentType: ReturnValue["contentType"] =
      "contentType" in routeProperties ? routeProperties.contentType : undefined;

    const returnValue: ReturnValue = {
      path,
      responses,
      pathParams,
      headers,
      method,
      query,
      summary,
      description,
      deprecated,
      body,
      contentType,
    };
    return returnValue;
  };
}

function routeMethodFactory<M extends Method>(
  method: M,
): {
  <
    P extends Path,
    PP extends PathParams<P>,
    B extends z.ZodType<unknown>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
  >(
    routeObj: OptionalPathParams<PP> & OptionalBodyContentType<M, B, CT>,
  ): Route<M, P, PP, CT, R, Q, H, B>;
  <
    P extends Path,
    PP extends PathParams<P>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
    B extends z.ZodType<unknown>,
  >(
    path: P,
    routeObj: Omit<Route<M, P, PP, CT, R, Q, H, B>, "method" | "path">,
  ): Route<M, P, PP, CT, R, z.ZodType<unknown>, z.ZodType<unknown>, z.ZodType<unknown>>;
};

function routeMethodFactory<M extends Method>(method: M) {
  return <
    P extends Path,
    PP extends PathParams<P>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
    B extends z.ZodType<unknown>,
  >(
    path: P | Omit<Route<M, P, PP, CT, R, Q, H, B>, "method" | "path">,
    routeObj?: Omit<Route<M, P, PP, CT, R, Q, H, B>, "method" | "path">,
  ): Route<M, P, PP, CT, R, Q, H, B> => {
    if (typeof path === "string") {
      if (routeObj === undefined) throw new Error("Second argument must be route object.");
      return {...routeObj, path, method} as Route<M, P, PP, CT, R, Q, H, B>;
    }
    return {...path, path: "", method} as Route<M, P, PP, CT, R, Q, H, B>;
  };
}

const GET = routeMethodFactory("GET");
const POST = routeMethodFactory("POST");
const PUT = routeMethodFactory("PUT");
const PATCH = routeMethodFactory("PATCH");
const DELETE = routeMethodFactory("DELETE");

type AppRouterEmpty = {[key: string]: BaseRoute | BaseContract};

type ContractOptions<
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
> = {
  basePath?: P;
  sharedResponses?: R;
  sharedHeaders?: H;
} & OptionalPathParams<PP>;

const contractOptionsKey = `$$contract_options`;

type Contract<
  Router extends AppRouterEmpty,
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
> = Router & {
  [contractOptionsKey]: ContractOptions<P, PP, R, H> | undefined;
};

type BaseContract = Contract<AppRouterEmpty, Path, PathParams<Path>, {[key: number]: z.ZodSchema}, z.ZodSchema>;

function contract<
  Router extends AppRouterEmpty,
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
>(
  router: (helpers: {
    GET: typeof GET;
    POST: typeof POST;
    PUT: typeof PUT;
    PATCH: typeof PATCH;
    DELETE: typeof DELETE;
  }) => Router,
  options?: ContractOptions<P, PP, R, H>,
): Contract<Router, P, PP, R, H> {
  return {
    ...router({GET, POST, PUT, PATCH, DELETE}),
    [contractOptionsKey]: options,
  };
}

type RouteResponse<R extends BaseRoute> = {
  [k in keyof R["responses"]]: k extends number
    ? {
        headers?: Headers;
        status: k;
        body: z.infer<R["responses"][k]>;
      }
    : never;
}[keyof R["responses"]];

type CreateRoute<
  Router extends AppRouterEmpty,
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
> = (
  contract: Contract<Router, P, PP, R, H>,
  implementations: Prettify<
    UnwrapInternalUse<{
      [K in Exclude<keyof typeof contract, typeof contractOptionsKey>]: (typeof contract)[K] extends Contract<
        infer IRouter,
        infer IP,
        infer IPP,
        infer IR,
        infer IH
      >
        ? ReturnType<CreateRoute<IRouter, IP, IPP, IR, IH>>
        : (typeof contract)[K] extends BaseRoute
          ? () => Promise<RouteResponse<(typeof contract)[K]>>
          : never;
    }>
  >,
) => typeof implementations;

function createRouter<
  Router extends AppRouterEmpty,
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
>(
  contract: Parameters<CreateRoute<Router, P, PP, R, H>>[0],
  implementations: Parameters<CreateRoute<Router, P, PP, R, H>>[1],
): ReturnType<CreateRoute<Router, P, PP, R, H>> {
  return implementations;
}
