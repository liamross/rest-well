import type {Route, Schema} from "../schema";
import type {Prettify, PrettifyDeep, RouteMethod} from "../utils";
import type {RouterFunction, RouterImplementation} from "./router";
import {errors} from "../errors";
import {isRoute} from "../schema";

// Symbols to represent dynamic paths and methods.
export const _pathParam = Symbol("pathParam");
export const _get = Symbol("GET");
export const _post = Symbol("POST");
export const _delete = Symbol("DELETE");
export const _put = Symbol("PUT");
export const _patch = Symbol("PATCH");

// Translate a method string into its appropriate symbol.
const methodToSymbol = {
  GET: _get,
  POST: _post,
  DELETE: _delete,
  PUT: _put,
  PATCH: _patch,
} as const satisfies {[_ in RouteMethod]: symbol};

type MethodToSymbol<K extends keyof typeof methodToSymbol> = (typeof methodToSymbol)[K];
type MethodSymbol = (typeof methodToSymbol)[keyof typeof methodToSymbol];

type SplitPath<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? "" extends Head
    ? [...SplitPath<Rest>]
    : Head extends `{${string}}`
      ? [typeof _pathParam, ...SplitPath<Rest>]
      : [Head, ...SplitPath<Rest>]
  : P extends `{${string}}`
    ? [typeof _pathParam]
    : [P];

/** Turn a path string into an array of strings and pathParam symbols. */
function splitPath<P extends string>(path: P): SplitPath<P> {
  const segments = path.split("/").filter((s) => s !== "");
  return segments.map((s) => (s.startsWith("{") && s.endsWith("}") ? _pathParam : s)) as SplitPath<P>;
}

type PathSegments = (string | typeof _pathParam)[];

type SplitPathToObj<P extends PathSegments, Child> = P extends [
  infer K extends string | typeof _pathParam,
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
  [_ in MethodToSymbol<R["method"]>]: {route: R; fn: RouterFunction<R>};
};

// Flattened router input.

export type FlattenedRouter<T extends Schema | Route> = PrettifyDeep<
  T extends Schema
    ? UnionToIntersection<{[K in keyof T]: FlattenedRouter<T[K]>}[keyof T]>
    : T extends Route
      ? "" extends T["path"]
        ? RouteAndImplementation<T>
        : {[_ in T["path"]]: RouteAndImplementation<T>}
      : never
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _RouterFunction = (...args: any[]) => unknown;
type _RouteAndImplementation = {route: Route; fn: _RouterFunction};
type _FlattenedRouterLeaf = {
  [_get]?: _RouteAndImplementation;
  [_post]?: _RouteAndImplementation;
  [_delete]?: _RouteAndImplementation;
  [_put]?: _RouteAndImplementation;
  [_patch]?: _RouteAndImplementation;
};
type _FlattenedRouter = _FlattenedRouterLeaf & {[path: string]: _FlattenedRouterLeaf};

// Path tree.

export type PathTree<T extends _FlattenedRouter> = PrettifyDeep<
  UnionToIntersection<
    {[K in keyof T]: K extends string ? Prettify<SplitPathToObj<SplitPath<K>, T[K]>> : {[_ in K]: T[K]}}[keyof T]
  >
>;

type _PathTree = {
  [x: string]: _PathTree;
  [_pathParam]?: _PathTree;

  [_get]?: _RouteAndImplementation;
  [_post]?: _RouteAndImplementation;
  [_delete]?: _RouteAndImplementation;
  [_put]?: _RouteAndImplementation;
  [_patch]?: _RouteAndImplementation;
};

function mergeFlattenedRouterTrees(oldTree: _FlattenedRouter, newTree: _FlattenedRouter): void {
  const symbolKeys = Object.getOwnPropertySymbols(newTree) as MethodSymbol[];

  for (const symbolKey of symbolKeys) {
    const value = newTree[symbolKey]!;
    const existing = oldTree[symbolKey];
    if (existing) throw errors.init_duplicate_routes(existing.route, value.route);
    oldTree[symbolKey] = value;
  }

  const stringKeys = Object.getOwnPropertyNames(newTree);
  for (const stringKey of stringKeys) {
    if (oldTree[stringKey]) {
      mergeFlattenedRouterTrees(oldTree[stringKey]!, newTree[stringKey]!);
    } else {
      oldTree[stringKey] = newTree[stringKey]!;
    }
  }
}

export function flattenRouterTree<S extends Schema>(
  schema: S,
  implementation: RouterImplementation<S>,
): FlattenedRouter<S> {
  return flattenRouterTreeInner(schema, implementation) as FlattenedRouter<S>;
}

function flattenRouterTreeInner(
  schema: Schema | Route,
  implementation: RouterImplementation<Schema | Route>,
): _FlattenedRouter {
  if (isRoute(schema)) {
    const route = schema;
    const method = methodToSymbol[route.method];
    const fn = implementation as _RouterFunction;

    if (route.path === "") return {[method]: {route, fn}};
    return {[route.path]: {[method]: {route, fn}}};
  } else {
    const result: _FlattenedRouter = {};
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const schemaOrRoute = schema[key]!;
        const childImplementation = implementation[key as keyof typeof implementation];
        if (!childImplementation) throw errors.init_missing_route_implementation(key);
        mergeFlattenedRouterTrees(result, flattenRouterTreeInner(schemaOrRoute, childImplementation));
      }
    }
    return result;
  }
}

function getChildTreeFromPath(pathTree: _PathTree, path: string): _PathTree {
  if (path === "") return pathTree;
  const pathSegments = splitPath(path);

  let current = pathTree;
  for (const segment of pathSegments) {
    if (!current[segment]) current[segment] = {};
    current = current[segment]!;
  }

  return current;
}

function setMethodImplementations(oldTree: _PathTree, newTree: _FlattenedRouterLeaf): void {
  const keys = Object.getOwnPropertySymbols(newTree) as MethodSymbol[];

  for (const key of keys) {
    const value = newTree[key]!;
    const existing = oldTree[key];
    if (existing) throw errors.init_overlapping_routes(existing.route, value.route);
    oldTree[key] = value;
  }
}

export function buildPathTree<F extends _FlattenedRouter>(input: F): PathTree<F> {
  return buildPathTreeInner(input) as PathTree<F>;
}

function buildPathTreeInner(input: _FlattenedRouter): _PathTree {
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
