import type {Route, RouteRequestValue, RouteResponseValue, Schema} from "../schema";
import type {Prettify} from "../utils";

export type RouterImplementation<R extends Schema | Route> = R extends Route
  ? (req: RouteRequestValue<R>) => Promise<Prettify<RouteResponseValue<R>>>
  : R extends Schema
    ? {[K in keyof R]: RouterImplementation<R[K]>}
    : never;

export type Router = <T extends Schema | Route>(
  schema: T,
  implementations: RouterImplementation<T>,
) => RouterImplementation<T>;
