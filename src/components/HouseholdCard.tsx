import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Home, Loader2, LogOut, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_QUERY_KEY, useProfile } from "@/hooks/useProfile";
import { RECEIPTS_QUERY_KEY } from "@/hooks/useReceipts";

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function HouseholdCard() {
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | "leave" | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
  }

  async function handleCreate() {
    setBusy("create");
    const { error } = await supabase.rpc("create_household", { _name: name.trim() || "Haushalt" });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    await refresh();
    toast.success("Haushalt erstellt. Teile den Einladungscode.");
  }

  async function handleJoin() {
    setBusy("join");
    const { error } = await supabase.rpc("join_household", { _code: code.trim() });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCode("");
    await refresh();
    toast.success("Du bist dem Haushalt beigetreten.");
  }

  async function handleLeave() {
    setBusy("leave");
    const { error } = await supabase.rpc("leave_household");
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Du nutzt KESHJA wieder als Einzelkonto.");
  }

  if (isLoading || !profile) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-6 shadow-card">
        <p className="text-sm text-muted-foreground">Haushalt wird geladen …</p>
      </div>
    );
  }

  const household = profile.household;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Gemeinsamer Haushalt</h2>
      </div>

      {household ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium">{household.name}</p>
            <p className="text-xs text-muted-foreground">
              {household.memberCount} {household.memberCount === 1 ? "Mitglied" : "Mitglieder"} ·
              Neue Kassenbons sind für alle Mitglieder sichtbar.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Einladungscode</p>
              <p className="font-mono text-base font-semibold tracking-widest text-accent-foreground">
                {household.inviteCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(household.inviteCode);
                toast.success("Code kopiert.");
              }}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Einladungscode kopieren"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleLeave}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy === "leave" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Haushalt verlassen
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <p className="text-sm text-muted-foreground">
            Optional: Lege einen gemeinsamen Haushalt an oder tritt mit einem Einladungscode bei.
            Ohne Haushalt bleiben alle Kassenbons privat.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="household-name">
              Haushalt erstellen
            </label>
            <div className="flex gap-2">
              <input
                id="household-name"
                className={inputClass}
                placeholder="z. B. Zuhause"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy !== null}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy === "create" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Home className="h-4 w-4" />
                )}
                Erstellen
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="household-code">
              Mit Einladungscode beitreten
            </label>
            <div className="flex gap-2">
              <input
                id="household-code"
                className={`${inputClass} font-mono uppercase tracking-widest`}
                placeholder="ABCD1234"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={busy !== null || code.trim().length < 4}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                {busy === "join" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Beitreten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
