/**
 * UI-side facade over src/core/api.ts. In normal runs every call goes to the real core.
 * In dev with `?mock`, src/ui/dev/mockApi.ts overrides functions (see main.tsx).
 */
import * as real from "@/core/api";

export type Api = typeof real;
export type { Bill, ReviewEntry, ReviewIssue } from "@/core/api";
export const api: Api = { ...real };
export let mockMode = false;

export function installMock(overrides: Partial<Api>) {
  mockMode = true;
  Object.assign(api, overrides);
}
