import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Repeat, Users, Wallet, Settings, LogOut, FileText, FileSignature } from "lucide-react";
import type { ReactNode } from "react";
import logoMark from "@/assets/keshja-business-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", short: "Start", icon: LayoutDashboard, match: [] as string[] },
  { to: "/rechnungen", label: "Rechnungen", short: "Rechnungen", icon: FileText, match: [] as string[] },
  { to: "/angebote", label: "Angebote", short: "Angebote", icon: FileSignature, match: [] as string[] },
  { to: "/finanzen", label: "Einnahmen & Ausgaben", short: "Buchungen", icon: Wallet, match: ["/kassenbons", "/auswertungen"] },
  { to: "/fixkosten", label: "Wiederkehrende Kosten", short: "Fixkosten", icon: Repeat, match: [] as string[] },
  { to: "/kunden", label: "Kunden", short: "Kunden", icon: Users, match: [] as string[] },
  { to: "/einstellungen", label: "Einstellungen", short: "Mehr", icon: Settings, match: [] as string[] },
] as const;

function useActive() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (item: (typeof NAV)[number]) =>
    item.to === "/" ? path === "/" : path.startsWith(item.to) || item.match.some((m) => path.startsWith(m));
}

/** Unterbereiche innerhalb eines Hauptmenüpunkts (z. B. Buchungen / Belege / Berichte). */
export function SectionTabs({ tabs }: { tabs: { to: "/finanzen" | "/kassenbons" | "/auswertungen" | "/rechnungen" | "/angebote"; label: string }[] }) {
  return (
    <div className="section-tabs flex gap-1 overflow-x-auto border-b border-border" aria-label="Unterbereiche">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "shrink-0 whitespace-nowrap border-b-2 border-primary px-4 py-3 text-center text-sm font-semibold text-primary" }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoMark.url}
        alt="KESHJA Logo"
        width={36}
        height={36}
        className="h-9 w-9 object-contain"
      />
      <span className="flex flex-col justify-center gap-0.5 sm:flex-row sm:items-center sm:gap-2 lg:flex-col lg:items-start lg:gap-0.5">
        <span className="font-display text-lg font-semibold leading-tight text-foreground">
          KESHJA
        </span>
        <span className="text-xs leading-tight font-sans font-medium text-muted-foreground">
          BUSINESS
        </span>
      </span>
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header grid min-w-0 grid-cols-1 items-start gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const { data: org } = useOrganization();
  const signOut = useSignOut();
  const isActive = useActive();

  return (
    <div className="business-ui min-h-screen bg-background">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-7 lg:flex">
        <Logo className="px-2" />
        <nav aria-label="Hauptnavigation" className="app-nav mt-10 flex flex-col gap-1.5">
          {NAV.map((item) => {
            const { to, label, icon: Icon } = item;
            return (
            <Link
              key={to}
              to={to}
              className={
                isActive(item)
                  ? "brand-selected flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-sidebar-primary text-sidebar-primary-foreground"
                  : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              {label}
            </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-3">
          {profile ? (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {org?.organization?.name ?? "Kein Unternehmen"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={signOut}
                aria-label="Abmelden"
                title="Abmelden"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <p className="px-3 pt-2 text-xs text-muted-foreground">KESHJA Business</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/90 px-5 backdrop-blur-lg lg:hidden">
        <Logo />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={signOut}
          aria-label="Abmelden"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="app-main mx-auto w-full min-w-0 px-5 pb-28 pt-6 sm:px-8 lg:pb-16 lg:pl-80 lg:pr-16 lg:pt-12">
        {children}
      </main>

      <nav aria-label="Mobile Hauptnavigation" className="mobile-nav app-nav fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-card/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {NAV.map((item) => {
          const { to, short, icon: Icon } = item;
          return (
          <Link
            key={to}
            to={to}
            className={
              isActive(item)
                ? "brand-selected flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-xs font-semibold"
                : "flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-xs font-medium text-muted-foreground"
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            <span className="whitespace-nowrap">{short === "Mehr" ? "Einstellungen" : short}</span>
          </Link>
          );
        })}
      </nav>
    </div>
  );
}