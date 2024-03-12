import type z from "zod";

// Path is just a string, but we enforce it using `RestrictPath`.
export type Path = string;

// Path params are more limited since they must be strings.
type PathParamValue = string | number | boolean | Date;

// We distinguish between query and mutation methods since mutation methods can
// have a body and content type.
export type QueryMethod = "GET";
export type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";

export type ObjectSchema<T = unknown> = z.ZodType<{[key: string]: T}>;
export type AnySchema = z.ZodType<unknown>;

// These are all the base types for route properties.
export type RouteMethod = QueryMethod | MutationMethod;
export type RouteContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";
export type RoutePathParams = ObjectSchema<PathParamValue>;
export type RouteResponses = {[key: number]: AnySchema};
export type RouteBody = AnySchema;
export type RouteQuery = ObjectSchema;
export type RouteHeaders = ObjectSchema;

// Enforce that path params has a key for every variable in the path.
type _PathParamsInnerType = {[key: string]: PathParamValue};
type _PathParamsInner<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? never : Param)
        // Allow any here since we don't care what the string is converted into by zod.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        | keyof (_PathParamsInner<Rest> extends infer O extends _PathParamsInnerType ? O : {})]: any;
    }
  : undefined;

export type PathParams<S extends Path> =
  _PathParamsInner<S> extends infer O extends _PathParamsInnerType ? z.ZodType<O> : undefined;

// =============================================================================
// Enforce path string.
// -----------------------------------------------------------------------------

type InvalidPathError<Original extends string, Error extends string> = `${Original}|${Error}`;
type FormatErrorOrString<T extends string> = T extends InvalidPathError<infer _O, infer E> ? `Invalid path: ${E}` : T;

type StringMatches<S extends string, Match extends string, Error extends string> = S extends Match
  ? S
  : InvalidPathError<S, Error>;
type StringDoesNotMatch<S extends string, Match extends string, Error extends string> = S extends Match
  ? InvalidPathError<S, Error>
  : S;

type CombineErrors<Error extends InvalidPathError<string, string>, Maybe extends string> =
  Error extends InvalidPathError<infer O, infer EE>
    ? Maybe extends InvalidPathError<infer _O, infer ME>
      ? InvalidPathError<O, `${EE}, ${ME}`>
      : Error
    : Maybe;

type StartsWithSlash<T extends string> =
  T extends InvalidPathError<infer O, infer _E>
    ? CombineErrors<T, StringMatches<O, `/${string}`, "must start with '/'">>
    : StringMatches<T, `/${string}`, "must start with '/'">;

type DoesNotEndWithSlash<T extends string> =
  T extends InvalidPathError<infer O, infer _E>
    ? CombineErrors<T, StringDoesNotMatch<O, `${string}/`, "must not end with '/'">>
    : StringDoesNotMatch<T, `${string}/`, "must not end with '/'">;

export type RestrictPath<T extends string> = FormatErrorOrString<DoesNotEndWithSlash<StartsWithSlash<T>>>;
