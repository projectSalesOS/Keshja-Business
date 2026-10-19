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
- Central CSS tokens define brand gradients for primary controls/navigation; KPI accents are presentation-only, preserving calculations and structure.
- AppShell business-ui/dialog styles in src/styles.css and shared Stat/controls isolate presentation from calculations/mutations; retain all navigation destinations.
- AppShell owns one controlled Sheet for all viewports, NAV and SectionTabs; no parallel sidebar/bottom navigation. VoiceBooking retains dashboard presentation.
- Tenant isolation: every business table carries organization_id and RLS uses private.is_org_member / private.is_org_admin (security definer) — avoids policy recursion.
- Org creation/joining goes through SECURITY DEFINER RPCs (create_organization, join_organization) because membership rows cannot be inserted directly by clients.

- Customers, transactions, receipts and fixed_costs use organization_id; private.check_same_org_links enforces same-org links, never client filters.
- Scanning/saving a receipt never creates a transaction; booking is a manual step, and unique indexes (receipt_id, recurring_expense_id+period) prevent double bookings.
- Recurring expenses are booked only via the user-triggered, idempotent RPC book_due_recurring_expenses — no background job.
- Household tables/RPCs are deprecated (kept for data, execute revoked); do not wire them back in.
- Quotes, invoices and cancellations share one documents table (kind); numbers are assigned only by the SECURITY DEFINER RPC issue_document via a per-org/kind/year counter row — gapless, concurrency-safe, drafts carry no number.
- Issued documents are immutable by trigger (only allowed status transitions); corrections go through cancel_invoice (Stornorechnung with own number) — never edit issued rows.
- A payment row creates/syncs/deletes exactly one income transaction (transactions.payment_id, unique, cascade) via triggers; linked transactions cannot be changed directly. Clients send a self-generated payment id so retries cannot double-book.
- Invoice display status (paid/partial/overdue) and quote expiry are derived from payments and dates, not stored. Dunning notices are created manually, validated by trigger, unique per invoice+level.
- Dashboard/reports reuse pure src/lib/analytics.ts over RLS-scoped shared queries; no stored aggregates or competing actual/forecast definitions.
- src/lib/dashboard.ts reuses analytics; line/grouped-bar charts share a six-month trend with gaps outside the selected range. Dashboard CSS tokens never retheme other pages.
- "Actual" income/expense = paid transactions only (payments sync exactly one income tx); receivables = issued, non-cancelled invoices minus payments; planned = unbooked recurring periods — keeps invoices, payments and recurring costs from being counted twice.
- Main navigation has independent invoice and quote entries; booking/receipt/report sub-areas use SectionTabs, and nav highlighting matches by path prefix.
- Shared VoiceBooking browser recognition/local parser feeds TransactionForm drafts requiring confirmation before existing save; no parallel capture/persistence or paid transcription.
- Receipt VAT is an optional multi-rate breakdown on receipts, validated in shared pure helpers and a database trigger; missing historical VAT remains unknown and receipt gross amounts continue to drive manual bookings.
- Document PDFs are built once by makeDocPdf (DocumentsView) and reused for download and email, so the sent attachment equals the export.
- Document emails go through the createServerFn sendDocumentEmail (Resend connector, attachments) because Lovable app emails cannot carry attachments; no send status is shown unless the provider accepted it.
- Company logos live in private storage bucket org-logos under <organization_id>/; storage RLS reuses private.is_org_member/is_org_admin; organizations.logo_path points to the current file.

- public.tariff_plans is the sole tariff authority; subscriptions has one row/org. Entitlement mutations require audited operator RPCs; org roles never confer platform privileges.
- Manual transaction and OCR admission serialize on the organization row; OCR requests reserve before inference with durable request IDs, only proven not-started outcomes refund automatically, and ambiguous outcomes require an audited operator review.
- Public / is the landing page and redirects hydrated signed-in users to protected /dashboard; existing business URLs remain protected, while /preise and /rechtliches stay public.
- Premium report filters execute through getAdvancedReport using existing pure analytics; raw business data remains member-readable for normal bookkeeping, and browser voice checks entitlements before starting and tags saved drafts for DB enforcement.
- Operator bootstrap requires trusted administration, a verified confirmed account and audit reason; no public self-grant. See docs/tariffs-operations.md.
