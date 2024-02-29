/* eslint-disable @typescript-eslint/require-await */
import type z from "zod";
import type {User} from "./playground_resource";
import type {IsUnknown, IsUnknownObject, Prettify, RemoveUnknownValuesFromObject} from "./type-utils";
import {apiResource} from "./playground_resource";
import {route, router} from "./router";

const list = route(apiResource.users.list, async ({query}) => ({status: 200, body: fakeUsers(query.limit)}));

type Headers = typeof apiResource.users.create.headers;
type Query = typeof apiResource.users.create.query;
type Params = typeof apiResource.users.create.pathParams;

type _Headers = InferZod<Headers>;
type _Query = InferZod<Query>;
type _Params = InferZod<Params>;

export type InferZod<Z extends z.ZodType<unknown> | undefined> =
  Z extends z.ZodType<infer T> ? (IsUnknown<T> extends true ? undefined : T) : undefined;

const users = router(apiResource.users, {
  list,
  create: async ({body, params}) => ({status: 201, body: fakeUser(1, body)}),
  clear: async () => ({status: 200}),
  read: async ({params}) => ({status: 200, body: fakeUser(params.id)}),
  update: async ({params, body}) => ({status: 201, body: fakeUser(params.id, body)}),
  delete: async () => ({status: 200}),
});

export const routerSpec = router(apiResource, {
  users,
});

router(apiResource.users, {
  // @ts-expect-error Missing body.
  list: () => Promise.resolve({status: 200}),
  // @ts-expect-error Wrong function.
  create: list,
  // @ts-expect-error Not a promise.
  clear: () => ({status: 200}),
  // @ts-expect-error Wrong body.
  read: async () => ({status: 200, body: {wrong: ""}}),
  // @ts-expect-error Wrong status.
  update: async ({params, body}) => ({status: 202, body: fakeUser(params.id, body)}),
  // @ts-expect-error Missing status.
  delete: async ({params}) => ({body: {id: params.id, name: "test"}}),
});

function fakeUsers(limit = 10): User[] {
  return Array.from({length: limit}, (_, i) => fakeUser(i));
}

function fakeUser(id: number | string, overwrite?: Partial<User>): User {
  return {id: `${id}`, name: `test-${id}`, ...overwrite};
}
