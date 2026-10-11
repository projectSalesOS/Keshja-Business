import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_QUERY_KEY, useProfile } from "@/hooks/useProfile";
import { useSignOut } from "@/components/AppShell";

export function AccountCard() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.displayName);
  }, [profile]);

  async function handleSave() {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null })
      .eq("id", profile.userId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    toast.success("Name gespeichert.");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Dein Konto</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{profile?.email ?? "…"}</p>

      <div className="mt-4 flex gap-2">
        <input
          aria-label="Anzeigename"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !profile}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Speichern
        </button>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
      >
        <LogOut className="h-4 w-4" /> Abmelden
      </button>
    </div>
  );
}
