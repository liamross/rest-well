import type z from "zod";
import type {Resource, Route, RouteProperties, RouteReturnValue} from "./resource";
import type {InferZod, Prettify} from "./type-utils";

type RouteRequest<R extends Route> =
  R extends RouteProperties<infer P, infer PP, infer M, infer B, infer CT, infer _Res, infer Q, infer H>
    ? Prettify<
        {
          path: P;
          method: M;
          contentType: CT;
        } & (PP extends z.ZodType<infer O> ? {params: O} : {}) &
          (InferZod<B> extends undefined ? {} : {body: z.infer<B>}) &
          (InferZod<Q> extends undefined ? {} : {query: z.infer<Q>}) &
          (InferZod<H> extends undefined ? {} : {headers: z.infer<H>})
      >
    : never;

type RouteImplementation<R extends Route> = (req: RouteRequest<R>) => Promise<RouteReturnValue<R>>;

export function route<R extends Route>(route: R, implementation: RouteImplementation<R>): RouteImplementation<R> {
  return implementation;
}

export function router<R extends Resource>(
  resource: R,
  implementations: {[K in keyof R]: RouteImplementation<R[K]>},
): {[K in keyof R]: RouteImplementation<R[K]>} {
  return implementations;
}
