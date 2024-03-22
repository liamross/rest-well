import type {z} from "zod";
import type {MergeObjects} from "./helpers";

export type CombineStrings<A extends string | undefined, B extends string> = A extends string ? `${A}${B}` : B;
export function combineStrings<A extends string | undefined, B extends string>(
  a: A | undefined,
  b: B,
): CombineStrings<A, B> {
  if (a !== undefined) return `${a}${b}` as CombineStrings<A, B>;
  return b as CombineStrings<A, B>;
}

export type CombineObjects<A extends object | undefined, B extends object | undefined> = A extends object
  ? B extends object
    ? MergeObjects<A, B>
    : A
  : B;
export function combineObjects<A extends object | undefined, B extends object | undefined>(
  a: A | undefined,
  b: B | undefined,
): CombineObjects<A, B> {
  if (a === undefined) return b as CombineObjects<A, B>;
  if (b === undefined) return a as CombineObjects<A, B>;
  return {...a, ...b} as CombineObjects<A, B>;
}

export type CombineZodSchemas<
  A extends z.ZodTypeAny | undefined,
  B extends z.ZodTypeAny | undefined,
> = A extends z.ZodTypeAny ? (B extends z.ZodTypeAny ? MergeZod<A, B> : A) : B;

export function combineZodSchemas<A extends z.ZodTypeAny | undefined, B extends z.ZodTypeAny | undefined>(
  a: A | undefined,
  b: B | undefined,
): CombineZodSchemas<A, B> {
  if (a === undefined) return b as CombineZodSchemas<A, B>;
  if (b === undefined) return a as CombineZodSchemas<A, B>;
  if (isZodObject(a) && isZodObject(b)) return mergeZodObjects(a, b) as CombineZodSchemas<A, B>;
  return mergeZodSchemas(a, b) as CombineZodSchemas<A, B>;
}

type MergeZod<A extends z.ZodTypeAny, B extends z.ZodTypeAny> = A extends z.SomeZodObject
  ? B extends z.SomeZodObject
    ? NonNullable<MergeZodObjects<A, B>>
    : NonNullable<MergeZodSchemas<A, B>>
  : NonNullable<MergeZodSchemas<A, B>>;

type MergeZodObjects<A extends z.SomeZodObject, B extends z.SomeZodObject> = z.ZodObject<
  z.objectUtil.extendShape<A["shape"], B["shape"]>,
  B["_def"]["unknownKeys"],
  B["_def"]["catchall"]
>;
function mergeZodObjects<A extends z.SomeZodObject, B extends z.SomeZodObject>(a: A, b: B): MergeZodObjects<A, B> {
  return a.merge(b) as MergeZodObjects<A, B>;
}

type MergeZodSchemas<A extends z.ZodTypeAny, B extends z.ZodTypeAny> = z.ZodIntersection<A, B>;
function mergeZodSchemas<A extends z.ZodTypeAny, B extends z.ZodTypeAny>(a: A, b: B): MergeZodSchemas<A, B> {
  return a.and(b) as MergeZodSchemas<A, B>;
}

function isZodObject(schema: z.ZodTypeAny): schema is z.SomeZodObject {
  return "shape" in schema;
}
