import {describe, expect, test} from "vitest";
import z from "zod";
import {contract, createRouter} from "./contract";
import {getAllPaths, getPathWithParams} from "./path";

type getPathWithParams = typeof getPathWithParams;

describe("path", () => {
  describe("getPathWithParams", () => {
    test.each(getPathWithParamsTests)("getPathWithParams($params.0, $params.1) === $expected", (test) => {
      expect(getPathWithParams(...test.params)).toEqual(test.expected);
    });

    test("throws when two routes match the same URL", () => {
      expect(() => getPathWithParams("/one/something/two", ["/{a}/something/{a}", "/{b}/something/{b}"])).toThrow(
        `You have two routes that match the same URL: '/{a}/something/{a}' and '/{b}/something/{b}'`,
      );
    });
  });

  describe("getAllPaths", () => {
    test("returns all paths from a contract", () => {
      const paths = getAllPaths(apiContract);
      expect(paths).toEqual(["/api/{version}/users/{id}", "/api/{version}/users"]);
    });
  });
});

const userSchema = z.object({id: z.string()});

const usersContract = contract(
  ({GET, POST, DELETE}) => ({
    getUser: GET("/{id}", {
      pathParams: userSchema,
      responses: {200: userSchema},
    }),
    createUser: POST({
      body: userSchema,
      responses: {201: userSchema},
    }),
    deleteUser: DELETE("/{id}", {
      pathParams: userSchema,
      responses: {200: userSchema},
    }),
  }),
  {basePath: "/users"},
);

const apiContract = contract(
  () => ({
    users: usersContract,
  }),
  {
    basePath: "/api/{version}",
    pathParams: z.object({
      version: z.literal("v1"),
    }),
  },
);

const usersRouter = createRouter(usersContract, {
  getUser: () => Promise.resolve({status: 200, body: {id: "1"}}),
  createUser: () => Promise.resolve({status: 201, body: {id: "1"}}),
  deleteUser: async () => Promise.resolve({status: 200, body: {id: "1"}}),
});

const apiRouter = createRouter(apiContract, {
  users: usersRouter,
});

const getPathWithParamsTests: {params: Parameters<getPathWithParams>; expected: ReturnType<getPathWithParams>}[] = [
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
