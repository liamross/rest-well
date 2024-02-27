import type z from "zod";
import type {Resource, Route, RouteProperties} from "./resource";
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

type RouteResponse<R extends Route> = {
  [k in keyof R["responses"]]: {
    status: k extends number ? k : never;
    body: k extends number ? z.infer<R["responses"][k]> : never;
    headers?: Headers; // TODO: eventually we may want to enforce this.
  };
}[keyof R["responses"]];

type RouteImplementation<R extends Route> = (req: RouteRequest<R>) => Promise<RouteResponse<R>>;

export function route<R extends Route>(route: R, implementation: RouteImplementation<R>) {
  return implementation;
}

export function router<R extends Resource>(resource: R, implementations: {[K in keyof R]: RouteImplementation<R[K]>}) {
  return implementations;
}
