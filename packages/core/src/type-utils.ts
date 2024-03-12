import type z from "zod";

/** Simplify the type representation of objects. */
export type Prettify<T> = {[K in keyof T]: T[K]} & {};

export type Promisable<T> = T | Promise<T>;

// HACK: enforce that a type is coming from an internal source. For example,
// this could prevent a similar shape object from being used in place of one we
// want to enforce as coming from a specific source.
declare const typeError: unique symbol;
declare type TypeError<Message extends string> = {readonly [typeError]: Message};

export type InternalUse<Type, Message extends string> = Type & TypeError<Message>;
export type UnwrapInternalUse<Wrapped> = Wrapped extends TypeError<string> ? Omit<Wrapped, typeof typeError> : Wrapped;

/** Checks to see if a type T is unknown or not. */
export type IsUnknown<T> = T extends unknown ? (unknown extends T ? true : false) : false;

/** Checks to see if a type T is an object with unknown keys or not. */
export type IsUnknownObject<T> = T extends {[key: string]: infer V} ? IsUnknown<V> : false;

export type RemoveUnknownValuesFromObject<T> = {
  [K in keyof T]: IsUnknown<T[K]> extends true ? never : T[K];
};

/** Infer the type from zod even if it's optional and may be unknown. */
export type InferZod<Z extends z.ZodType<unknown> | undefined> =
  Z extends z.ZodType<infer T>
    ? IsUnknown<T> extends true
      ? undefined
      : IsUnknownObject<T> extends true
        ? undefined
        : RemoveUnknownValuesFromObject<T> extends never
          ? undefined
          : T
    : undefined;
