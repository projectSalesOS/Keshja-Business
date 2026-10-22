import { Calculator, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/OrgGate";
import { currency } from "@/lib/finance";
import { validateVat, vatFromGross, vatTotals, type VatRow } from "@/lib/receipt-vat";

export function ReceiptVatEditor({ rows, total, onChange }: { rows: VatRow[]; total: number; onChange: (rows: VatRow[]) => void }) {
  const error = validateVat(rows, total);
  const totals = vatTotals(rows);
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="text-sm font-semibold">Umsatzsteuer</h3>
    {!rows.length && <p className="text-xs text-muted-foreground">Keine Umsatzsteuerangaben vorhanden.</p>}
    {rows.map((row, index) => <div key={index} className="grid grid-cols-2 gap-2">
      {([['rate', 'Steuersatz (%)'], ['net', 'Netto (€)'], ['tax', 'Steuer (€)'], ['gross', 'Brutto (€)']] as const).map(([key, label]) => <label key={key} className="text-xs text-muted-foreground">{label}<input aria-label={`${label} ${index + 1}`} className={`${inputClass} mt-1`} type="number" step="0.01" value={row[key]} onChange={(e) => onChange(rows.map((r, i) => i === index ? { ...r, [key]: Number(e.target.value) } : r))} /></label>)}
      {row.group && <p className="col-span-2 text-xs text-muted-foreground">Steuergruppe {row.group}</p>}
      <Button type="button" variant="outline" size="sm" className="col-span-2" aria-label={`Netto und Steuer aus Brutto berechnen ${index + 1}`} onClick={() => onChange(rows.map((r, i) => i === index ? { ...r, ...vatFromGross(r.gross, r.rate) } : r))}><Calculator /> Netto / Steuer aus Brutto</Button>
      <Button type="button" variant="ghost" size="sm" aria-label={`Steuersatz ${index + 1} entfernen`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 /> Entfernen</Button>
    </div>)}
    {rows.length > 0 && <dl className="grid grid-cols-2 gap-1 text-sm"><dt>Netto gesamt</dt><dd className="text-right">{currency(totals.net)}</dd><dt>Steuer gesamt</dt><dd className="text-right">{currency(totals.tax)}</dd><dt>Brutto gesamt</dt><dd className="text-right">{currency(totals.gross)}</dd></dl>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Button type="button" variant="outline" size="sm" disabled={rows.length >= 20} onClick={() => onChange([...rows, { rate: 19, net: 0, tax: 0, gross: 0 }])}><Plus /> Steuersatz hinzufügen</Button>
  </section>;
}