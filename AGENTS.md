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
- Tenant isolation: every business table carries organization_id and RLS uses private.is_org_member / private.is_org_admin (security definer) — avoids policy recursion.
- Org creation/joining goes through SECURITY DEFINER RPCs (create_organization, join_organization) because membership rows cannot be inserted directly by clients.

- Business data (customers, transactions, receipts, fixed_costs) is scoped by organization_id; cross-links are enforced same-org by trigger private.check_same_org_links — client filters are never the security boundary.
- Scanning/saving a receipt never creates a transaction; booking is a manual step, and unique indexes (receipt_id, recurring_expense_id+period) prevent double bookings.
- Recurring expenses are booked only via the user-triggered, idempotent RPC book_due_recurring_expenses — no background job.
- Household tables/RPCs are deprecated (kept for data, execute revoked); do not wire them back in.
