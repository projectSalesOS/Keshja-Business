<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Brand gradients are defined centrally in CSS tokens and applied to existing primary controls and selected navigation; KPI accent props are presentation-only so calculations and page structure remain unchanged.
- Tenant isolation: every business table carries organization_id and RLS uses private.is_org_member / private.is_org_admin (security definer) — avoids policy recursion.
- Org creation/joining goes through SECURITY DEFINER RPCs (create_organization, join_organization) because membership rows cannot be inserted directly by clients.

- Business data (customers, transactions, receipts, fixed_costs) is scoped by organization_id; cross-links are enforced same-org by trigger private.check_same_org_links — client filters are never the security boundary.
- Scanning/saving a receipt never creates a transaction; booking is a manual step, and unique indexes (receipt_id, recurring_expense_id+period) prevent double bookings.
- Recurring expenses are booked only via the user-triggered, idempotent RPC book_due_recurring_expenses — no background job.
- Household tables/RPCs are deprecated (kept for data, execute revoked); do not wire them back in.
- Quotes, invoices and cancellations share one documents table (kind); numbers are assigned only by the SECURITY DEFINER RPC issue_document via a per-org/kind/year counter row — gapless, concurrency-safe, drafts carry no number.
- Issued documents are immutable by trigger (only allowed status transitions); corrections go through cancel_invoice (Stornorechnung with own number) — never edit issued rows.
- A payment row creates/syncs/deletes exactly one income transaction (transactions.payment_id, unique, cascade) via triggers; linked transactions cannot be changed directly. Clients send a self-generated payment id so retries cannot double-book.
- Invoice display status (paid/partial/overdue) and quote expiry are derived from payments and dates, not stored. Dunning notices are created manually, validated by trigger, unique per invoice+level.
- Dashboard/report metrics are computed client-side by pure functions in src/lib/analytics.ts over the existing RLS-scoped queries (shared query keys) — no stored aggregates, one definition of actual vs. forecast values.
- "Actual" income/expense = paid transactions only (payments sync exactly one income tx); receivables = issued, non-cancelled invoices minus payments; planned = unbooked recurring periods — keeps invoices, payments and recurring costs from being counted twice.
