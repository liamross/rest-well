import type {Route, RouteRequestValue, RouteResponseValue, Schema} from "../schema";
import type {Prettify, Promisable} from "../utils";

/**
 * A router function that takes a request and returns a response. The request
 * and possible returned responses are typed based on the API schema.
 */
export type RouterFunction<R extends Route> = (
  req: RouteRequestValue<R>,
) => Promisable<Prettify<RouteResponseValue<R>>>;

/**
 * A router implementation object that maps route methods to their respective
 * router functions.
 */
export type RouterImplementation<R extends Schema | Route> = R extends Route
  ? RouterFunction<R>
  : R extends Schema
    ? {[K in keyof R]: RouterImplementation<R[K]>}
    : never;

/**
 * A router function takes your schema and a matching implementation
 * @param schema The schema to create implementations for. This could also be an
 * individual route if you wish to build an implementation for a single route.
 * @param implementations The implementations object, or function if for a
 * single route.
 * @returns The typed implementation input.
 */
export function router<T extends Schema | Route>(
  schema: T,
  implementations: RouterImplementation<T>,
): RouterImplementation<T> {
  return implementations;
}
