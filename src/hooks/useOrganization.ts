import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const ORG_QUERY_KEY = ["organization"] as const;

export type OrgRole = Database["public"]["Enums"]["org_role"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrgMember = { id: string; userId: string; role: OrgRole; displayName: string };

export type OrgState = {
  userId: string;
  organization: Organization | null;
  role: OrgRole | null;
  members: OrgMember[];
};

async function fetchOrg(): Promise<OrgState | null> {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  // Aktive Organisation, sonst erste Mitgliedschaft.
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);
  const own = memberships ?? [];
  const active =
    own.find((m) => m.organization_id === profile?.active_organization_id) ?? own[0] ?? null;
  if (!active) return { userId: user.id, organization: null, role: null, members: [] };

  const [{ data: org }, { data: rows }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", active.organization_id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("id, user_id, role")
      .eq("organization_id", active.organization_id)
      .order("created_at"),
  ]);
  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]));

  return {
    userId: user.id,
    organization: org ?? null,
    role: active.role,
    members: (rows ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role,
      displayName: names.get(r.user_id) || "Mitglied",
    })),
  };
}

export function useOrganization() {
  return useQuery({ queryKey: ORG_QUERY_KEY, queryFn: fetchOrg, staleTime: 60_000 });
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Inhaber",
  admin: "Admin",
  member: "Mitarbeiter",
};
