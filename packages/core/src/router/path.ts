import type {FlushedSchema, Route, RouteProperties, Schema} from "../schema";
import type {Prettify, PrettifyDeep, RouteMethod} from "../utils";
import type {RouterFunction, RouterImplementation} from "./router";
import {isRoute} from "../schema";

// Symbols to represent dynamic paths and methods.
const pathParam = Symbol("pathParam");
const GET = Symbol("GET");
const POST = Symbol("POST");
const DELETE = Symbol("DELETE");
const PUT = Symbol("PUT");
const PATCH = Symbol("PATCH");

// Translate a method string into its appropriate symbol.
const methodToSymbol = {
  /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
  GET: GET as typeof GET,
  POST: POST as typeof POST,
  DELETE: DELETE as typeof DELETE,
  PUT: PUT as typeof PUT,
  PATCH: PATCH as typeof PATCH,
  /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
} satisfies {[_ in RouteMethod]: symbol};

type SplitPath<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? "" extends Head
    ? [...SplitPath<Rest>]
    : Head extends `{${string}}`
      ? [typeof pathParam, ...SplitPath<Rest>]
      : [Head, ...SplitPath<Rest>]
  : P extends `{${string}}`
    ? [typeof pathParam]
    : [P];

/** Turn a path string into an array of strings and pathParam symbols. */
function splitPath<P extends string>(path: P): SplitPath<P> {
  const segments = path.split("/").filter((s) => s !== "");
  return segments.map((s) => (s.startsWith("{") && s.endsWith("}") ? pathParam : s)) as SplitPath<P>;
}

type PathSegments = (string | typeof pathParam)[];

type SplitPathToObj<P extends PathSegments, Child> = P extends [
  infer K extends string | typeof pathParam,
  ...infer Rest extends PathSegments,
]
  ? {[_ in K]: Rest extends [] ? Child : SplitPathToObj<Rest, Child>}
  : Child;

// function splitPathToObj<P extends PathSegments, Child>(path: P, child: Child): SplitPathToObj<P, Child> {
//   if (path.length === 0) return child as SplitPathToObj<P, Child>;
//   const [head, ...rest] = path;
//   return {[head!]: splitPathToObj(rest, child)} as SplitPathToObj<P, Child>;
// }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type RouteAndImplementation<R extends Route> = {
  [_ in (typeof methodToSymbol)[R["method"]]]: {route: R; fn: RouterFunction<R>};
};

// Flattened router input.

export type FlattenedRouterInput<T extends Schema | Route> = PrettifyDeep<
  T extends Schema
    ? UnionToIntersection<{[K in keyof T]: FlattenedRouterInput<T[K]>}[keyof T]>
    : T extends Route
      ? "" extends T["path"]
        ? RouteAndImplementation<T>
        : {[_ in T["path"]]: RouteAndImplementation<T>}
      : never
>;

type _RouterFunction = (...args: unknown[]) => unknown;
type _RouteAndImplementation = {route: Route; fn: _RouterFunction};
type _FlattenedRouterLeaf = {
  [GET]?: _RouteAndImplementation;
  [POST]?: _RouteAndImplementation;
  [DELETE]?: _RouteAndImplementation;
  [PUT]?: _RouteAndImplementation;
  [PATCH]?: _RouteAndImplementation;
};
type _FlattenedRouterInput = _FlattenedRouterLeaf & {[path: string]: _FlattenedRouterLeaf};

// Path tree.

export type PathTree<R extends Schema | Route> =
  R extends FlushedSchema<infer Res, infer BP, infer _BPP, infer _SR, infer _SH>
    ? SplitPathToObj<SplitPath<BP>, Prettify<UnionToIntersection<PathTree<Res[keyof Res]>>>>
    : R extends RouteProperties<infer P, infer _PP, infer M, infer _R, infer _CT, infer _B, infer _Q, infer _H>
      ? "" extends P
        ? {[_ in (typeof methodToSymbol)[M]]: RouterFunction<R & Route>}
        : SplitPathToObj<SplitPath<P>, {[_ in (typeof methodToSymbol)[M]]: RouterFunction<R & Route>}>
      : never;

type _PathTree = {
  [x: string]: _PathTree;
  [pathParam]?: _PathTree;

  [GET]?: _RouteAndImplementation;
  [POST]?: _RouteAndImplementation;
  [DELETE]?: _RouteAndImplementation;
  [PUT]?: _RouteAndImplementation;
  [PATCH]?: _RouteAndImplementation;
};

export function flattenRouterTree<S extends Schema>(
  schema: S,
  implementation: RouterImplementation<S>,
): FlattenedRouterInput<S> {
  return flattenRouterTreeInner(schema, implementation) as FlattenedRouterInput<S>;
}

function flattenRouterTreeInner(
  schema: Schema | Route,
  implementation: RouterImplementation<Schema | Route>,
): _FlattenedRouterInput {
  let result = {} as _FlattenedRouterInput;

  if (isRoute(schema)) {
    if (schema.path === "") {
      const method = methodToSymbol[schema.method];
      result[method] = {route: schema, fn: implementation as _RouterFunction};
    } else {
      if (!result[schema.path]) result[schema.path] = {};
      if (result[schema.path]![methodToSymbol[schema.method]]) {
        throw new Error(`Fatal: Duplicate route: ${schema.path} ${schema.method}`);
      }
      result[schema.path]![methodToSymbol[schema.method]] = {
        route: schema,
        fn: implementation as _RouterFunction,
      };
    }
  } else {
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const schemaOrRoute = schema[key]!;
        const childImplementation = implementation[key as keyof typeof implementation];
        if (!childImplementation) throw new Error(`Fatal: No implementation found for route: ${key}`);
        result = {...result, ...flattenRouterTreeInner(schemaOrRoute, childImplementation)};
      }
    }
  }

  return result;
}

function getChildTreeFromPath(pathTree: _PathTree, path: string): _PathTree {
  if (path !== "") return pathTree;
  const pathSegments = splitPath(path);

  let current = pathTree;
  for (const segment of pathSegments) {
    if (!current[segment]) current[segment] = {};
    current = current[segment]!;
  }

  return current;
}

function setMethodImplementations(oldTree: _PathTree, newTree: _FlattenedRouterLeaf): void {
  const keys = Object.getOwnPropertySymbols(newTree) as (typeof methodToSymbol)[keyof typeof methodToSymbol][];

  for (const key of keys) {
    const value = newTree[key]!;
    if (oldTree[key]) throw new Error(`Fatal: Duplicate route: ${value.route.path} ${value.route.method}`);
    oldTree[key] = value;
  }
}

export function buildPathTree<S extends Schema>(input: FlattenedRouterInput<S>): PathTree<S> {
  return buildPathTreeInner(input) as PathTree<S>;
}

function buildPathTreeInner(input: _FlattenedRouterInput): _PathTree {
  const pathTree = {} as _PathTree;

  // This will implement all symbols aka method implementations.
  setMethodImplementations(pathTree, input);

  // All paths are flattened and contain methods.
  const paths = Object.keys(input);
  for (const path of paths) {
    const childTree = getChildTreeFromPath(pathTree, path);
    const implementations = input[path]!;
    setMethodImplementations(childTree, implementations);
  }

  return pathTree;
}

//

//

//

type PathWithParams = {path: string; params: {[key: string]: string}};

/**
 * Match the url to a template path and extract the parameters.
 *
 * @example
 * getPathWithParams("/users/1", ["/users/{id}"]); // {path: "/users/{id}", params: {id: "1"}}
 */
export function getPathWithParams(pathname: string, paths: string[]): PathWithParams | null {
  let match: (PathWithParams & {pathParts: string[]}) | null = null;

  const urlParts = pathname.split("/");

  pathLoop: for (const path of paths) {
    const pathParts = path.split("/");

    // Ensure pathParts is same length as urlParts so we can do non-null assertions.
    if (pathParts.length !== urlParts.length) continue;

    const params: {[key: string]: string} = {};

    for (let i = 0; i < pathParts.length; i++) {
      const pathPart = pathParts[i]!;
      const urlPart = urlParts[i]!;
      const matchPart = match && match.pathParts[i]!;

      if (pathPart === urlPart) {
        // If current match is less specific, we can clear it.
        if (matchPart && isVariable(matchPart)) match = null;
        continue;
      } else if (isVariable(pathPart)) {
        // If current match is more specific, we can skip this path.
        if (matchPart && !isVariable(matchPart)) continue pathLoop;
        params[pathPart.slice(1, -1)] = urlPart;
        continue;
      }

      // If no match but also not a variable, we can skip this path.
      continue pathLoop;
    }

    // If we still have a match by this point, then there are two routes with
    // the same level of specificity and that is an error.
    if (match) throw new Error(`You have two routes that match the same URL: '${match.path}' and '${path}'`);
    match = {path, params, pathParts};
  }

  return match && {path: match.path, params: match.params};
}

function isVariable(pathPart: string) {
  return pathPart.startsWith("{") && pathPart.endsWith("}");
}
