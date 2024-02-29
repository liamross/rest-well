import {createClient} from "./client";
import {apiResource} from "./playground_resource";

const client = createClient(apiResource);

export async function main() {
  const user = await client.users.read({
    params: {id: "test", version: "v1"},
  });

  if (user.status === 200) {
    isObject(user.body);
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
