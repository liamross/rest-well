import {initClient} from "@ts-rest/core";
import {apiBlog} from "../contract/blog";
import {apiNested} from "../contract/nested";

const api = initClient(apiBlog, {
  baseUrl: "http://localhost:4200/api",
  baseHeaders: {},
});

api.createPost({
  body: {},
  headers: {
    // "x-api-key": "key",
  },
});

export default function Page(): JSX.Element {
  return <main>Hello world!</main>;
}
