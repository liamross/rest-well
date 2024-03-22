import {describe, expect, it} from "vitest";
import {z} from "zod";
import type {Equal, EqualZod, EqualZodInfer, Expect} from "./test-helpers";
import {combineObjects, combineStrings, combineZodSchemas} from "./combine";
import {expectSameZodParse, expectSameZodType} from "./test-helpers";

describe("combineStrings", () => {
  it("should combine two strings", () => {
    const result = combineStrings("Hello", "World");
    const expected = "HelloWorld";
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toBe(expected);
  });

  it("should handle undefined values", () => {
    const result = combineStrings(undefined, "World");
    const expected = "World";
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toBe(expected);
  });
});

describe("combineObjects", () => {
  it("should combine two objects", () => {
    const obj1 = {a: 1, b: 2};
    const obj2 = {c: 3, d: 4};
    const result = combineObjects(obj1, obj2);
    const expected = {a: 1, b: 2, c: 3, d: 4};
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toEqual(expected);
  });

  it("should handle first undefined value", () => {
    const obj2 = {a: 1, b: 2};
    const result = combineObjects(undefined, obj2);
    const expected = obj2;
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toEqual(expected);
  });

  it("should handle both undefined values", () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const result = combineObjects(undefined, undefined);
    const expected = undefined;
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toBe(expected);
  });

  it("should overwrite keys", () => {
    const obj1 = {a: 1, b: 2} as const;
    const obj2 = {b: "3", c: 4} as const;
    const result = combineObjects(obj1, obj2);
    const expected = {a: 1, b: "3", c: 4} as const;
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toEqual(expected);
  });
});

describe("combineZodSchemas", () => {
  it("should combine two objects", () => {
    const obj1 = z.object({a: z.literal("v1"), b: z.string()});
    const obj2 = z.object({c: z.string(), d: z.string()});
    const result = combineZodSchemas(obj1, obj2);
    const expected = z.object({a: z.literal("v1"), b: z.string(), c: z.string(), d: z.string()});
    type __ = Expect<EqualZod<typeof result, typeof expected>>;
    expectSameZodType(result, expected);
  });

  it("should combine two non-objects", () => {
    const obj1 = z.object({a: z.string(), b: z.string()}).refine(() => true);
    const obj2 = z.object({c: z.string(), d: z.string()}).refine(() => true);
    const result = combineZodSchemas(obj1, obj2);
    const expected = z.object({a: z.string(), b: z.string(), c: z.string(), d: z.string()});
    type __ = Expect<EqualZodInfer<typeof result, typeof expected>>;
    expectSameZodParse(result, expected, {a: "a", b: "b", c: "c", d: "d", e: "e"});
  });

  it("should combine object with non-object", () => {
    const obj1 = z.object({a: z.string(), b: z.string()}).refine(() => true);
    const obj2 = z.object({c: z.string(), d: z.string()});
    const result = combineZodSchemas(obj1, obj2);
    const expected = z.object({a: z.string(), b: z.string(), c: z.string(), d: z.string()});
    type __ = Expect<EqualZodInfer<typeof result, typeof expected>>;
    expectSameZodParse(result, expected, {a: "a", b: "b", c: "c", d: "d", e: "e"});
  });

  it("should combine non-object with object", () => {
    const obj1 = z.object({a: z.string(), b: z.string()});
    const obj2 = z.object({c: z.string(), d: z.string()}).refine(() => true);
    const result = combineZodSchemas(obj1, obj2);
    const expected = z.object({a: z.string(), b: z.string(), c: z.string(), d: z.string()});
    type __ = Expect<EqualZodInfer<typeof result, typeof expected>>;
    expectSameZodParse(result, expected, {a: "a", b: "b", c: "c", d: "d", e: "e"}, {a: "a", b: "b", c: "c", d: "d"});
  });

  it("should combine two objects with unknowns", () => {
    const obj1 = z.object({a: z.unknown(), b: z.string()});
    const obj2 = z.object({c: z.unknown(), d: z.string()});
    const result = combineZodSchemas(obj1, obj2);
    const expected = z.object({a: z.unknown(), b: z.string(), c: z.unknown(), d: z.string()});
    type __ = Expect<EqualZod<typeof result, typeof expected>>;
    expectSameZodType(result, expected);
  });

  it("should handle first undefined value", () => {
    const obj2 = z.object({c: z.string(), d: z.string()});
    const result = combineZodSchemas(undefined, obj2);
    const expected = obj2;
    type __ = Expect<EqualZod<typeof result, typeof expected>>;
    expectSameZodType(result, expected);
  });

  it("should handle both undefined values", () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const result = combineZodSchemas(undefined, undefined);
    const expected = undefined;
    type __ = Expect<Equal<typeof result, typeof expected>>;
    expect(result).toBe(expected);
  });

  it("should overwrite object keys", () => {
    const obj1 = z.object({a: z.number(), b: z.number()});
    const obj2 = z.object({b: z.string(), c: z.number()});
    const result = combineZodSchemas(obj1, obj2);
    const expected = z.object({a: z.number(), b: z.string(), c: z.number()});
    type __ = Expect<EqualZod<typeof result, typeof expected>>;
    expectSameZodType(result, expected);
  });

  // it("should type error when conflicting non-object keys", () => {
  //   const obj1 = z.object({a: z.number(), b: z.number()});
  //   const obj2 = z.object({b: z.record(z.string()), c: z.number()}).refine(() => true);
  //   const result = combineZodSchemas(obj1, obj2);
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   type __ = Expect<Extends<typeof result, KeyConflictError<any, any>>>;
  // });

  it("should chain schemas", () => {
    const obj1 = z.object({a: z.number(), b: z.number()});
    const obj2 = z.object({b: z.string(), c: z.number()});
    const obj3 = z.object({c: z.string(), d: z.number()});
    const preresult = combineZodSchemas(obj1, obj2);
    const result = combineZodSchemas(preresult, obj3);
    const expected = z.object({a: z.number(), b: z.string(), c: z.string(), d: z.number()});
    type __ = Expect<EqualZod<typeof result, typeof expected>>;
    expectSameZodType(result, expected);
  });

  it("should chain schemas with some undefined", () => {
    const obj1 = z.object({a: z.number(), b: z.number()});
    const obj2 = z.object({b: z.string(), c: z.number()});
    const obj3 = z.object({c: z.string(), d: z.number()});
    const a = combineZodSchemas(obj1, undefined);
    const b = combineZodSchemas(undefined, a);
    const c = combineZodSchemas(b, obj2);
    const result = combineZodSchemas(c, obj3);
    const expected = z.object({a: z.number(), b: z.string(), c: z.string(), d: z.number()});
    type __ = Expect<EqualZod<typeof result, typeof expected>>;
    expectSameZodType(result, expected);
  });
});
