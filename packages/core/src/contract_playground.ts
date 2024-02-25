import z from "zod";
import {resource} from "./contract_v3";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const usersResource = resource("/users", ({GET, POST, DELETE}) => ({
  getUsers: GET({
    responses: {200: z.array(userSchema)},
  }),
  getUser: GET("/{id}", {
    pathParams: z.object({
      id: z.string(),
    }),
    responses: {200: userSchema},
  }),
  createUser: POST({
    body: userSchema.omit({id: true}),
    responses: {201: userSchema},
  }),
  deleteUser: DELETE("/{id}", {
    pathParams: userSchema,
    responses: {200: userSchema},
  }),
}));
