# Flowventory — Vyapar-like App Transformation Plan

## Stack
- Frontend: React + Tailwind CSS (`Flowventory Frontend/src/`)
- Backend: Node.js + Express + MySQL (`Flowventory Backend/`)
- Auth: JWT (already working)

## App Rename
- Old: ISKCON Donation Management System
- New: **Flowventory** — GST Billing, Inventory & Accounting

---

## Phase 1 — Foundation & Rebrand ✅ COMPLETE
- [x] Renamed app to **Flowventory** — green header, new logo icon
- [x] Redesigned sidebar: Dashboard / Sales / Purchase / Inventory / Parties / Reports / Settings
- [x] Redesigned Dashboard KPIs: Today's Sales, Monthly Revenue, Receivables, Payables, Low Stock, Total Parties
- [x] Updated `App.js` routes — all new module paths with `ComingSoon` placeholders
- [x] Backend `dashboard.js` updated to return Flowventory stats shape (0s until Phase 4/5)

## Phase 2 — Items / Inventory Module ✅ COMPLETE
- [x] Backend schema: create SQL script in `Flowventory Backend/database_sql/schema/` for `items` table (DDL + indexes)
- [x] Backend migration: run/apply `items` schema to MySQL and verify table structure
- [x] Backend: `items` table (name, SKU, category, unit, sale price, purchase price, GST%, opening stock)
- [x] Backend: items CRUD routes (`routes/items.js`)
- [x] Frontend: `Items.js` — item list with search/filter
- [x] Frontend: Add/Edit item drawer/modal
- [x] XLS import flow: sample template download + upload import from `.xls/.xlsx`

## Phase 3 — Parties Module ✅ COMPLETE
- [x] Backend schema: create SQL script in `Flowventory Backend/database_sql/schema/` for `parties` table (DDL + indexes)
- [x] Backend migration: run/apply `parties` schema to MySQL and verify table structure
- [x] Backend: `parties` table (customers + suppliers, GSTIN, address, balances)
- [x] Backend: parties CRUD routes (`routes/parties.js`)
- [x] Frontend: `PartyList.js` — receivable/payable balances per party
- [x] Frontend: Add/Edit party form

## Phase 4 — Sales Module ✅ COMPLETE
- [x] Backend schema: create SQL scripts in `Flowventory Backend/database_sql/schema/` for `sales_invoices`, `invoice_items`, `payment_in` (DDL + FKs + indexes)
- [x] Backend migration: run/apply sales schemas to MySQL and verify keys/constraints
- [x] Backend: `sales_invoices`, `invoice_items`, `payment_in` tables
- [x] Backend: GST auto-calculation logic
- [x] Frontend: `SalesList.js` — invoice list
- [x] Frontend: `CreateInvoice.js` — line items + GST auto-calc
- [x] Frontend: Invoice print/PDF view
- [x] Draft invoice edit flow (edit allowed only when status is draft)
- [x] Sub-doc: Estimate (list/create/draft-edit/PDF)
- [x] Sub-doc: Delivery Challan (list/create/draft-edit/PDF)
- [x] Sub-doc: Credit Note (list/create/draft-edit/PDF)
- [x] Sub-doc: Payment In (receipt list/create + invoice settlement)

## Phase 5 — Purchase Module ✅ COMPLETE
- [x] Backend schema: create SQL scripts in `Flowventory Backend/database_sql/schema/` for `purchase_invoices`, `purchase_items`, `payment_out` (DDL + FKs + indexes)
- [x] Backend migration: run/apply purchase schemas to MySQL and verify keys/constraints
- [x] Backend: `purchase_invoices`, `purchase_items`, `payment_out` tables
- [x] Frontend: `PurchaseList.js`
- [x] Frontend: Record Purchase form
- [x] Payment Out (list/create + bill settlement)
- [x] Sub-docs: Debit Note (list/create/draft-edit/PDF)

## Phase 6 — Reports & GST ✅ COMPLETE
- [x] P&L Statement
- [x] Stock Summary
- [x] Day Book
- [x] GSTR-1 / GSTR-3B summaries
- [x] Party Ledger / Statement of Accounts

## Phase 7 — Settings ✅ COMPLETE
- [x] Backend schema: create SQL scripts in `Flowventory Backend/database_sql/schema/` for company profile, tax rates, units, and bank accounts
- [x] Backend migration: run/apply settings schemas to MySQL and verify table structure
- [x] Company profile (name, GSTIN, address, logo)
- [x] Tax rates, units of measure, bank accounts

## Phase 8 — Barcode Support ✅ COMPLETE (Code128, auto-generate, no PDF barcode yet)
**Goal:** Identify items by barcode for faster invoicing and stock handling.

### Data model
- [x] Backend schema: add `barcode VARCHAR(64) NULL` column to `items` table (migration `008_items_barcode.sql`, with `UNIQUE KEY uq_items_barcode (barcode)`)
- [x] Backend migration: applied to MySQL and verified (existing items backfilled with `FLV`+padded id)

### Backend
- [x] Items API: accept/return `barcode` in create/update/list/get (`routes/items.js`)
- [x] Auto-generate barcode (`FLV` + zero-padded id) when left blank on create
- [x] Lookup endpoint: `GET /api/items/by-barcode/:code` for scan-to-add
- [x] Validation: reject duplicate barcodes with clear error

### Frontend — Item master
- [x] `Items.js`: Barcode field in Add/Edit form + shown in list + searchable
- [x] Include `barcode` column in XLS template + import mapping

### Frontend — Invoicing
- [x] `CreateInvoice.js`: barcode scan box that looks up item via `by-barcode` and auto-adds the line (Enter adds; qty +1 if already present); USB/keyboard scanner friendly
- [x] Camera scanning: 📷 Camera button + modal using `html5-qrcode` (laptop webcam / phone camera) that auto-adds items; reuses the same lookup

### Deferred
- [ ] Render barcode on PDFs (skipped for now per decision)
- [ ] Add scan box to other Create* forms (purchase, estimate, etc.) if needed

### Phase 8b — Print Barcode Label ✅ COMPLETE (2026-06-04)
**Goal:** Generate and print scannable barcode label stickers for products that have no manufacturer barcode (own / loose goods using the `FLV…` auto-generated code).

**Library:** `jsbarcode` (renders Code128 to SVG in the browser). Print via a new window + `window.print()` — no backend changes needed.

**Label content (configurable):**
- [x] Barcode (Code128, the item's `barcode`) — **always on (required)**
- [x] Human-readable code below the bars — **always on** (manual fallback if scan fails)
- [x] Item name (truncated ~28 chars) — **on by default** (visual confirmation)
- [x] Price — **optional toggle, default OFF** (price changes over time and is NOT the billing source of truth; the invoice price always comes from the item master. Prefer MRP if shown)
- [x] SKU — **optional toggle, default OFF** (internal-only, scanner uses barcode not SKU; adds clutter on small labels)

**Frontend — Items page:**
- [x] Per-row "Label" action (prints that single item)
- [x] Bulk: row checkboxes + select-all-on-page + header "🏷️ Print Labels (n)" button; copies (qty) per item in the modal
- [x] Label preview modal showing the rendered first-item barcode before printing
- [x] Print layouts: A4 sheet grid (4-up, dashed cut guides) AND roll-label size (50mm × 25mm, one per label) selectable
- [x] `@page` / print CSS in the print window; no app chrome
- [x] Guard: items with no barcode are skipped with a hint to save the item first

**Deferred within 8b:**
- [ ] Saving label templates per product category
- [ ] Embedding price/MRP from a price list other than `sale_price`
- [ ] Move label options into Settings (size/field defaults)

---

## Progress Log
| Date       | Phase | What was done |
|------------|-------|---------------|
| 2026-06-03 | –     | Plan created, ready to start Phase 1 |
| 2026-06-03 | 1     | Phase 1 complete — Flowventory rebrand, new sidebar, new dashboard KPIs, all routes wired |
| 2026-06-03 | 2-5,7 | Created initial SQL schema files in `Flowventory Backend/database_sql/schema/` (items, parties, sales, purchase, settings) |
| 2026-06-03 | 2-5,7 | Applied schema migrations in DB and verified table creation |
| 2026-06-03 | 2     | Implemented Items CRUD API, wired `/api/items`, built `Items.js` page and connected `/items` route |
| 2026-06-03 | 2     | Added server-side pagination/sorting, stronger validation, stock-adjust endpoint, and item-level stock adjustment UI |
| 2026-06-03 | 2     | Added XLS template download and XLS import (bulk create/update items) |
| 2026-06-03 | 2     | Added import failure detail table and reset filters button in Items module |
| 2026-06-03 | 3     | Implemented Parties CRUD API (`/api/parties`), created Parties UI with list/filter/add/edit/delete, and wired `/parties` route |
| 2026-06-03 | 3     | Added Parties XLS template download and bulk import (with row-level failed reason table) |
| 2026-06-03 | 3     | Improved Parties error handling for non-JSON responses, fixed Add Party modal viewport overflow, and added mandatory field `*` markers in Item/Party forms |
| 2026-06-03 | 4     | Started Sales module: implemented `/api/sales` list/create APIs with GST auto-calculation and wired frontend `SalesList` + `CreateInvoice` pages |
| 2026-06-03 | 4     | Added invoice PDF export endpoint (`/api/sales/:id/pdf`) and Sales list PDF download action |
| 2026-06-03 | 4     | Added draft-only invoice edit flow (`PUT /api/sales/:id`), draft edit action in Sales list, and Help Center usage flow updates |
| 2026-06-03 | 4     | Implemented Estimates module using `EST-` numbering: `/api/estimates` list/create/get/update/pdf, frontend Estimate list/create/edit pages, route wiring, and Help Center estimate usage flow |
| 2026-06-03 | 4     | Implemented Delivery Challans module using `DC-` numbering: `/api/delivery-challans` list/create/get/update/pdf, frontend Delivery Challan list/create/edit pages, route wiring, and Help Center delivery challan flow |
| 2026-06-03 | 4     | Implemented Credit Notes module using `CN-` numbering: `/api/credit-notes` list/create/get/update/pdf, frontend Credit Note list/create/edit pages, route wiring, and Help Center credit note flow |
| 2026-06-03 | 5     | Implemented Purchase Bills module: `/api/purchases` list/create/get/update/pdf, frontend Purchase list/create/edit pages, route wiring, and Help Center purchase bill term/flow updates |
| 2026-06-03 | 4     | Implemented Payment In module: `/api/payment-in` list/next-receipt/open-invoices/create, frontend Payment In list/create pages, route wiring, and invoice paid/balance/status settlement logic |
| 2026-06-03 | 5     | Implemented Payment Out module: `/api/payment-out` list/next-payment/open-bills/create, frontend Payment Out list/create pages, route wiring, and purchase bill paid/balance/status settlement logic |
| 2026-06-03 | 5     | Implemented Debit Notes module using `DN-` numbering: `/api/debit-notes` list/create/get/update/pdf, frontend Debit Note list/create/edit pages, route wiring, and Help Center debit note flow updates |
| 2026-06-03 | 6     | Implemented Profit & Loss report: `/api/report/profit-loss` with date range filters, sales/credit and purchase/debit adjustments, frontend `/reports/profit-loss` summary cards, and month-wise profitability table |
| 2026-06-03 | 6     | Implemented Stock Summary report: `/api/report/stock-summary` with item/category/low-stock filters and valuation metrics, frontend `/reports/stock` summary cards, and item-wise stock table |
| 2026-06-03 | 6     | Implemented Day Book report: `/api/report/day-book` with date/type filters and consolidated in/out entries from sales, purchases, payment in/out, and credit/debit notes, frontend `/reports/day-book` summary cards and transaction register |
| 2026-06-03 | 6     | Implemented GST report: `/api/report/gst-summary` with date filters, GSTR-1 outward tax summary, GSTR-3B net liability vs ITC, and frontend `/reports/gst` month-wise GST movement table |
| 2026-06-03 | 6     | Implemented Party Ledger report: `/api/report/party-ledger` with party/date filters, opening and closing balance computation, running statement entries, and frontend `/reports/party-ledger` voucher-wise ledger table |
| 2026-06-03 | 7     | Implemented Settings module: backend `/api/settings` routes for company profile, tax rates, units, and bank accounts (list/create/update/delete), frontend `/settings` page with profile form and setup tables/forms, route wiring, and Help updates |
| 2026-06-03 | 7     | Enhanced Settings UX with inline edit mode for tax rates, units, and bank accounts in frontend `/settings`, including update/cancel flows using existing PUT APIs |
| 2026-06-03 | 7     | Integrated settings masters into transaction forms: frontend `CreateInvoice` and `CreatePurchase` now fetch active tax/unit presets, show GST preset suggestions, and display unit fallback from configured units |
| 2026-06-03 | 7     | Extended settings master integration to sub-doc forms: frontend `CreateEstimate`, `CreateDeliveryChallan`, `CreateCreditNote`, and `CreateDebitNote` now fetch active tax/unit presets, show GST suggestions, and display unit fallback from configured units |
| 2026-06-04 | 8     | Implemented Barcode support: migration `008_items_barcode.sql` (unique `barcode` on items + backfill), items API barcode CRUD/search/auto-generate, `GET /api/items/by-barcode/:code` lookup, `Items.js` barcode field/column/search + XLS template, and `CreateInvoice.js` scan-to-add box (Code128, auto-generate when blank, PDF barcode deferred) |
| 2026-06-04 | 8     | Added Help Center "Barcode Guide" tab with a Mermaid flow diagram (setup → daily billing), step-by-step usage, and a barcode note in the Items guide + Current Features list |
| 2026-06-04 | 8     | Added in-browser camera scanning to `CreateInvoice.js` using `html5-qrcode` (📷 Camera button + modal, environment-facing camera, debounced auto-add reusing `by-barcode`); updated Help Center barcode guide (three scan methods, camera path in flow diagram, HTTPS/permission note) |
| 2026-06-04 | 8b    | Implemented Print Barcode Label (`jsbarcode`): per-item "Label" action + bulk row-checkbox selection with "🏷️ Print Labels" button on `Items.js`; modal with label-size (A4 grid / 50×25mm roll), copies, and field toggles (name on, price/SKU off by default), live preview, and a print window using `window.print()` — no backend changes |
