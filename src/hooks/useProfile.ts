import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export type Profile = {
  userId: string;
  email: string;
  displayName: string;
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
    .select("display_name")
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

  return { userId: user.id, email, displayName };
}

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 60_000,
  });
}
