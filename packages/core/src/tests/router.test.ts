/* eslint-disable @typescript-eslint/require-await */
import {describe, expect, it} from "vitest";
import {z} from "zod";
import {createRouter} from "../";
import {api} from "./data/router";
import {apiResource} from "./data/schema";

expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    if (val instanceof z.ZodType) {
      const typeName = (val._def as {[key: string]: string}).typeName;
      return `[${typeName}]`;
    }
    return printer(val, config, indentation, depth, refs);
  },
  test(val): boolean {
    return val instanceof z.ZodType;
  },
});

describe("router", () => {
  it("should match snapshot", () => {
    expect(createRouter(apiResource, api)).toMatchSnapshot();
  });
});
