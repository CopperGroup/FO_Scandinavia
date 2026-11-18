import { cache } from "react";
import { getSetting } from "@/lib/content/server";
import { POLICIES_KEY, cleanPolicies, type StorePolicies } from "@/lib/policies";

/** The return and delivery terms as saved in the admin, or the defaults while nothing is saved. */
export const getStorePolicies = cache(async (): Promise<StorePolicies> => cleanPolicies((await getSetting(POLICIES_KEY))?.values).policies);

/** The same for the admin form, with who saved last and when. */
export async function getPoliciesForEditor(): Promise<{ policies: StorePolicies; saved: boolean; updatedAt: string | null; updatedBy: string }> {
  const stored = await getSetting(POLICIES_KEY);
  return { policies: cleanPolicies(stored?.values).policies, saved: Boolean(stored), updatedAt: stored?.updatedAt ?? null, updatedBy: stored?.updatedBy ?? "" };
}
