import type {Client} from "@rest-well/core/client";
import {apiResource} from "./playground_schema";

export async function main() {
  const createClient: Client = () => null!;

  const client = createClient(apiResource, {
    baseUrl: "",
    defaultValues: {
      params: {version: "v1" as const},
      headers: {authorization: "123", override: 1},
      routes: {
        users: {
          headers: {override: "hey", "user-header": "test"},
          routes: {
            user: {
              params: {id: "test"},
            },
          },
        },
      },
    },
  });

  // const client = createClient(apiResource, {
  //   headers: {authorization: "test"},
  // });

  // const client = createClient(apiResource);

  const health = await client.healthcheck({});

  const list = await client.users.list({});

  const createUser = await client.users.create({
    headers: {
      "user-header": "test",
      authorization2: "",
    },
    body: {
      name: "test",
    },
  });

  const user = await client.users.user.read({
    headers: {
      "user-header": "test",
    },
  });

  if (user.status === 200) {
    isObject(user.body);
  }

  if (user.status === 401) {
    isString(user.body);
  }

  if (user.status === 404) {
    noBody(user);
  }

  if (user.status === 500) {
    isString(user.body);
  }
}

const noBody = (value: {body?: never; [key: string]: unknown}): value is {body?: never; [key: string]: unknown} => true;
const isObject = (value: object): value is object => true;
const isString = (value: string): value is string => true;
