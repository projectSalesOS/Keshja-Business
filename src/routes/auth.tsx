import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { notifyRegistration } from "@/lib/notifications.functions";
import type { BillingInterval } from "@/lib/tariffs";
import { ContractNotice } from "@/components/LegalLinks";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): {mode?: "login" | "register"; interval?: BillingInterval | undefined} => ({
    mode: s["mode"] === "register" ? "register" : "login",
    interval: s["interval"] === "monthly" ? "monthly" : s["interval"] === "annual" ? "annual" : undefined,
  }),
  
  head: () => ({
    meta: [
      { title: "Anmelden – KESHJA Business" },
      {
        name: "description",
        content:
          "Melde dich bei KESHJA Business an, um deine Geschäftsfinanzen, Rechnungen und Belege zu verwalten.",
      },
      { property: "og:title", content: "Anmelden – KESHJA Business" },
      {
        property: "og:description",
        content: "Anmelden und Geschäftsfinanzen mit KESHJA Business verwalten.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [interval] = useState<BillingInterval>(search.interval ?? "annual");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setInfo(null);

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() || undefined },
          },
        });
        if (error) throw error;
        // Betreiber über die Neuregistrierung benachrichtigen (duplikatgeschützt, blockiert nie).
        void notifyRegistration({ data: { email: email.trim() } }).catch(() => undefined);
        if (!data.session) {
          setInfo(
            "Fast geschafft: Wir haben dir eine E-Mail geschickt. Bestätige den Link, um dein Konto zu aktivieren.",
          );
          return;
        }
        toast.success("Konto erstellt. Willkommen bei KESHJA!");
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Anmeldung fehlgeschlagen.";
      toast.error(
        message === "Invalid login credentials"
          ? "E-Mail oder Passwort ist nicht korrekt."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      toast.error("Bitte zuerst deine E-Mail-Adresse eintragen.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Wir haben dir eine E-Mail zum Zurücksetzen geschickt.");
  }

  return (
    <main className="business-ui flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-2xl font-semibold">
            {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
               ? "Melde dich bei deinem Unternehmen an."
              : "Erstelle dein KESHJA Business-Konto."}
          </p>
          {mode === "register" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Gewählter Zahlungsrhythmus: {interval === "annual" ? "Jährliche Zahlung" : "Monatliche Zahlung"}
            </p>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
                  Dein Name
                </label>
                <input
                  id="name"
                  className={`mt-1.5 ${inputClass}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Vorname"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                className={`mt-1.5 ${inputClass}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="du@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                className={`mt-1.5 ${inputClass}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
              />
            </div>

            {info && (
              <p className="rounded-xl bg-accent px-3 py-2.5 text-xs text-accent-foreground">
                {info}
              </p>
            )}

            {mode === "register" && <ContractNotice registration />}
            <Button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Anmelden" : "Konto erstellen"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-center text-xs text-muted-foreground">
            {mode === "login" && (
              <button type="button" className="hover:text-foreground" onClick={handleReset}>
                Passwort vergessen?
              </button>
            )}
            <button
              type="button"
              className="font-medium text-primary"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setInfo(null);
              }}
            >
              {mode === "login"
                ? "Noch kein Konto? Jetzt registrieren"
                : "Ich habe bereits ein Konto – anmelden"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
