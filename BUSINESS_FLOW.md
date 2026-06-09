# Flowventory — Business Flow & Module Architecture

> GST Billing, Inventory & Accounting. React + Tailwind (frontend) · Node.js + Express + MySQL (backend) · JWT auth.
> This document shows how each module works end-to-end, including the production-hardening fixes (stock movement, cancel/reversal, payments, party balance, subtotal rounding, header discount).

---

## 1. High-level system map

```mermaid
flowchart TB
    subgraph FE["Frontend (React + Tailwind)"]
        UI_Sales["Sales / Estimate / Delivery Challan / Credit Note forms"]
        UI_Purch["Purchase / Debit Note forms"]
        UI_Pay["Payment In / Payment Out lists"]
        UI_Party["Party list & forms"]
        UI_Item["Items / Inventory"]
        UI_Rep["Reports & Dashboard"]
    end

    subgraph API["Backend (Express routes, JWT protected)"]
        R_Sales["/api/sales"]
        R_Est["/api/estimates"]
        R_DC["/api/delivery-challans"]
        R_CN["/api/credit-notes"]
        R_Purch["/api/purchases"]
        R_DN["/api/debit-notes"]
        R_PayIn["/api/payment-in"]
        R_PayOut["/api/payment-out"]
        R_Party["/api/parties"]
        R_Item["/api/items"]
        R_Rep["/api/report, /api/dashboard"]
    end

    subgraph DB["MySQL"]
        T_SI["sales_invoices (+items)"]
        T_PI["purchase_invoices (+items)"]
        T_PayIn["payment_in"]
        T_PayOut["payment_out"]
        T_Party["parties"]
        T_Item["items"]
        T_Audit["audit_logs"]
    end

    FE --> API --> DB

    R_Sales --> T_SI
    R_Est --> T_SI
    R_DC --> T_SI
    R_CN --> T_SI
    R_Purch --> T_PI
    R_DN --> T_PI
    R_PayIn --> T_PayIn
    R_PayOut --> T_PayOut
    R_Party --> T_Party
    R_Item --> T_Item
    R_Sales -. stock .-> T_Item
    R_Purch -. stock .-> T_Item
    R_CN -. stock .-> T_Item
    R_DN -. stock .-> T_Item
```

### Shared tables by document prefix (critical design)
`sales_invoices` and `purchase_invoices` are **shared** across several document types, distinguished by the `invoice_no` / `bill_no` prefix.

| Table | Prefix | Document | Stock effect |
|-------|--------|----------|--------------|
| `sales_invoices` | `SINV-` | Sales Invoice | **− Subtract** |
| `sales_invoices` | `CN-` | Credit Note (sales return) | **+ Add** |
| `sales_invoices` | `EST-` | Estimate / Quotation | None |
| `sales_invoices` | `DC-` | Delivery Challan | None |
| `purchase_invoices` | `PINV-` | Purchase Bill | **+ Add** |
| `purchase_invoices` | `DN-` | Debit Note (purchase return) | **− Subtract** |

> Every route filters by its own prefix (`WHERE invoice_no LIKE 'CN-%'`, etc.). Aggregations and the reconciliation script **must** respect these prefixes.

---

## 2. Document status lifecycle

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> confirmed: Save as Confirmed\n(stock moves once)
    draft --> draft: Edit (only drafts are editable)
    confirmed --> partially_paid: Payment recorded < balance
    confirmed --> paid: Payment clears balance
    partially_paid --> paid: Remaining paid
    confirmed --> cancelled: Cancel (reverse stock + zero financials)
    partially_paid --> cancelled: Blocked if payments exist
    paid --> cancelled: Blocked if payments exist
    cancelled --> [*]
```

- **Stock moves on the confirm transition only** (status not `draft`/`cancelled`), so confirming once = one stock movement.
- **Only `draft` documents are editable** (PUT enforces this).
- **Cancel** restores stock and zeroes `paid_amount`/`balance_amount`, but is **blocked (HTTP 409) if any linked payment exists** — the payment must be deleted first.

---

## 3. Sales Invoice flow (SINV-)

```mermaid
flowchart TD
    A["User fills CreateInvoice<br/>(lines, discounts, header discount, paid amount)"] --> B["POST /api/sales"]
    B --> C{"status confirmed?"}
    C -- "draft" --> D["Save, NO stock move"]
    C -- "confirmed" --> E["BEGIN TRANSACTION"]
    E --> F["Insert sales_invoices (SINV-)<br/>subtotal, discount_amount (line+header),<br/>header_discount_amount, taxable, GST, total"]
    F --> G["Insert line items"]
    G --> H["items.current_stock − qty (per line)"]
    H --> I{"paid_amount > 0?"}
    I -- "yes" --> J["Insert payment_in (RCPT-)<br/>auto-recorded receipt"]
    I -- "no" --> K["skip"]
    J --> L["audit_logs: create_sales_invoice"]
    K --> L
    L --> M["COMMIT"]
```

**Totals math (frontend and backend agree):**
- `subtotal = Σ round2(qty × rate)` — each line rounded before summing (rounding fix).
- `taxable = max(0, Σ line_taxable − header_discount)` — header discount reduces taxable base; **GST stays per-line** (not recomputed after header discount).
- `total = taxable + CGST + SGST + IGST + round_off`.

---

## 4. Purchase Bill flow (PINV-)

```mermaid
flowchart TD
    A["User fills CreatePurchase"] --> B["POST /api/purchases"]
    B --> C{"status confirmed?"}
    C -- "draft" --> D["Save, NO stock move"]
    C -- "confirmed" --> E["BEGIN TRANSACTION"]
    E --> F["Insert purchase_invoices (PINV-)"]
    F --> G["Insert line items"]
    G --> H["items.current_stock + qty (per line)"]
    H --> I{"paid_amount > 0?"}
    I -- "yes" --> J["Insert payment_out (PMT-)<br/>auto-recorded payment"]
    I -- "no" --> K["skip"]
    J --> L["COMMIT"]
    K --> L
```

---

## 5. Returns: Credit Note (CN-) & Debit Note (DN-)

```mermaid
flowchart LR
    subgraph CN["Credit Note (sales return)"]
        CN1["POST /api/credit-notes"] --> CN2["Insert into sales_invoices (CN-)"]
        CN2 --> CN3["items.current_stock + qty<br/>(goods come back in)"]
    end
    subgraph DN["Debit Note (purchase return)"]
        DN1["POST /api/debit-notes"] --> DN2["Insert into purchase_invoices (DN-)"]
        DN2 --> DN3["items.current_stock − qty<br/>(goods go back to supplier)"]
    end
```

- Credit Note **adds** stock on confirm; its cancel **subtracts** back (with negative-stock guard).
- Debit Note **subtracts** stock on confirm; its cancel **adds** back.

---

## 6. Estimate (EST-) & Delivery Challan (DC-)

```mermaid
flowchart LR
    E["Estimate / Quotation"] --> Enote["No stock movement<br/>No financial posting"]
    D["Delivery Challan"] --> Dnote["No stock movement<br/>(non-accounting document)"]
```

These are non-inventory, non-financial documents by design — they never touch `items.current_stock` or party balances.

---

## 7. Cancel / Reversal flow (Sales & Purchase)

```mermaid
flowchart TD
    A["POST /api/sales/:id/cancel"] --> B{"already cancelled?"}
    B -- "yes" --> X["400 already cancelled"]
    B -- "no" --> C{"linked payments exist?"}
    C -- "yes" --> Y["409 Cannot cancel —<br/>delete payment(s) first"]
    C -- "no" --> D["Restore stock (+qty if was confirmed)"]
    D --> E["status = cancelled<br/>paid_amount = 0, balance_amount = 0"]
    E --> F["audit_logs: cancel_sales_invoice"]
    F --> G["COMMIT"]
```

Purchase cancel mirrors this: it **subtracts** the previously added stock and **blocks if it would go negative** (goods already sold/consumed), and blocks if any `payment_out` is linked.

---

## 8. Payments: record & reverse

```mermaid
flowchart TD
    subgraph Create["Record payment"]
        P1["POST /api/payment-in"] --> P2["Insert payment_in (RCPT-)"]
        P2 --> P3["Invoice: paid_amount += amount<br/>balance recomputed<br/>status → partially_paid / paid"]
    end
    subgraph Delete["Reverse payment"]
        D1["DELETE /api/payment-in/:id"] --> D2{"invoice cancelled?"}
        D2 -- "yes" --> D3["just delete payment row"]
        D2 -- "no" --> D4["paid_amount −= amount<br/>balance recomputed<br/>status → confirmed / partially_paid / paid"]
        D4 --> D5["Delete payment row + audit log"]
    end
```

- Payment Out (`PMT-`, against `purchase_invoices`) works identically.
- Auto-recorded payments (from invoices created with an upfront `paid_amount`) are ordinary payment rows — deleting one reverses the invoice balance, which then allows the invoice to be cancelled.

---

## 9. Party balance (computed live)

```mermaid
flowchart TD
    A["GET /api/parties"] --> B["Compute signed balance per party"]
    B --> C["opening (signed by balance_nature)"]
    C --> D["+ SINV- sales  + DN- debit notes  + payment_out"]
    D --> E["− CN- credit notes  − PINV- purchases  − payment_in"]
    E --> F["current_balance = ABS(signed)<br/>balance_nature_live = receivable if ≥0 else payable"]
```

- The stored `parties.current_balance` column is **no longer trusted for display** — the list API computes it live so it always matches the Party Ledger report.
- Frontend `PartyList.js` totals and per-row badges use `balance_nature_live` (falls back to stored `balance_nature`).
- Only **confirmed/partially_paid/paid** documents count toward the balance.

---

## 10. Reports & Dashboard

```mermaid
flowchart LR
    DB[(MySQL)] --> Ledger["Party Ledger<br/>(opening + signed transactions)"]
    DB --> Dash["Dashboard<br/>Receivables/Payables = Σ balance_amount<br/>WHERE status IN (confirmed, partially_paid)"]
    DB --> GST["GST / Day Book / P&L / Stock Summary"]
```

Dashboard and the Party Ledger compute figures **dynamically** from invoices and payments (never from the stale `current_balance` column).

---

## 11. Data integrity guardrails (summary of fixes)

| Area | Guarantee |
|------|-----------|
| Stock | Moves exactly once on confirm; reversed on cancel; never silently goes negative on purchase/return cancel. |
| Cancel | Reverses stock **and** zeroes financials; blocked if payments are linked. |
| Payments | Have delete/reverse endpoints + UI; reversal restores invoice balance & status. |
| Upfront paid amount | Always materialized as a payment row, so ledger = invoice. |
| Subtotal | Frontend and backend both sum **rounded per-line bases** — no paisa drift. |
| Header discount | Stored in dedicated `header_discount_amount`; edits round-trip exactly. |
| Party balance | Computed live from transactions; consistent across list, ledger, dashboard. |

---

## 12. Reconciliation (one-time / periodic)

`npm run reconcile-stock` (dry-run) → `npm run reconcile-stock -- --apply` (write).

```
expected_stock = opening_stock
               + Σ purchases (PINV-)      − Σ debit notes (DN-)
               − Σ sales (SINV-, excl. EST-/DC-) + Σ credit notes (CN-)
               + Σ manual adjustments (audit_logs: adjust_stock)
```

The script compares `expected_stock` vs `items.current_stock` per item and corrects mismatches only when `--apply` is passed.
