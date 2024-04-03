import type {z} from "zod";
import type {FlushedSchema, Route, RouteRequestValue, RouteResponseValue, Schema} from "../schema";
import type {CombineObjects, IsFullyPartialObject, PartialByIfSameType, Prettify} from "../utils";

type _ClientDefaultValues = {params?: object; headers?: object; routes?: {[key: string]: _ClientDefaultValues}};

type ClientDefaultValues<R extends Schema | Route> =
  R extends FlushedSchema<infer Res, infer _BP, infer BPP, infer _SR, infer SH>
    ? Prettify<
        ((BPP extends z.ZodTypeAny ? {params?: Prettify<Partial<z.infer<BPP>>>} : {}) &
          (SH extends z.ZodTypeAny ? {headers?: Prettify<Partial<z.infer<SH>>>} : {})) & {
          routes?: {
            [K in keyof Res as ClientDefaultValues<Res[K]> extends never ? never : K]?: ClientDefaultValues<Res[K]>;
          };
        }
      >
    : never;

type CombineClientDefaultValues<A extends _ClientDefaultValues, K> = K extends keyof A["routes"]
  ? A["routes"][K] extends infer Child extends _ClientDefaultValues
    ? {
        params: CombineObjects<A["params"], Child["params"]>;
        headers: CombineObjects<A["headers"], Child["headers"]>;
        // Only include children if the key matches, so we don't match nested
        // children with the same name.
        routes: Child["routes"];
      }
    : {params: A["params"]; headers: A["headers"]}
  : {params: A["params"]; headers: A["headers"]};

type ClientOptions<S extends Schema, B extends string, D extends _ClientDefaultValues | undefined> = {
  baseUrl: B;
  defaultValues?: D;
};

type MakePartialIfValuePartial<T> = Prettify<
  {
    [K in keyof T as IsFullyPartialObject<T[K]> extends true ? K : never]?: T[K];
  } & {
    [K in keyof T as IsFullyPartialObject<T[K]> extends false ? K : never]: T[K];
  }
>;

type ClientRequest<R extends Route, D extends _ClientDefaultValues> =
  RouteRequestValue<R> extends infer Req extends object
    ? MakePartialIfValuePartial<{
        [K in keyof Req]: K extends "params" | "headers" ? PartialByIfSameType<Req[K], D[K]> : Req[K];
      }>
    : never;

type ClientReturnValue<S extends Schema | Route, D extends _ClientDefaultValues> = S extends Route
  ? (req: ClientRequest<S, D>) => Promise<Prettify<RouteResponseValue<S>>>
  : S extends Schema
    ? {[K in keyof S]: ClientReturnValue<S[K], CombineClientDefaultValues<D, K>>}
    : never;

export type Client = <S extends Schema, B extends string, D extends ClientDefaultValues<S>>(
  schema: S,
  options: ClientOptions<S, B, D>,
) => ClientReturnValue<S, D>;
