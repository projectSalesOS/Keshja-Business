import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { analyzeReceipt } from "@/lib/receipts.functions";
import { diffTraces, type ReceiptTrace } from "@/lib/receipt-trace";

export const Route = createFileRoute("/_authenticated/debug/ocr")({
  component: OcrDebugPage,
  head: () => ({
    meta: [
      { title: "OCR-Vergleich | Cashya" },
      {
        name: "description",
        content:
          "Internes Werkzeug: dasselbe Bonfoto mehrfach analysieren und die Ergebnisse der Läufe vergleichen.",
      },
      { property: "og:title", content: "OCR-Vergleich | Cashya" },
      {
        property: "og:description",
        content: "Wiederholungsläufe derselben Bonaufnahme direkt gegenüberstellen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Das Foto konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

function OcrDebugPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzeReceipt);
  const [runs, setRuns] = useState<ReceiptTrace[]>([]);
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(3);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setRuns([]);
    try {
      const imageDataUrl = await readAsDataUrl(file);
      const collected: ReceiptTrace[] = [];
      for (let i = 0; i < count; i += 1) {
        const result = await analyze({ data: { imageDataUrl } });
        collected.push(result.trace);
        setHash(result.imageSha256);
        setRuns([...collected]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setBusy(false);
    }
  };

  const diff = runs.length > 1 ? diffTraces(runs) : null;

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">OCR-Vergleich</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Dasselbe Bonfoto mehrfach analysieren und die Läufe direkt vergleichen. Abweichende Werte
        sind rot markiert.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">
          Läufe
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="ml-2 rounded-lg border border-border bg-background px-2 py-1 text-sm"
          >
            {[2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Bonfoto auswählen
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {hash ? (
          <span className="text-xs text-muted-foreground">Bild-Prüfsumme: {hash.slice(0, 16)}…</span>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {diff ? (
        <div className="mt-6 space-y-6">
          <section className="overflow-x-auto rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Kennzahlen je Lauf</h2>
            <table className="w-full text-sm">
              <tbody>
                {diff.fields.map((row) => (
                  <tr key={row.field} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{row.field}</td>
                    {row.values.map((value, i) => (
                      <td
                        key={i}
                        className={`py-2 pr-4 tabular-nums ${row.differs ? "font-semibold text-destructive" : ""}`}
                      >
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="overflow-x-auto rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Positionen je Lauf</h2>
            <table className="w-full text-sm">
              <tbody>
                {diff.lines.map((row) => (
                  <tr key={row.name} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4">{row.name}</td>
                    {row.values.map((value, i) => (
                      <td
                        key={i}
                        className={`py-2 pr-4 tabular-nums ${row.differs ? "font-semibold text-destructive" : ""}`}
                      >
                        {value ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}