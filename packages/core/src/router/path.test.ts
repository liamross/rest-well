import {describe, expect, test} from "vitest";
import {getPathWithParams} from "./path";

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
