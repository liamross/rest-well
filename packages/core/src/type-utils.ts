import type z from "zod";

/** Simplify the type representation of objects. */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

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

/** Infer the type from zod even if it's optional and may be unknown. */
export type InferZod<Z extends z.ZodType<unknown> | undefined> =
  NonNullable<Z> extends z.ZodType<infer T> ? (IsUnknown<T> extends true ? undefined : T) : undefined;
