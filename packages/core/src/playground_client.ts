import {createClient} from "./client";
import {usersResource} from "./playground_resource";

const client = createClient(usersResource);

export async function main() {
  const user = await client.update({
    params: {id: "test"},
    body: {name: "test"},
  });

  if (user.status === 201) {
    user.body;
  }

  if (user.status === 404) {
    user.body;
  }
}
