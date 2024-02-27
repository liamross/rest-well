import {createClient} from "./client";
import {usersResource} from "./playground_resource";

const client = createClient(usersResource);

export async function main() {
  const user = await client.read({
    params: {id: "test"},
  });

  if (user.status === 200) {
    user.body;
  }
}
