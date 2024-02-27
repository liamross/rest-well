import z from "zod";
import {resource} from "./resource";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type User = z.infer<typeof userSchema>;

const pathParams = userSchema.pick({id: true});

const upsertUserBody = userSchema.omit({id: true});

export const usersResource = resource("/users", ({GET, POST, PATCH, DELETE}) => ({
  list: GET({
    responses: {200: z.array(userSchema)},
    query: z.object({limit: z.number().optional()}),
  }),
  create: POST({
    body: upsertUserBody,
    responses: {201: userSchema},
  }),
  clear: DELETE({
    responses: {200: z.undefined()},
  }),
  read: GET("/{id}", {
    pathParams,
    responses: {200: userSchema, 404: z.undefined()},
  }),
  update: PATCH("/{id}", {
    pathParams,
    body: upsertUserBody.partial(),
    responses: {201: userSchema},
  }),
  delete: DELETE("/{id}", {
    pathParams,
    responses: {200: z.void()},
  }),
}));
