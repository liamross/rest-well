import type z from "zod";
import type {Resource, Route, RouteProperties, RouteReturnValue} from "./resource";
import type {InferZod, Prettify} from "./type-utils";

type RouteRequest<R extends Route> =
  R extends RouteProperties<infer _P, infer PP, infer _M, infer B, infer _CT, infer _R, infer Q, infer H>
    ? (PP extends z.ZodType<infer O> ? {params: Prettify<O>} : {}) &
        (InferZod<B> extends undefined ? {_body: InferZod<B>} : {body: Prettify<z.infer<B>>}) &
        (InferZod<Q> extends undefined ? {_query: InferZod<Q>} : {query: Prettify<z.infer<Q>>}) &
        (InferZod<H> extends undefined ? {_headers: InferZod<H>} : {headers: Prettify<z.infer<H>>})
    : never;

type RouteImplementation<R extends Resource | Route> = R extends Resource
  ? {[K in keyof R]: RouteImplementation<R[K]>}
  : R extends Route
    ? (req: Prettify<RouteRequest<R>>) => Promise<Prettify<RouteReturnValue<R>>>
    : never;

export function route<R extends Route>(route: R, implementation: RouteImplementation<R>): RouteImplementation<R> {
  return implementation;
}

export function router<R extends Resource>(
  resource: R,
  implementations: RouteImplementation<R>,
): RouteImplementation<R> {
  return implementations;
}
