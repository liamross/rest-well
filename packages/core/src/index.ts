import z from "zod";
import {contract, createRouter} from "./contract";

const userSchema = z.object({id: z.string()});

const usersContract = contract(
  ({GET, POST, DELETE}) => ({
    getUser: GET("/{id}", {
      pathParams: userSchema,
      responses: {200: userSchema},
    }),
    createUser: POST({
      body: userSchema,
      responses: {201: userSchema},
    }),
    deleteUser: DELETE("/{id}", {
      pathParams: userSchema,
      responses: {200: userSchema},
    }),
  }),
  {basePath: "/users"},
);

const apiContract = contract(
  () => ({
    users: usersContract,
  }),
  {
    basePath: "/api/{version}",
    pathParams: z.object({
      version: z.literal("v1"),
    }),
  },
);

const usersRoute = createRouter(usersContract, {
  getUser: () => Promise.resolve({status: 200, body: {id: "1"}}),
  createUser: () => Promise.resolve({status: 201, body: {id: "1"}}),
  deleteUser: async () => Promise.resolve({status: 200, body: {id: "1"}}),
});

const apiRoute = createRouter(apiContract, {
  users: usersRoute,
});
