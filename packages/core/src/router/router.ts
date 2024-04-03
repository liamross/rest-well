import type {Route, RouteRequestValue, RouteResponseValue, Schema} from "../schema";
import type {Prettify} from "../utils";
import {isRoute} from "../schema";
import {PathTree} from "./path";

export type RouterFunction<R extends Route> = (req: RouteRequestValue<R>) => Promise<Prettify<RouteResponseValue<R>>>;

export type RouterImplementation<R extends Schema | Route> = R extends Route
  ? RouterFunction<R>
  : R extends Schema
    ? {[K in keyof R]: RouterImplementation<R[K]>}
    : never;

export type Router = <T extends Schema | Route>(
  schema: T,
  implementations: RouterImplementation<T>,
) => RouterImplementation<T>;
