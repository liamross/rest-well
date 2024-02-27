import type z from "zod";

/** Simplify the type representation of objects. */
export type Prettify<T> = {[K in keyof T]: T[K]} & {};

export type Promisable<T> = T | Promise<T>;

// HACK: enforce that a type is coming from an internal source. For example,
// this could prevent a similar shape object from being used in place of one we
// want to enforce as coming from a specific source.
declare const typeError: unique symbol;
declare type TypeError<Message extends string> = {
  readonly [typeError]: Message;
};

export type InternalUse<Type, Message extends string> = Type & TypeError<Message>;
export type UnwrapInternalUse<Wrapped> = Wrapped extends TypeError<string> ? Omit<Wrapped, typeof typeError> : Wrapped;

/** Checks to see if a type T is unknown or not. */
type IsUnknown<T> = T extends unknown ? (unknown extends T ? true : false) : false;

/** Checks to see if a type T is an object with unknown keys or not. */
type IsUnknownObject<T> = T extends {[key: string]: infer V} ? IsUnknown<V> : false;

export type ObjectSchema<T = unknown> = z.ZodType<{[key: string]: T}>;
export type AnySchema = z.ZodType<unknown>;

/** Infer the type from zod even if it's optional and may be unknown. */
export type InferZod<Z extends z.ZodType<unknown>> =
  IsUnknown<z.infer<Z>> extends true ? undefined : IsUnknownObject<z.infer<Z>> extends true ? undefined : z.infer<Z>;

export type ValidateShape<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;
