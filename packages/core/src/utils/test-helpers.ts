import type {z} from "zod";
import {expect} from "vitest";
import {isSameType} from "zod-compare";
import type {Branded} from "./branded";
import type {Prettify} from "./helpers";

type ValuesAreEqual<A, B> = Branded<{a: A; b: B}, "ValuesAreEqual">;
type TypeMismatchError<A, B> = Branded<{a: A; b: B}, "TypeMismatchError">;
type DoesNotExtendError<A, B> = Branded<{a: A; b: B}, "DoesNotExtendError">;

export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? ValuesAreEqual<A, B> : TypeMismatchError<A, B>;

export type Extends<A, B> = B extends A ? ValuesAreEqual<A, B> : DoesNotExtendError<A, B>;

export type EqualZod<
  A extends z.ZodTypeAny,
  B extends z.ZodTypeAny,
  C = Prettify<z.infer<A>>,
  D = Prettify<z.infer<B>>,
> =
  Equal<C, D> extends ValuesAreEqual<unknown, unknown>
    ? Equal<A, B> extends ValuesAreEqual<unknown, unknown>
      ? ValuesAreEqual<C, D>
      : TypeMismatchError<A, B>
    : TypeMismatchError<C, D>;

export type EqualZodInfer<
  A extends z.ZodTypeAny,
  B extends z.ZodTypeAny,
  C = Prettify<z.infer<A>>,
  D = Prettify<z.infer<B>>,
> = Equal<C, D>;

export type Expect<V extends ValuesAreEqual<unknown, unknown>> = V;

export function expectSameZodType(z1: z.ZodType, z2: z.ZodType) {
  expect(isSameType(z1, z2)).toBeTruthy();
}

export function expectSameZodParse(z1: z.ZodType, z2: z.ZodType, obj: object, expected?: object) {
  const a = z1.safeParse(obj);
  const b = z2.safeParse(obj);

  if (!a.success || !b.success) {
    expect(a.success).toBeTruthy();
    expect(b.success).toBeTruthy();
    return;
  }

  expect(a.data).toEqual(b.data);

  if (expected) expect(a.data).toEqual(expected);
}
