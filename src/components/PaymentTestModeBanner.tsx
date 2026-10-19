const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Der produktive Checkout ist nicht konfiguriert. Schließe die Zahlungs-Freischaltung ab, um echte Zahlungen zu akzeptieren.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
        Zahlungen in dieser Vorschau laufen im Testmodus – es wird kein echtes Geld abgebucht.
      </div>
    );
  }
  return null;
}
