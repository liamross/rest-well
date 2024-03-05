import {DELETE, GET, PATCH, POST, schema} from "@rest-well/core";
import z from "zod";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type User = z.infer<typeof userSchema>;
const upsertUserBody = userSchema.omit({id: true});

const teamSchema = z.object({
  id: z.string(),
  type: z.enum(["free", "pro", "enterprise"]),
});
export type Team = z.infer<typeof teamSchema>;
const upsertTeamBody = teamSchema.omit({id: true});

const user = schema("/{id}", {
  pathParams: userSchema.pick({id: true}),
  sharedResponses: {404: z.object({message: z.string()})},

  routes: {
    read: GET({
      responses: {200: userSchema, 404: z.undefined()},
    }),
    update: PATCH({
      body: upsertUserBody.partial(),
      responses: {201: userSchema},
    }),
    delete: DELETE({
      responses: {200: z.void()},
    }),
  },
});

const users = schema("/users", {
  routes: {
    user,
    list: GET({
      responses: {200: z.array(userSchema)},
      query: z.object({limit: z.number().optional()}),
    }),
    create: POST({
      headers: z.object({authorization2: z.string()}),
      query: z.object({test: z.string().optional()}),
      body: upsertUserBody,
      responses: {201: userSchema},
    }),
    clear: DELETE({
      responses: {200: z.undefined()},
    }),
  },
});

const teams = schema("/teams", {
  routes: {
    create: POST({
      body: upsertTeamBody,
      responses: {201: teamSchema},
    }),
    clear: DELETE({
      responses: {200: z.undefined()},
    }),
  },
});

export const apiResource = schema("/api/{version}", {
  pathParams: z.object({version: z.literal("v1")}),
  sharedResponses: {500: z.string(), 401: z.string()},
  sharedHeaders: z.object({authorization: z.string()}),

  routes: {
    users,
    teams,
  },
});
