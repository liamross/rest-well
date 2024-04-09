/* eslint-disable @typescript-eslint/require-await */
import {describe, expect, test} from "vitest";
import {z} from "zod";
import type {Route} from "../schema";
import type {Equal, Expect} from "../utils/test-helpers";
import {GET, POST, schema} from "../schema";
import {expectInitializationError, expectRestWellError} from "../utils/test-helpers";
import {$$variable, buildRouterTree, flattenRouterTree, getRouteHandler, methodToSymbol} from "./path";
import {router} from "./router";

describe("getRouteHandler", () => {
  const exampleSchema = schema("/api/{version}", {
    pathParams: z.object({
      version: z.literal("v1"),
    }),
    routes: {
      getUser: GET("/users/{id}", {
        pathParams: z.object({id: z.coerce.number()}),
        responses: {200: z.string()},
      }),
    },
  });
  const exampleImplementation = router(exampleSchema, {getUser: () => ({status: 200, body: "A user"})});
  const exampleFlattened = flattenRouterTree(exampleSchema, exampleImplementation);
  const exampleTree = buildRouterTree(exampleFlattened);

  test("can get a handler", () => {
    const handler = getRouteHandler(exampleTree, "/api/v1/users/1", "GET");
    expect(handler).toBeDefined();
    if (!handler) return;
    expect(handler.fn).toBe(exampleImplementation.getUser);
    expect(handler.route.path).toBe("/api/{version}/users/{id}");
    expect(handler.params).toEqual({version: "v1", id: 1});
  });

  test("returns undefined if no handler found", () => {
    const handler = getRouteHandler(exampleTree, "/api/v1/users/1", "POST");
    expect(handler).toBeUndefined();
  });

  test("fails if path params are invalid", () => {
    expectRestWellError("invalid_path_params", () => getRouteHandler(exampleTree, "/api/v2/users/1", "GET"));
  });
});

describe("Route parsing", () => {
  const exampleSchema = schema("/api/{version}", {
    pathParams: z.object({
      version: z.string(),
    }),
    routes: {
      getUser: GET("/users/{id}", {
        pathParams: z.object({id: z.string()}),
        responses: {200: z.string()},
      }),
    },
  });
  const getUserFn = router(exampleSchema.getUser, async () => ({status: 200, body: "A user"}));
  const exampleImplementation = router(exampleSchema, {getUser: getUserFn});
  const exampleFlattened = flattenRouterTree(exampleSchema, exampleImplementation);

  describe("flattenRouterTree", () => {
    test("can flatten a router tree", () => {
      const expectedKey = "/api/{version}/users/{id}";
      type _ = Expect<Equal<keyof typeof exampleFlattened, typeof expectedKey>>;
      const keys = Object.keys(exampleFlattened);
      expect(keys.length).toBe(1);
      expect(keys[0]).toBe(expectedKey);
      const child = exampleFlattened[keys[0] as keyof typeof exampleFlattened];
      const symbolKeys = Object.getOwnPropertySymbols(child);
      expect(symbolKeys.length).toBe(1);
      expect(symbolKeys[0]).toBe(methodToSymbol("GET"));
      const fnBlock = child[symbolKeys[0] as keyof typeof child];
      expect(fnBlock.fn).toBe(getUserFn);
    });

    test("handles root routes", () => {
      const rootSchema = schema({
        routes: {
          a: GET({responses: {200: z.string()}}),
          b: POST("/b", {responses: {200: z.string()}}),
        },
      });
      const rootRouter = router(rootSchema, {
        a: async () => ({status: 200, body: "a"}),
        b: async () => ({status: 200, body: "b"}),
      });
      const flat = flattenRouterTree(rootSchema, rootRouter);
      const tree = buildRouterTree(flat);
      const stringKeys = Object.keys(tree);
      const symbolKeys = Object.getOwnPropertySymbols(tree);
      expect(stringKeys.length).toBe(1);
      expect(symbolKeys.length).toBe(1);
      expect(stringKeys).toContain("b");
      expect(symbolKeys).toContain(methodToSymbol("GET"));
      expect(isRouteAndImplementation(tree[methodToSymbol("GET")])).toBe(true);
      expect(isRouteAndImplementation(tree.b[methodToSymbol("POST")])).toBe(true);
    });

    test("errors on duplicate route", () => {
      const duplicateSchema = schema({
        routes: {
          a: GET("/{a}", {pathParams: z.object({a: z.string()}), responses: {200: z.string()}}),
          b: GET("/{a}", {pathParams: z.object({a: z.string()}), responses: {200: z.string()}}),
        },
      });
      const duplicateRouter = router(duplicateSchema, {
        a: async () => ({status: 200, body: "a"}),
        b: async () => ({status: 200, body: "b"}),
      });
      expectInitializationError("init_duplicate_routes", () => flattenRouterTree(duplicateSchema, duplicateRouter));
    });

    test("no error if duplicate route has different method", () => {
      const duplicateSchema = schema({
        routes: {
          a: GET("/{a}", {pathParams: z.object({a: z.string()}), responses: {200: z.string()}}),
          b: POST("/{a}", {pathParams: z.object({a: z.string()}), responses: {200: z.string()}}),
        },
      });
      const duplicateRouter = router(duplicateSchema, {
        a: async () => ({status: 200, body: "a"}),
        b: async () => ({status: 200, body: "b"}),
      });
      const flat = flattenRouterTree(duplicateSchema, duplicateRouter);
      const keys = Object.keys(flat);
      expect(keys.length).toBe(1);
      const expectedKey = "/{a}";
      expect(keys[0]).toBe(expectedKey);
      type _ = Expect<Equal<keyof typeof flat, typeof expectedKey>>;
      const child = flat[keys[0] as typeof expectedKey];
      const symbolKeys = Object.getOwnPropertySymbols(child);
      expect(symbolKeys.length).toBe(2);
      expect(symbolKeys).toContain(methodToSymbol("GET"));
      expect(isRouteAndImplementation(child[methodToSymbol("GET")])).toBe(true);
      expect(symbolKeys).toContain(methodToSymbol("POST"));
      expect(isRouteAndImplementation(child[methodToSymbol("POST")])).toBe(true);
    });

    test("errors on missing implementations", () => {
      const exampleMissingImplementation = router(exampleSchema, {getUser: undefined!});
      expectInitializationError("init_missing_route_implementation", () =>
        flattenRouterTree(exampleSchema, exampleMissingImplementation),
      );
    });
  });

  describe("buildRouterTree", () => {
    test("can build a path tree", () => {
      const pathTree = buildRouterTree(exampleFlattened);
      const fnAndRoute = pathTree.api[$$variable].users[$$variable][methodToSymbol("GET")];
      expect(fnAndRoute.fn).toBe(getUserFn);
    });

    test("errors on overlapping route", () => {
      const overlappingSchema = schema({
        routes: {
          a: GET("/{a}", {pathParams: z.object({a: z.string()}), responses: {200: z.string()}}),
          b: GET("/{b}", {pathParams: z.object({b: z.string()}), responses: {200: z.string()}}),
        },
      });
      const overlappingRouter = router(overlappingSchema, {
        a: async () => ({status: 200, body: "a"}),
        b: async () => ({status: 200, body: "b"}),
      });
      // Not thrown since paths are not an exact match.
      const flat = flattenRouterTree(overlappingSchema, overlappingRouter);
      // However, they match once the variables are extracted.
      expectInitializationError("init_overlapping_routes", () => buildRouterTree(flat));
    });

    test("no error if overlapping route has different method", () => {
      const overlappingSchema = schema({
        routes: {
          a: GET("/{a}", {pathParams: z.object({a: z.string()}), responses: {200: z.string()}}),
          b: POST("/{b}", {pathParams: z.object({b: z.string()}), responses: {200: z.string()}}),
        },
      });
      const overlappingRouter = router(overlappingSchema, {
        a: async () => ({status: 200, body: "a"}),
        b: async () => ({status: 200, body: "b"}),
      });
      const tree = buildRouterTree(flattenRouterTree(overlappingSchema, overlappingRouter));
      const keys = Object.getOwnPropertySymbols(tree);
      expect(keys.length).toBe(1);
      const expectedKey = $$variable;
      expect(keys[0]).toBe(expectedKey);
      const child = tree[keys[0] as keyof typeof tree];
      const symbolKeys = Object.getOwnPropertySymbols(child);
      expect(symbolKeys.length).toBe(2);
      expect(symbolKeys).toContain(methodToSymbol("GET"));
      expect(isRouteAndImplementation(child[methodToSymbol("GET")])).toBe(true);
      expect(symbolKeys).toContain(methodToSymbol("POST"));
      expect(isRouteAndImplementation(child[methodToSymbol("POST")])).toBe(true);
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type __RouteAndImplementation = {route: Route; fn: (...args: any[]) => unknown};
function isRouteAndImplementation(value: __RouteAndImplementation): value is __RouteAndImplementation {
  return typeof value === "object" && value !== null && "route" in value && "fn" in value;
}
