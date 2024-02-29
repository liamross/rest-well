import type z from "zod";
import type {Resource, Route, RouteProperties, RouteReturnValue} from "./resource";
import type {InferZod, Prettify} from "./type-utils";

type ClientArguments<R extends Route> =
  R extends RouteProperties<infer _P, infer PP, infer _M, infer B, infer _CT, infer _Res, infer Q, infer H>
    ? Prettify<
        (PP extends z.ZodType<infer O> ? {params: O} : {}) &
          (InferZod<B> extends undefined ? {} : {body: z.infer<B>}) &
          (InferZod<Q> extends undefined ? {} : {query: z.infer<Q>}) &
          (InferZod<H> extends undefined ? {} : {headers: z.infer<H>})
      >
    : never;

type ClientImplementation<R extends Route> = (
  args: Prettify<ClientArguments<R>>,
) => Promise<Prettify<RouteReturnValue<R>>>;

function clientRoute<R extends Route>(route: R): ClientImplementation<R> {
  throw new Error("NOT IMPLEMENTED");
  // return (args) => {};
}

export function createClient<R extends Resource>(resource: R): {[K in keyof R]: ClientImplementation<R[K]>} {
  throw new Error("NOT IMPLEMENTED");
}
