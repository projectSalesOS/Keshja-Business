import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Field, Modal, btnPrimary, btnSecondary, inputClass } from "@/components/OrgGate";
import {
  useCustomers,
  useReceiptOptions,
  useSaveTransaction,
  type Transaction,
  type TransactionInput,
} from "@/hooks/useBusiness";
import { TX_TYPE_LABEL, categoriesFor, parseAmount, todayIso, type TxStatus, type TxType } from "@/lib/business";
import { currency, formatDate } from "@/lib/finance";
import { VoiceBooking } from "@/components/VoiceBooking";
import type { parseVoiceBooking } from "@/lib/voice-booking";

export function TransactionForm({
  orgId,
  tx,
  preset,
  linkedReceipts,
  onClose,
  initialVoiceResult,
}: {
  orgId: string;
  tx: Transaction | null;
  preset?: Partial<TransactionInput>;
  linkedReceipts: Set<string>;
  onClose: () => void;
  initialVoiceResult?: ReturnType<typeof parseVoiceBooking>;
}) {
  const save = useSaveTransaction(orgId);
  const { data: customers = [] } = useCustomers(orgId);
  const { data: receipts = [] } = useReceiptOptions(orgId);
  const init: Partial<TransactionInput> = tx ?? preset ?? (initialVoiceResult ? { ...(initialVoiceResult.type ? { type: initialVoiceResult.type } : {}), ...(initialVoiceResult.amount !== null ? { amount: initialVoiceResult.amount } : {}), description: initialVoiceResult.description } : {});
  const [type, setType] = useState<TxType>((init.type as TxType) ?? "expense");
  const [amount, setAmount] = useState(init.amount ? String(init.amount).replace(".", ",") : "");
  const [date, setDate] = useState(init.booking_date ?? todayIso());
  const [category, setCategory] = useState(init.category ?? "");
  const [description, setDescription] = useState(init.description ?? "");
  const [status, setStatus] = useState<TxStatus>((init.status as TxStatus) ?? "bezahlt");
  const [customerId, setCustomerId] = useState(init.customer_id ?? "");
  const [receiptId, setReceiptId] = useState(init.receipt_id ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [voiceDraft, setVoiceDraft] = useState(Boolean(initialVoiceResult));
  const [voiceConfirmed, setVoiceConfirmed] = useState(false);

  const cats = categoriesFor(type);
  const availableReceipts = receipts.filter((r) => r.id === receiptId || !linkedReceipts.has(r.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (save.isPending) return;
    if (voiceDraft && !voiceConfirmed) return setErr("Bitte die erkannten Angaben vor dem Speichern bestätigen.");
    const value = parseAmount(amount);
    if (value === null) return setErr("Bitte einen gültigen Betrag größer 0 eingeben (z. B. 49,90).");
    if (!date) return setErr("Bitte ein Buchungsdatum angeben.");
    if (!category) return setErr("Bitte eine Kategorie wählen.");
    setErr(null);
    try {
      await save.mutateAsync({
        id: tx?.id,
        values: {
          type,
          amount: value,
          booking_date: date,
          category,
          description: description.trim() || null,
          status,
          customer_id: customerId || null,
          receipt_id: receiptId || null,
        },
      });
      toast.success(tx ? "Buchung gespeichert." : "Buchung erfasst.");
      onClose();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  return (
    <Modal title={tx ? "Buchung bearbeiten" : "Neue Buchung"} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        {!tx && <VoiceBooking onResult={(result) => {
          if (result.type) { setType(result.type); setCategory(""); }
          else setCategory("");
          setAmount(result.amount === null ? "" : String(result.amount).replace(".", ","));
          setDescription(result.description);
          setVoiceDraft(true); setVoiceConfirmed(false);
        }} />}
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as TxType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                if (!categoriesFor(t).includes(category)) setCategory("");
              }}
              className={type === t ? btnPrimary : btnSecondary}
            >
              {TX_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Betrag (€) *">
            <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Buchungsdatum *">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Kategorie *">
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Bitte wählen</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
            {category && !cats.includes(category) ? <option>{category}</option> : null}
          </select>
        </Field>
        <Field label="Beschreibung">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Zahlungsstatus">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as TxStatus)}>
              <option value="bezahlt">Bezahlt</option>
              <option value="offen">Offen</option>
            </select>
          </Field>
          <Field label="Kunde">
            <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Kein Kunde</option>
              {customers
                .filter((c) => !c.archived_at || c.id === customerId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Beleg">
          <select className={inputClass} value={receiptId} onChange={(e) => setReceiptId(e.target.value)}>
            <option value="">Kein Beleg</option>
            {availableReceipts.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDate(r.date)} · {r.merchant} · {currency(r.total)}
              </option>
            ))}
          </select>
        </Field>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        {voiceDraft && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={voiceConfirmed} onChange={(e) => setVoiceConfirmed(e.target.checked)} className="mt-1 accent-primary" />Betrag, Buchungsart und Beschreibung geprüft und bestätigt</label>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className={btnPrimary} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}
