import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Repeat, Users, Wallet, Settings, LogOut, FileText, FileSignature, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import logoMark from "@/assets/keshja-business-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Dashboard", tone: "brand", icon: LayoutDashboard, match: [] as string[] },
  { to: "/rechnungen", label: "Rechnungen", tone: "blue", icon: FileText, match: [] as string[] },
  { to: "/angebote", label: "Angebote", tone: "orange", icon: FileSignature, match: [] as string[] },
  { to: "/finanzen", label: "Einnahmen & Ausgaben", tone: "income", icon: Wallet, match: ["/kassenbons", "/auswertungen"] },
  { to: "/fixkosten", label: "Wiederkehrende Kosten", tone: "expense", icon: Repeat, match: [] as string[] },
  { to: "/kunden", label: "Kunden", tone: "amber", icon: Users, match: [] as string[] },
  { to: "/einstellungen", label: "Einstellungen", tone: "neutral", icon: Settings, match: [] as string[] },
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
        <span className="whitespace-nowrap text-xs leading-tight font-sans font-medium text-muted-foreground">
          Super. Easy. Business.
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

export function AppShell({ children }: { children: ReactNode; dashboard?: boolean }) {
  const { data: profile } = useProfile();
  const { data: org } = useOrganization();
  const signOut = useSignOut();
  const isActive = useActive();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="business-ui min-h-screen bg-background">
      <header className="sticky top-0 z-20 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/90 px-5 backdrop-blur-lg">
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

      <main className="app-main mx-auto w-full min-w-0 px-5 pb-28 pt-6 sm:px-8 lg:px-16 lg:pt-12">
        {children}
      </main>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button type="button" size="icon" className="navigation-trigger" aria-label="Menü öffnen" title="Menü öffnen">
            <Menu size={25} strokeWidth={1.75} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="navigation-drawer" overlayClassName="navigation-overlay" closeLabel="Menü schließen" aria-describedby={undefined}>
          <SheetTitle className="sr-only">KESHJA Business – Navigation</SheetTitle>
          <div className="navigation-heading"><Logo /></div>
          <nav aria-label="Hauptnavigation" className="navigation-list">
            {NAV.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className="navigation-link" onClick={() => setMenuOpen(false)}>
                <span className={`navigation-icon navigation-icon-${item.tone}`}><Icon size={21} strokeWidth={1.75} /></span>
                <span>{item.label}</span>
              </Link>;
            })}
          </nav>
          <div className="navigation-account">
            {profile && <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.displayName}</p><p className="truncate text-xs text-muted-foreground">{org?.organization?.name ?? "Kein Unternehmen"}</p></div>}
            <Button variant="ghost" onClick={() => { setMenuOpen(false); void signOut(); }} className="w-full justify-start"><LogOut size={18} />Abmelden</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}