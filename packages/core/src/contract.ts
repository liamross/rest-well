import type z from "zod";
import type {Prettify, UnwrapInternalUse} from "./type-utils";

export type Path = string;

type QueryMethod = "GET";
type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";
export type Method = QueryMethod | MutationMethod;

export type ContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";

type PathParamSchema = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodDate | z.ZodLiteral<string | number>;

export type PathParams<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? {} : Param)
        | keyof (PathParams<Rest> extends undefined ? {} : PathParams<Rest>)]: PathParamSchema;
    }
  : undefined;

type Route<
  M extends Method,
  P extends Path,
  PP extends PathParams<P>,
  CT extends ContentType,
  R extends {[key: number]: z.ZodSchema},
  Q extends z.ZodType<unknown>,
  H extends z.ZodType<unknown>,
  B extends z.ZodType<unknown>,
> = {
  method: M;
  path: P;
  query?: Q;
  headers?: H;
  summary?: string;
  description?: string;
  deprecated?: true;
} & {
  // HACK: new object to prevent bad type error if not included.
  responses: R;
} & OptionalPathParams<PP> &
  (M extends QueryMethod ? {} : {body?: B; contentType?: CT});

export type BaseRoute = Route<
  Method,
  Path,
  PathParams<Path>,
  ContentType,
  {[key: number]: z.ZodSchema},
  z.ZodType<unknown>,
  z.ZodType<unknown>,
  z.ZodType<unknown>
>;

function routeMethodFactory<M extends Method>(
  method: M,
): {
  <
    P extends Path,
    PP extends PathParams<P>,
    CT extends ContentType,
    R extends {[key: number]: z.ZodSchema},
    Q extends z.ZodType<unknown>,
    H extends z.ZodType<unknown>,
    B extends z.ZodType<unknown>,
  >(
    routeObj: Omit<Route<M, P, PP, CT, R, Q, H, B>, "method" | "path">,
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

export type ContractOptions<
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
> = {
  basePath?: P;
  sharedResponses?: R;
  sharedHeaders?: H;
} & OptionalPathParams<PP>;

export const contractOptionsKey = `$$contract_options`;

export type Contract<
  Router extends AppRouterEmpty,
  P extends Path,
  PP extends PathParams<P>,
  R extends {[key: number]: z.ZodSchema},
  H extends z.ZodSchema,
> = Router & {
  [contractOptionsKey]: ContractOptions<P, PP, R, H> | undefined;
};

export type BaseContract = Contract<AppRouterEmpty, Path, PathParams<Path>, {[key: number]: z.ZodSchema}, z.ZodSchema>;

export function contract<
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

type OptionalPathParams<PP extends PathParams<Path>> = PP extends undefined
  ? {}
  : {pathParams: z.ZodObject<NonNullable<PP>>};

export type RouteResponse<R extends BaseRoute> = {
  [k in keyof R["responses"]]: k extends number
    ? {
        headers?: Headers;
        status: k;
        body: z.infer<R["responses"][k]>;
      }
    : never;
}[keyof R["responses"]];

export type CreateRoute<
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

export function createRouter<
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
