import type {z} from "zod";

// Path is just a string, but we enforce it using `RestrictPath`.
export type Path = string;

// We distinguish between query and mutation methods since mutation methods can
// have a body and content type.
export type QueryMethod = "GET";
export type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";

type _RawZodShape = {[k: string | number]: z.ZodTypeAny};
type _RawShape = {[k: string | number]: unknown};

type UnknownZodType<T = unknown> = z.ZodType<T>;
type UnknownZodObjectType<O extends object = _RawShape> = z.ZodType<O>;

// These are all the base types for route properties.
export type RouteMethod = QueryMethod | MutationMethod;
export type RouteContentType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";
export type RoutePathParams = UnknownZodObjectType;
export type RouteResponses = {[key: number]: UnknownZodType};
export type RouteBody = UnknownZodType;
export type RouteQuery = UnknownZodObjectType;
export type RouteHeaders = UnknownZodObjectType;

// Enforce that path params has a key for every variable in the path.
type _PathParamsInner<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? never : Param)
        // Allow any here since we don't care what the string is converted into by zod.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        | keyof (_PathParamsInner<Rest> extends infer O extends _RawZodShape ? O : {})]: any;
    }
  : undefined;

export type PathParams<S extends Path> =
  _PathParamsInner<S> extends infer O extends _RawZodShape ? UnknownZodObjectType<O> : undefined;
