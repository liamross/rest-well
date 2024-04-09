import type {Route, Schema} from "../schema";
import type {Prettify, PrettifyDeep, RouteMethod, UnknownObject} from "../utils";
import type {RouterFunction, RouterImplementation} from "./router";
import {errors, initErrors} from "../errors";
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
    if (existing) throw initErrors.init_duplicate_routes(existing.route, value.route);
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
        if (!childImplementation) throw initErrors.init_missing_route_implementation(key);
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
    if (existing) throw initErrors.init_overlapping_routes(existing.route, value.route);
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

// TODO: maybe do this in the collection step and save it in the implementation
// object so we don't have to do this every time.
function matchPathParams(path: string, params: string[]): {[key: string]: string} {
  const variableNames: string[] = [];
  for (const pathSegment of path.split("/")) {
    if (pathSegment.startsWith("{") && pathSegment.endsWith("}")) {
      variableNames.push(pathSegment.slice(1, -1));
    }
  }
  if (variableNames.length !== params.length) throw new Error("Invalid number of parameters");
  return Object.fromEntries(variableNames.map((name, i) => [name, params[i]!]));
}

export function getHandler(
  pathTree: _PathTree,
  path: string,
  method: RouteMethod,
): (_RouteAndImplementation & {params?: UnknownObject}) | undefined {
  const pathSegments = path.slice(1).split("/");
  const paramValues: string[] = [];

  let current = pathTree;
  for (const segment of pathSegments) {
    if (current[segment]) {
      current = current[segment]!;
      continue;
    }
    if (current[_pathParam]) {
      current = current[_pathParam]!;
      paramValues.push(segment);
      continue;
    }
    return undefined;
  }

  const routeAndImplementation = current[methodToSymbol[method]];
  if (!routeAndImplementation) return undefined;

  const stringParams = matchPathParams(routeAndImplementation.route.path, paramValues);
  if (!stringParams) return routeAndImplementation;

  const pathParams = routeAndImplementation.route.pathParams;
  if (!pathParams) throw new Error("Route has path params but no pathParams schema");

  const parsedParams = pathParams.safeParse(stringParams);
  if (!parsedParams.success) throw errors.invalid_path_params(parsedParams.error, routeAndImplementation.route.path);

  return {...routeAndImplementation, params: parsedParams.data};
}
