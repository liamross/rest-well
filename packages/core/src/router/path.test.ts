/* eslint-disable @typescript-eslint/require-await */
import {describe, expect, test} from "vitest";
import {z} from "zod";
import type {Equal, Expect} from "../utils/test-helpers";
import type {Router} from "./router";
import {GET, schema} from "../schema";
import {_get, _pathParam, buildPathTree, flattenRouterTree, getPathWithParams} from "./path";

describe("getPathWithParams", () => {
  const getPathWithParamsTests: {
    params: Parameters<typeof getPathWithParams>;
    expected: ReturnType<typeof getPathWithParams>;
  }[] = [
    // Basic matches.
    {
      params: ["/1", ["/{a}"]],
      expected: {path: "/{a}", params: {a: "1"}},
    },
    {
      params: ["/a/b", ["/{a}/{b}"]],
      expected: {path: "/{a}/{b}", params: {a: "a", b: "b"}},
    },

    // No matches.
    {
      params: ["/a", ["/{a}/{b}"]],
      expected: null,
    },
    {
      params: ["/a/b", ["/{a}"]],
      expected: null,
    },

    // Prioritize static parts.
    {
      params: ["/a", ["/{a}", "/a"]],
      expected: {path: "/a", params: {}},
    },
    {
      params: ["/a", ["/a", "/{a}"]],
      expected: {path: "/a", params: {}},
    },
    {
      params: ["/a/b", ["/{a}/{b}", "/a/{b}"]],
      expected: {path: "/a/{b}", params: {b: "b"}},
    },
    {
      params: ["/a/b", ["/a/{b}", "/{a}/{b}"]],
      expected: {path: "/a/{b}", params: {b: "b"}},
    },
  ];

  test.each(getPathWithParamsTests)("getPathWithParams($params.0, $params.1) === $expected", (test) => {
    expect(getPathWithParams(...test.params)).toEqual(test.expected);
  });

  test("throws when two routes match the same URL", () => {
    expect(() => getPathWithParams("/one/something/two", ["/{a}/something/{a}", "/{b}/something/{b}"])).toThrow(
      `You have two routes that match the same URL: '/{a}/something/{a}' and '/{b}/something/{b}'`,
    );
  });
});

describe("Route parsing", () => {
  const router: Router = (_, i) => i;

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
      expect(symbolKeys[0]).toBe(_get);
      const fnBlock = child[symbolKeys[0] as keyof typeof child];
      expect(fnBlock.fn).toBe(getUserFn);
    });

    test("can identify a duplicate route", () => {
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
      expect(() => flattenRouterTree(duplicateSchema, duplicateRouter)).toThrow(
        `[FATAL] Duplicate routes: GET "/{a}" matches same path as "/{a}"`,
      );
    });

    test("can identify missing implementations", () => {
      const exampleMissingImplementation = router(exampleSchema, {getUser: undefined!});
      expect(() => flattenRouterTree(exampleSchema, exampleMissingImplementation)).toThrow(
        `[FATAL] Missing route implementation: "getUser"`,
      );
    });
  });

  describe("buildPathTree", () => {
    test("can build a path tree", () => {
      const pathTree = buildPathTree<typeof exampleSchema>(exampleFlattened);
      const fnAndRoute = pathTree.api[_pathParam].users[_pathParam][_get];
      expect(fnAndRoute.fn).toBe(getUserFn);
    });

    test("can identify an overlapping route", () => {
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
      expect(() => buildPathTree(flat)).toThrow(`[FATAL] Overlapping routes: GET "/{b}" matches same path as "/{a}"`);
    });
  });
});
