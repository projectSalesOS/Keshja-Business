import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberCount: number;
};

export type Profile = {
  userId: string;
  email: string;
  displayName: string;
  householdId: string | null;
  household: Household | null;
};

/** Fallback name from the email address, e.g. "finn.meyer@…" → "Finn Meyer". */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "Nutzer";
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
    .slice(0, 40);
}

async function fetchProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, household_id")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const metaName =
    (user.user_metadata?.["display_name"] as string | undefined) ??
    (user.user_metadata?.["full_name"] as string | undefined) ??
    (user.user_metadata?.["name"] as string | undefined);

  const displayName =
    (row?.display_name as string | null | undefined)?.trim() ||
    metaName?.trim() ||
    nameFromEmail(email);

  const householdId = (row?.household_id as string | null | undefined) ?? null;
  let household: Household | null = null;

  if (householdId) {
    const { data: h } = await supabase
      .from("households")
      .select("id, name, invite_code, owner_id")
      .eq("id", householdId)
      .maybeSingle();
    if (h) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId);
      household = {
        id: h.id as string,
        name: h.name as string,
        inviteCode: h.invite_code as string,
        ownerId: h.owner_id as string,
        memberCount: count ?? 1,
      };
    }
  }

  return { userId: user.id, email, displayName, householdId, household };
}

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 60_000,
  });
}
