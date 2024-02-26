import z from "zod";
import {resource} from "./resource";
import {route, router} from "./router";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const pathParams = userSchema.pick({id: true});

const upsertUserBody = userSchema.omit({id: true});

const usersResource = resource("/users", ({GET, POST, PATCH, DELETE}) => ({
  list: GET({
    responses: {200: z.array(userSchema)},
  }),
  create: POST({
    body: upsertUserBody,
    responses: {201: userSchema},
  }),
  clear: DELETE({
    responses: {200: z.void()},
  }),
  read: GET("/{id}", {
    pathParams,
    responses: {200: userSchema},
  }),
  update: PATCH("/{id}", {
    pathParams,
    body: upsertUserBody.partial(),
    responses: {201: userSchema},
  }),
  delete: DELETE("/{id}", {
    pathParams,
    responses: {200: userSchema},
  }),
}));

const list = route(usersResource.list, async () => {
  return {status: 200, body: [{id: "1", name: "test"}]};
});

export const correct = router(usersResource, {
  list,
  create: async ({body}) => Promise.resolve({status: 201, body: {id: "1", ...body}}),
  clear: async () => Promise.resolve({status: 200, body: undefined}),
  read: async ({params}) => Promise.resolve({status: 200, body: {id: params.id, name: "test"}}),
  update: async ({body}) => Promise.resolve({status: 201, body: {id: "1", name: "test", ...body}}),
  delete: async ({params}) => Promise.resolve({status: 200, body: {id: params.id, name: "test"}}),
});

export const wrong = router(usersResource, {
  //@ts-expect-error Expected errors here.
  list: () => ({status: 201, body: undefined}),
  //@ts-expect-error Expected errors here.
  create: list,
  //@ts-expect-error Expected errors here.
  clear: () => ({status: 200, body: undefined}),
  //@ts-expect-error Expected errors here.
  read: async ({params}) => ({status: 201, body: {id: params.id, name: "test", wrong: ""}}),
  //@ts-expect-error Expected errors here.
  update: async ({body}) => ({status: 201, body: {name: "test", ...body}}),
  //@ts-expect-error Expected errors here.
  delete: async ({params}) => ({body: {id: params.id, name: "test"}}),
});
