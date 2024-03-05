import type {Route, RouteImplementation, Schema} from "../schema";

export type Client = <T extends Schema | Route>(schema: T) => RouteImplementation<T>;
