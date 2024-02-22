import type z from "zod";
import type {BaseContract, BaseRoute, ContentType, ContractOptions, Method, Path, PathParams} from "./contract";
import {contractOptionsKey} from "./contract";

type PathWithParams = {path: string; params: {[key: string]: string}};

/**
 * Match the url to a template path and extract the parameters.
 *
 * @example
 * getPathWithParams("/users/1", ["/users/{id}"]); // {path: "/users/{id}", params: {id: "1"}}
 */
export function getPathWithParams(pathname: string, paths: string[]): PathWithParams | null {
  const matches: PathWithParams[] = [];

  for (const path of paths) {
    const pathParts = path.split("/");
    const urlParts = pathname.split("/");
    if (pathParts.length !== urlParts.length) continue;

    const params: {[key: string]: string} = {};

    let match = true;
    for (let i = 0; i < pathParts.length; i++) {
      const pathPart = pathParts[i]!;
      const urlPart = urlParts[i]!;
      if (pathPart === urlPart) continue;
      if (pathPart.startsWith("{") && pathPart.endsWith("}")) {
        params[pathPart.slice(1, -1)] = urlPart;
        continue;
      }
      match = false;
      break;
    }

    if (match) matches.push({path, params});
  }
  return findBestMatch(matches);
}

function findBestMatch(matches: PathWithParams[]): PathWithParams | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  return matches.sort((a, b) => {
    const aParts = a.path.split("/");
    const bParts = b.path.split("/");

    // For each part of the path, the more static parts (not {}) the better.
    for (let i = 0; i < aParts.length; i++) {
      const aIsVariable = aParts[i]!.startsWith("{");
      const bIsVariable = bParts[i]!.startsWith("{");
      if (aIsVariable !== bIsVariable) return aParts[i]!.includes("{") ? 1 : -1;
    }

    throw new Error(`You have two routes that match the same URL: '${b.path}' and '${a.path}'`);
  })[0]!;
}

export function getAllPaths(contract: BaseContract): string[] {
  const paths: string[] = [];

  const options = contract[contractOptionsKey];
  const basePath = options?.basePath ?? "";

  for (const key in contract) {
    if (key === contractOptionsKey) continue;
    // HACK: Types are complaining here so we ignore them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const route = (contract as any)[key] as BaseRoute | BaseContract;
    if (contractOptionsKey in route) {
      paths.push(...getAllPaths(route).map((r) => basePath + r));
    } else {
      paths.push(basePath + route.path);
    }
  }

  return paths;
}

type RouterLeaf = {
  method: Method;
  path: Path;
  pathParams: z.ZodType<unknown>[];
  query: z.ZodType<unknown>[];
  headers: z.ZodType<unknown>[];
  responses: {[key: number]: z.ZodSchema};
  summary?: string;
  description?: string;
  deprecated?: true;
  body?: z.ZodType<unknown>;
  contentType?: ContentType;
};

export function getRouterLeafs(contract: BaseContract): RouterLeaf[] {
  const leafs: RouterLeaf[] = [];

  const options = contract[contractOptionsKey];
  const {basePath, sharedHeaders, sharedResponses} = options ?? {};

  for (const key in contract) {
    if (key === contractOptionsKey) continue;
    // HACK: Types are complaining here so we ignore them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const route = (contract as any)[key] as BaseRoute | BaseContract;
    if (contractOptionsKey in route) {
      leafs.push(...getAllPaths(route).map((r) => basePath + r));
    } else {
      leafs.push(basePath + route.path);
    }
  }

  return leafs;
}
