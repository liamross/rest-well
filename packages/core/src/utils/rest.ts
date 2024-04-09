import type {z} from "zod";
import type {Prettify} from "./helpers";

// Path is just a string, but we enforce it using `RestrictPath`.
export type Path = string;

// We distinguish between query and mutation methods since mutation methods can
// have a body and content type.
export type QueryMethod = "GET";
export type MutationMethod = "POST" | "DELETE" | "PUT" | "PATCH";

export type UnknownObject = {[k: string | number]: unknown};

type UnknownZodType<T = unknown> = z.ZodType<T>;
type UnknownZodObjectType<O extends object = UnknownObject> = z.ZodType<O>;

// These are all the base types for route properties.
export type Method = Prettify<QueryMethod | MutationMethod>;
export type MediaType = "application/json" | "multipart/form-data" | "application/x-www-form-urlencoded";
export type PathParams = UnknownZodObjectType;
export type Responses = {[key: number]: UnknownZodType};
export type RequestBody = UnknownZodType;
export type RequestQuery = UnknownZodObjectType;
export type RequestHeaders = UnknownZodObjectType;

type _RawZodShape = {[k: string | number]: z.ZodTypeAny};

// Enforce that path params has a key for every variable in the path.
type _PathParamSchema<S extends Path> = S extends `${infer _Start}{${infer Param}}${infer Rest}`
  ? {
      [k in
        | (Param extends `${string}/${string}` ? never : Param)
        // Allow any here since we don't care what the string is converted into by zod.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        | keyof (_PathParamSchema<Rest> extends infer O extends _RawZodShape ? O : {})]: any;
    }
  : undefined;

export type PathParamSchema<S extends Path> =
  _PathParamSchema<S> extends infer O extends _RawZodShape ? UnknownZodObjectType<O> : undefined;
