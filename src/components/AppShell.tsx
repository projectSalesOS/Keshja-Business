import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Repeat, Users, Wallet, Settings, LogOut, FileText } from "lucide-react";
import type { ReactNode } from "react";
import logoMark from "@/assets/keshja-mark.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";

const NAV = [
  { to: "/", label: "Dashboard", short: "Start", icon: LayoutDashboard, match: [] as string[] },
  { to: "/finanzen", label: "Einnahmen & Ausgaben", short: "Buchungen", icon: Wallet, match: ["/kassenbons", "/auswertungen"] },
  { to: "/rechnungen", label: "Angebote & Rechnungen", short: "Rechnungen", icon: FileText, match: ["/angebote"] },
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
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-medium bg-card text-foreground shadow-card" }}
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
        <span className="font-display text-lg font-semibold leading-tight tracking-[0.18em] text-foreground">
          KESHJA
        </span>
        <span className="hidden sm:flex text-[10px] leading-tight font-sans font-medium tracking-wide text-foreground/70 sm:flex-row sm:items-center sm:gap-2 lg:flex-col lg:items-start lg:gap-0">
          <span className="sm:inline lg:block">Deine Finanzen.</span>
          <span className="sm:inline lg:block">Einfach im Griff.</span>
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
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
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Logo className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
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
              <button
                type="button"
                onClick={signOut}
                aria-label="Abmelden"
                title="Abmelden"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <p className="px-3 pt-1 text-xs text-muted-foreground">KI-Finanzassistent · v1.0</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={signOut}
          aria-label="Abmelden"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pl-72 lg:pr-8 lg:pt-10">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const { to, short, icon: Icon } = item;
          return (
          <Link
            key={to}
            to={to}
            className={
              isActive(item)
                ? "brand-selected flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium bg-sidebar-primary text-sidebar-primary-foreground"
                : "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            <span className="max-w-full truncate px-0.5">{short}</span>
          </Link>
          );
        })}
      </nav>
    </div>
  );
}