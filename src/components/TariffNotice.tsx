import { Link } from "@tanstack/react-router";
export function TariffNotice({ feature }: { feature: string }) {
  return (
    <p className="rounded-lg border border-primary/15 bg-accent/40 p-3 text-sm text-muted-foreground">
      {feature} ist im Premium-Tarif verfügbar.{" "}
      <Link to="/tarif" className="font-medium text-primary">
        Tarif ansehen
      </Link>
    </p>
  );
}
