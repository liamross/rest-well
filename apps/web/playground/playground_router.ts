import type {Router} from "@rest-well/core";
import type {Team, User} from "./playground_schema";
import {apiResource} from "./playground_schema";

const router: Router = () => {
  throw new Error("Not implemented");
};

const list = router(apiResource.users.list, async ({query}) => ({status: 200, body: fakeUsers(query.limit)}));

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
  clear: async () => ({status: 200}),
});

export const routerSpec = router(apiResource, {
  users,
  teams,
});

router(apiResource, {
  teams,
  users: router(apiResource.users, {
    // @ts-expect-error Missing body.
    list: () => Promise.resolve({status: 200}),
    // @ts-expect-error Wrong function.
    create: list,
    // @ts-expect-error Not a promise.
    clear: () => ({status: 200}),

    user: router(apiResource.users.user, {
      // @ts-expect-error Wrong body.
      read: async () => ({status: 200, body: {wrong: ""}}),
      // @ts-expect-error Wrong status.
      update: async ({params, body}) => ({status: 202, body: fakeUser(params.id, body)}),
      // @ts-expect-error Missing status.
      delete: async ({params}) => ({body: {id: params.id, name: "test"}}),
    }),
  }),
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
