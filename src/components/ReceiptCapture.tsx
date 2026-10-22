import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BEREICHE } from "@/lib/categories";
import {
  FALLBACK_CATEGORY,
  FALLBACK_SUBCATEGORY,
  type ParsedItem,
  type ParsedReceipt,
} from "@/lib/receipt-schema";
import { analyzeReceipt, saveReceipt } from "@/lib/receipts.functions";
import { checkReceipt, isDepositItem } from "@/lib/receipt-check";
import { RECEIPTS_QUERY_KEY } from "@/hooks/useReceipts";
import { ReceiptVatEditor } from "@/components/ReceiptVatEditor";
import { validateVat } from "@/lib/receipt-vat";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Das Foto konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Unbekannter Fehler. Bitte erneut versuchen.";

export function ReceiptCapture({
  autoStart = false,
  organizationId,
}: {
  autoStart?: boolean;
  organizationId: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const scanRequest = useRef<{file: File; id: string} | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<ParsedReceipt | null>(null);
  const [saving, setSaving] = useState(false);

  const analyze = useServerFn(analyzeReceipt);
  const save = useServerFn(saveReceipt);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (autoStart) cameraRef.current?.click();
  }, [autoStart]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setWarnings([]);
    if (file.size > MAX_BYTES) {
      setError("Das Foto ist zu groß (max. 8 MB). Bitte ein kleineres Bild verwenden.");
      return;
    }
    setLoading(true);
    try {
      const imageDataUrl = await readAsDataUrl(file);
      if(scanRequest.current?.file !== file) scanRequest.current = {file,id:crypto.randomUUID()};
      const result = await analyze({ data: { imageDataUrl, organizationId, requestId: scanRequest.current.id } });
      await queryClient.invalidateQueries({queryKey:["tariff",organizationId]});
      setDraft(result.receipt);
      setWarnings(result.warnings);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<ParsedItem>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
          }
        : current,
    );
  };

  const check = useMemo(() => (draft ? checkReceipt(draft) : null), [draft]);
  const vatError = draft ? validateVat(draft.vatBreakdown ?? [], draft.total) : null;
  const suspectMap = useMemo(
    () => new Map((check?.suspects ?? []).map((s) => [s.index, s])),
    [check],
  );

  const onSave = async () => {
    if (!draft) return;
    const vatError = validateVat(draft.vatBreakdown ?? [], draft.total);
    if (vatError) { setError(vatError); return; }
    setSaving(true);
    setError(null);
    try {
      if (!organizationId) throw new Error("Bitte zuerst ein Unternehmen anlegen oder beitreten.");
      await save({ data: { organizationId, receipt: draft } });
      await queryClient.invalidateQueries({ queryKey: RECEIPTS_QUERY_KEY });
      toast.success("Beleg gespeichert. Unter Belege kannst du ihn als Ausgabe buchen.");
      setDraft(null);
      setWarnings([]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-card transition-opacity hover:opacity-90"
        >
          <Camera className="h-5 w-5" /> Kassenbon fotografieren
        </button>
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-4 text-sm font-semibold text-card-foreground shadow-card transition-colors hover:bg-accent"
        >
          <Upload className="h-5 w-5" /> Foto aus Galerie wählen
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-accent px-4 py-3 text-sm text-accent-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Kassenbon wird analysiert …
        </p>
      ) : null}

      {error && !draft ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="mt-2 text-sm font-semibold underline"
          >
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-elevated sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Ergebnis prüfen</h2>
                <p className="text-xs text-muted-foreground">
                  Alle Werte können vor dem Speichern korrigiert werden.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Schließen"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {warnings.length > 0 ? (
              <ul className="mt-4 space-y-1 rounded-xl border border-border bg-accent px-4 py-3 text-xs text-accent-foreground">
                {warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Händler
                <input
                  value={draft.merchant}
                  onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Datum
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Uhrzeit
                <input
                  type="time"
                  value={draft.time ?? ""}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Gesamtbetrag (€)
                <input
                  type="number"
                  step="0.01"
                  value={draft.total}
                  onChange={(e) => setDraft({ ...draft, total: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            {check ? (
              <div className="mt-3 space-y-1 text-xs">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-border bg-accent/40 px-3 py-2 text-muted-foreground">
                  <dt>Warenwert</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    {check.goodsTotal.toFixed(2)} €
                  </dd>
                  <dt>Pfand</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    {check.depositTotal.toFixed(2)} €
                  </dd>
                  <dt>Rabatt</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    −{check.discountTotal.toFixed(2)} €
                  </dd>
                  <dt className="font-semibold text-foreground">Zahlbetrag</dt>
                  <dd className="text-right font-semibold tabular-nums text-foreground">
                    {draft.total.toFixed(2)} €
                  </dd>
                </dl>
                {check.status === "ok" ? (
                  <p className="flex items-center gap-1.5 font-medium text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Warenwert + Pfand − Rabatt ergibt den
                    Zahlbetrag.
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-medium text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{check.message}</span>
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-4"><ReceiptVatEditor rows={draft.vatBreakdown ?? []} total={draft.total} onChange={(vatBreakdown) => setDraft({ ...draft, vatBreakdown })} /></div>
            <ul className="mt-4 space-y-4">
              {draft.items.map((item, index) => {
                const bereich = BEREICHE.find((b) => b.name === item.category) ?? BEREICHE[0]!;
                const suspect = suspectMap.get(index);
                return (
                  <li
                    key={index}
                    className={`rounded-xl border p-3 ${
                      suspect ? "border-destructive/60 bg-destructive/5" : "border-border"
                    }`}
                  >
                    <div className="flex gap-2">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(index, { name: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                        className={`w-24 rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring ${
                          suspect ? "border-destructive text-destructive" : "border-border"
                        }`}
                      />
                      <button
                        type="button"
                        aria-label="Position löschen"
                        onClick={() =>
                          setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) })
                        }
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {suspect ? (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {suspect.reason}
                        {suspect.suggestedPrice != null ? (
                          <button
                            type="button"
                            onClick={() => updateItem(index, { price: suspect.suggestedPrice! })}
                            className="rounded-md border border-destructive/50 px-2 py-0.5 font-medium transition-colors hover:bg-destructive/10"
                          >
                            {suspect.suggestedPrice.toFixed(2)} € übernehmen
                          </button>
                        ) : null}
                      </p>
                    ) : null}
                    {isDepositItem(item.name) ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Pfandposition – wird nicht als Rabatt verrechnet.
                      </p>
                    ) : null}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const next = BEREICHE.find((b) => b.name === e.target.value)!;
                          updateItem(index, {
                            category: next.name,
                            subcategory: next.kategorien[0]!,
                          });
                        }}
                        className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      >
                        {BEREICHE.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.subcategory}
                        onChange={(e) => updateItem(index, { subcategory: e.target.value })}
                        className="rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      >
                        {bereich.kategorien.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  items: [
                    ...draft.items,
                    {
                      name: "Neue Position",
                      quantity: 1,
                      price: 0,
                      originalPrice: null,
                      discount: 0,
                      discountKind: null,
                      category: FALLBACK_CATEGORY,
                      subcategory: FALLBACK_SUBCATEGORY,
                      kind: "product" as const,
                    },
                  ],
                })
              }
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> Position hinzufügen
            </button>

            <div className="mt-5 flex gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                Verwerfen
              </button>
              <Button
                type="button"
                onClick={() => void onSave()}
                disabled={saving || draft.items.length === 0 || !!vatError}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Speichern
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}