import type {Route, Schema} from "../schema";
import type {Method, Prettify, PrettifyDeep, UnknownObject} from "../utils";
import type {RouterFunction, RouterImplementation} from "./router";
import {errors, initErrors} from "../errors";
import {isRoute} from "../schema";

/** Symbol representing a dynamic path segment. */
export const $$variable = Symbol("VARIABLE");
/** Symbol representing a GET method. */
export const $$get = Symbol("GET");
/** Symbol representing a POST method. */
export const $$post = Symbol("POST");
/** Symbol representing a DELETE method. */
export const $$delete = Symbol("DELETE");
/** Symbol representing a PUT method. */
export const $$put = Symbol("PUT");
/** Symbol representing a PATCH method. */
export const $$patch = Symbol("PATCH");

/** Map methods to their symbols. */
const methodToSymbolMap = {
  GET: $$get,
  POST: $$post,
  DELETE: $$delete,
  PUT: $$put,
  PATCH: $$patch,
} as const satisfies {[_ in Method]: symbol};

type MethodToSymbol<K extends keyof typeof methodToSymbolMap> = (typeof methodToSymbolMap)[K];
export type MethodSymbol = (typeof methodToSymbolMap)[keyof typeof methodToSymbolMap];

/**
 * Given a method, returns a unique symbol representing the method.
 * @param method The method of the route.
 * @returns The matching method symbol.
 */
export function methodToSymbol<M extends Method>(method: M): MethodToSymbol<M> {
  return methodToSymbolMap[method];
}

type SplitPath<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? "" extends Head
    ? [...SplitPath<Rest>]
    : Head extends `{${string}}`
      ? [typeof $$variable, ...SplitPath<Rest>]
      : [Head, ...SplitPath<Rest>]
  : P extends `{${string}}`
    ? [typeof $$variable]
    : [P];

/** Turn a path string into an array of strings and pathParam symbols. */
function splitPath<P extends string>(path: P): SplitPath<P> {
  const segments = path.split("/").filter((s) => s !== "");
  return segments.map((s) => (s.startsWith("{") && s.endsWith("}") ? $$variable : s)) as SplitPath<P>;
}

type PathSegments = (string | typeof $$variable)[];

type SplitPathToObj<P extends PathSegments, Child> = P extends [
  infer K extends string | typeof $$variable,
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

/** An intermediate flattened router representation. */
type FlattenedRouter<T extends Schema | Route> = PrettifyDeep<
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
  [$$get]?: _RouteAndImplementation;
  [$$post]?: _RouteAndImplementation;
  [$$delete]?: _RouteAndImplementation;
  [$$put]?: _RouteAndImplementation;
  [$$patch]?: _RouteAndImplementation;
};
type _FlattenedRouter = _FlattenedRouterLeaf & {[path: string]: _FlattenedRouterLeaf};

// Path tree.

/** The final path tree, which can be matched against a path. */
type PathTree<T extends _FlattenedRouter> = PrettifyDeep<
  UnionToIntersection<
    {[K in keyof T]: K extends string ? Prettify<SplitPathToObj<SplitPath<K>, T[K]>> : {[_ in K]: T[K]}}[keyof T]
  >
>;

type _PathTree = {
  [x: string]: _PathTree;
  [$$variable]?: _PathTree;

  [$$get]?: _RouteAndImplementation;
  [$$post]?: _RouteAndImplementation;
  [$$delete]?: _RouteAndImplementation;
  [$$put]?: _RouteAndImplementation;
  [$$patch]?: _RouteAndImplementation;
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

/**
 * A helper function to flatten a router tree. This occurs before the tree is
 * parsed into a complete path tree.
 * @param value The API schema or route.
 * @param implementation The implementation functions for the API schema.
 * @returns A flattened intermediate representation of the router.
 */
export function flattenRouterTree<S extends Schema | Route>(
  value: S,
  implementation: RouterImplementation<S>,
): FlattenedRouter<S> {
  return flattenRouterTreeInner(value, implementation) as FlattenedRouter<S>;
}

function flattenRouterTreeInner(
  value: Schema | Route,
  implementation: RouterImplementation<Schema | Route>,
): _FlattenedRouter {
  if (isRoute(value)) {
    const route = value;
    const method = methodToSymbol(route.method);
    const fn = implementation as _RouterFunction;

    if (route.path === "") return {[method]: {route, fn}};
    return {[route.path]: {[method]: {route, fn}}};
  } else {
    const result: _FlattenedRouter = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const schemaOrRoute = value[key]!;
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

/**
 * Build a full path tree from a flattened intermediate router object.
 * @param input The flattened intermediate router object.
 * @returns The full path tree.
 */
export function buildRouterTree<F extends _FlattenedRouter>(input: F): PathTree<F> {
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

/**
 * Get the route handler for a given path and method.
 * @param pathTree The path tree to search for the route handler.
 * @param path The pathname of the request.
 * @param method The method of the request.
 * @returns The route, implementation and params, or undefined if not found.
 */
export function getRouteHandler(
  pathTree: _PathTree,
  path: string,
  method: Method,
): (_RouteAndImplementation & {params?: UnknownObject}) | undefined {
  const pathSegments = path.slice(1).split("/");
  const paramValues: string[] = [];

  let current = pathTree;
  for (const segment of pathSegments) {
    if (current[segment]) {
      current = current[segment]!;
      continue;
    }
    if (current[$$variable]) {
      current = current[$$variable]!;
      paramValues.push(segment);
      continue;
    }
    return undefined;
  }

  const routeAndImplementation = current[methodToSymbol(method)];
  if (!routeAndImplementation) return undefined;

  const stringParams = matchPathParams(routeAndImplementation.route.path, paramValues);
  if (!stringParams) return routeAndImplementation;

  const pathParams = routeAndImplementation.route.pathParams;
  if (!pathParams) throw new Error("Route has path params but no pathParams schema");

  const parsedParams = pathParams.safeParse(stringParams);
  if (!parsedParams.success) throw errors.invalid_path_params(parsedParams.error, routeAndImplementation.route.path);

  return {...routeAndImplementation, params: parsedParams.data};
}

/**
 * A helper function to create a router tree from a schema and its
 * implementations. This creates a path tree that can be used to match
 * incoming requests to the correct route. This is generally for internal use
 * only, since it's used by library-specific routers.
 * @param schema The API schema to create a router tree from.
 * @param router The root level router, or complete implementation of the schema.
 * @returns A path tree generated from the schema and router.
 */
export function createRouter<T extends Schema | Route>(
  schema: T,
  router: RouterImplementation<T>,
): PathTree<FlattenedRouter<T>> {
  const flat = flattenRouterTree(schema, router);
  return buildRouterTree(flat);
}
