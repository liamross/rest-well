import type z from "zod";
import type {Resource, Route, RouteProperties, RouteReturnValue} from "./resource";
import type {InferZod, Prettify} from "./type-utils";

type ClientArguments<R extends Route> =
  R extends RouteProperties<infer _P, infer PP, infer _M, infer B, infer _CT, infer _Res, infer Q, infer H>
    ? (PP extends z.ZodType<infer O> ? {params: Prettify<O>} : {}) &
        (InferZod<B> extends undefined ? {} : {body: Prettify<z.infer<B>>}) &
        (InferZod<Q> extends undefined ? {} : {query: Prettify<z.infer<Q>>}) &
        (InferZod<H> extends undefined ? {} : {headers: Prettify<z.infer<H>>})
    : never;

type ClientImplementation<R extends Resource | Route> = R extends Resource
  ? {[K in keyof R]: ClientImplementation<R[K]>}
  : R extends Route
    ? (args: Prettify<ClientArguments<R>>) => Promise<Prettify<RouteReturnValue<R>>>
    : never;

function clientRoute<R extends Route>(route: R): ClientImplementation<R> {
  throw new Error("NOT IMPLEMENTED");
  // return (args) => {};
}

export function createClient<R extends Resource>(resource: R): {[K in keyof R]: ClientImplementation<R[K]>} {
  throw new Error("NOT IMPLEMENTED");
}
