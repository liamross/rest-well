/* eslint-disable @typescript-eslint/require-await */
import type {Team, User} from "./schema";
import {router} from "../../";
import {apiResource} from "./schema";

const list = router(apiResource.users.list, async ({query}) => ({
  status: 200,
  body: fakeUsers(query.limit),
  headers: {total: 5},
}));

const user = router(apiResource.users.user, {
  read: async ({headers}) => ({status: 401, body: `${headers.authorization} is invalid`}),
  update: async ({params, body}) => ({status: 201, body: fakeUser(params.id, body)}),
  delete: async () => ({status: 200}),
});

const users = router(apiResource.users, {
  user,
  list,
  create: async ({body}) => ({status: 201, body: fakeUser(1, body)}),
  clear: async () => ({status: 200}),
});

const teams = router(apiResource.teams, {
  create: async ({body}) => ({status: 201, body: fakeTeam(1, body)}),
  clear: async ({params}) => ({status: 200, body: params.id}),
});

export const api = router(apiResource, {
  healthcheck: async () => ({status: 200, body: {status: "ok"}}),
  users,
  teams,
});

function fakeUsers(limit = 10): User[] {
  return Array.from({length: limit}, (_, i) => fakeUser(i));
}

function fakeUser(id: number | string, overwrite?: Partial<User>): User {
  return {id: `${id}`, name: `test-${id}`, ...overwrite};
}

function fakeTeam(id: number | string, overwrite?: Partial<Team>): Team {
  return {id: `${id}`, type: "free", ...overwrite};
}
