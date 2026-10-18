import { Link } from "@tanstack/react-router";
import { Building2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { useOrganization, type OrgRole } from "@/hooks/useOrganization";

export type OrgContext = { orgId: string; role: OrgRole; userId: string; isAdmin: boolean };

/** Zeigt Inhalte nur mit aktivem Unternehmen, sonst Aufforderung zum Anlegen/Beitreten. */
export function OrgGate({ children }: { children: (ctx: OrgContext) => ReactNode }) {
  const { data, isLoading, error } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground shadow-card">
        <Loader2 className="h-4 w-4 animate-spin" /> Unternehmen wird geladen …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-card px-5 py-6 text-sm text-destructive shadow-card">
        Unternehmensdaten konnten nicht geladen werden. Bitte Seite neu laden.
      </div>
    );
  }
  if (!data?.organization || !data.role) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center shadow-card">
        <Building2 className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 text-base font-semibold">Noch kein Unternehmen</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Lege dein Unternehmen an oder tritt mit einem Einladungscode bei, um Kunden, Finanzen
          und Belege zu verwalten.
        </p>
        <Link
          to="/einstellungen"
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Zu den Einstellungen
        </Link>
      </div>
    );
  }
  return (
    <>
      {children({
        orgId: data.organization.id,
        role: data.role,
        userId: data.userId,
        isAdmin: data.role === "owner" || data.role === "admin",
      })}
    </>
  );
}

export const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 shadow-elevated sm:rounded-xl sm:p-7"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
