/* eslint-disable @typescript-eslint/require-await */
import type z from "zod";
import type {User} from "./playground_resource";
import {usersResource} from "./playground_resource";
import {route, router} from "./router";

const list = route(usersResource.list, async ({query}) => {
  return {status: 200, body: fakeUsers(query.limit)};
});

export const correct = router(usersResource, {
  list,
  create: async ({body}) => ({status: 201, body: fakeUser(1, body)}),
  clear: async () => ({status: 200}),
  read: async ({params}) => ({status: 200, body: fakeUser(params.id)}),
  update: async ({params, body}) => ({status: 201, body: fakeUser(params.id, body)}),
  delete: async () => ({status: 200}),
});

export const wrong = router(usersResource, {
  // @ts-expect-error Missing body.
  list: () => Promise.resolve({status: 200}),
  // @ts-expect-error Wrong function.
  create: list,
  // @ts-expect-error Not a promise.
  clear: () => ({status: 200}),
  // (not happening right now) @ts-expect-error Incorrect property in body.
  read: async ({params}) => ({status: 200, body: {wrong: "", ...fakeUser(params.id)}}),
  // (not happening right now) @ts-expect-error Incorrect property in response.
  update: async ({params, body}) => ({status: 201, wrong: "", body: fakeUser(params.id, body)}),
  // @ts-expect-error Missing status.
  delete: async ({params}) => ({body: {id: params.id, name: "test"}}),
});

function fakeUsers(limit = 10): z.infer<(typeof usersResource.list.responses)[200]> {
  return Array.from({length: limit}, (_, i) => fakeUser(i));
}

function fakeUser(id: number | string, overwrite?: Partial<User>): User {
  return {id: `${id}`, name: `test-${id}`, ...overwrite};
}
