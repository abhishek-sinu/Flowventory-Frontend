import React, { useMemo, useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import DashboardLayout from './DashboardLayout';

const HELP_TABS = [
  { key: 'start', label: 'Getting Started' },
  { key: 'workflow', label: 'Business Flow' },
  { key: 'terms', label: 'Key Terms' },
  { key: 'items', label: 'Items Guide' },
  { key: 'parties', label: 'Parties Guide' },
  { key: 'settings', label: 'Settings Guide' },
  { key: 'invoice', label: 'Invoice Policy' },
  { key: 'reports', label: 'Reports Guide' },
  { key: 'features', label: 'Current Features' },
];

const WORKFLOW_CHART = `flowchart TD
  Start(["Start Here"]):::startNode --> Setup

  subgraph Setup["1 . Configure Your Business"]
    direction LR
    CP["Company Profile"]:::setup
    TU["Tax Rates &amp; Units"]:::setup
    BA["Bank Accounts"]:::setup
  end

  Setup --> Masters

  subgraph Masters["2 . Build Master Data"]
    direction LR
    IT["Items &amp; Stock"]:::master
    PT["Customers &amp; Suppliers"]:::master
  end

  Masters --> Sales
  Masters --> Purchase

  subgraph Sales["3 . Sales Cycle (Money In)"]
    direction TB
    EST["Estimate / Quotation"]:::sale --> DC["Delivery Challan"]:::sale
    DC --> INV["Sale Invoice"]:::sale
    INV --> PIN["Payment In"]:::sale
    INV --> CN["Credit Note / Sales Return"]:::sale
  end

  subgraph Purchase["4 . Purchase Cycle (Money Out)"]
    direction TB
    PB["Purchase Bill"]:::buy --> POUT["Payment Out"]:::buy
    PB --> DN["Debit Note / Purchase Return"]:::buy
  end

  Sales --> Reports
  Purchase --> Reports

  subgraph Reports["5 . Track &amp; Stay Compliant"]
    direction LR
    PL["Profit &amp; Loss"]:::report
    SS["Stock Summary"]:::report
    DB["Day Book"]:::report
    GST["GST Reports"]:::report
    LED["Party Ledger"]:::report
  end

  Reports --> Done(["Grow Your Business"]):::endNode

  classDef startNode fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#ffffff,font-weight:bold;
  classDef endNode fill:#0d9488,stroke:#0f766e,stroke-width:2px,color:#ffffff,font-weight:bold;
  classDef setup fill:#eef2ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81;
  classDef master fill:#f5f3ff,stroke:#7c3aed,stroke-width:1.5px,color:#5b21b6;
  classDef sale fill:#ecfdf5,stroke:#0d9488,stroke-width:1.5px,color:#065f46;
  classDef buy fill:#fff1f2,stroke:#e11d48,stroke-width:1.5px,color:#9f1239;
  classDef report fill:#fffbeb,stroke:#d97706,stroke-width:1.5px,color:#92400e;
`;

let mermaidReady = false;
function ensureMermaid() {
  if (mermaidReady) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'inherit',
    flowchart: { curve: 'basis', htmlLabels: true, padding: 14, nodeSpacing: 40, rankSpacing: 55 },
    themeVariables: {
      primaryColor: '#eef2ff',
      primaryBorderColor: '#4f46e5',
      primaryTextColor: '#312e81',
      lineColor: '#818cf8',
      clusterBkg: '#ffffff',
      clusterBorder: '#c7d2fe',
      fontSize: '14px',
    },
  });
  mermaidReady = true;
}

function MermaidDiagram({ chart }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);
  const idRef = useRef(`mmd-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let active = true;
    try {
      ensureMermaid();
      mermaid
        .render(idRef.current, chart)
        .then(({ svg: out }) => { if (active) setSvg(out); })
        .catch(() => { if (active) setError(true); });
    } catch {
      if (active) setError(true);
    }
    return () => { active = false; };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Unable to render the diagram in this browser. Please refresh the page.
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram w-full overflow-x-auto flex justify-center"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function Help() {
  const [activeTab, setActiveTab] = useState('start');

  const sections = useMemo(() => ({
    start: (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <h3 className="text-base font-semibold text-green-800">Quick Start</h3>
          <p className="text-sm text-green-700 mt-1">Use these steps to begin using Flowventory without confusion.</p>
        </div>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Sign up with username, email, and password.</li>
          <li>Sign in and open the dashboard.</li>
          <li>Go to Items from the Inventory section.</li>
          <li>Create items with SKU, pricing, GST, and stock values.</li>
          <li>Use low-stock filter and stock adjustment to maintain inventory.</li>
        </ol>
      </div>
    ),
    workflow: (
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-base font-semibold text-indigo-800">How Flowventory Fits Your Business</h3>
          <p className="text-sm text-indigo-700 mt-1">This diagram shows the recommended end-to-end flow — from one-time setup, to daily sales and purchase operations, to reporting and GST compliance. Follow the arrows to understand which module to use at each stage.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <MermaidDiagram chart={WORKFLOW_CHART} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <h4 className="text-sm font-semibold text-indigo-800">1 . Configure Your Business</h4>
            <p className="text-xs text-indigo-700 mt-1">Set Company Profile, Tax Rates, Units, and Bank Accounts in Settings. Done once, used everywhere.</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
            <h4 className="text-sm font-semibold text-violet-800">2 . Build Master Data</h4>
            <p className="text-xs text-violet-700 mt-1">Add your Items (with stock) and your Customers &amp; Suppliers. These feed every transaction.</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-3">
            <h4 className="text-sm font-semibold text-teal-800">3 . Sales Cycle (Money In)</h4>
            <p className="text-xs text-teal-700 mt-1">Estimate → Delivery Challan → Sale Invoice → Payment In. Use Credit Notes for sales returns.</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
            <h4 className="text-sm font-semibold text-rose-800">4 . Purchase Cycle (Money Out)</h4>
            <p className="text-xs text-rose-700 mt-1">Record Purchase Bills → Payment Out. Use Debit Notes for purchase returns to suppliers.</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <h4 className="text-sm font-semibold text-amber-800">5 . Track &amp; Stay Compliant</h4>
            <p className="text-xs text-amber-700 mt-1">Review Profit &amp; Loss, Stock Summary, Day Book, Party Ledger, and file GST from GST Reports.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <h4 className="text-sm font-semibold text-gray-700">Repeat Daily</h4>
            <p className="text-xs text-gray-600 mt-1">Setup and masters are mostly one-time. Sales, purchases, payments, and reports run every day.</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tip: You don't have to use every step. A simple shop can go straight from Items → Sale Invoice → Payment In. Estimates, challans, and notes are optional based on how you operate.
        </div>
      </div>
    ),
    terms: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">SKU</h3>
          <p className="text-sm text-gray-600 mt-1">Internal unique product code created by your business. Example: FMCG-BRIT-500G.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">HSN Code</h3>
          <p className="text-sm text-gray-600 mt-1">GST classification code defined by government for tax reporting. Can repeat across items.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">GST %</h3>
          <p className="text-sm text-gray-600 mt-1">Applicable tax percentage for the item. Current validation supports 0 to 100.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Estimate</h3>
          <p className="text-sm text-gray-600 mt-1">A pre-sales quotation shared with customer before final billing. It shows proposed items, rates, taxes, and totals but does not represent final payment posting. After customer approval, create the final sale invoice.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Delivery Challan</h3>
          <p className="text-sm text-gray-600 mt-1">A dispatch document used when goods are moved to customer before or separate from final billing. It confirms what items and quantity were delivered. It is not the final billing invoice.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why we use it:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>To send goods first and create invoice later.</li>
            <li>To keep delivery proof for customer, transporter, and warehouse.</li>
            <li>To avoid disputes about delivered quantity/items.</li>
            <li>To handle approval/job-work/transfer style movements clearly.</li>
          </ol>
          <p className="text-sm text-gray-600 mt-3">Simple difference: Delivery Challan is for goods movement, while Sale Invoice is for final billing and payment.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Credit Note</h3>
          <p className="text-sm text-gray-600 mt-1">A sales adjustment document issued to customer when billed value should be reduced, such as sales return, overcharge correction, or post-sale discount adjustment.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why we use it:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>To reduce customer receivable for returns or billing corrections.</li>
            <li>To keep original invoice unchanged and maintain clean audit trail.</li>
            <li>To document GST/tax impact for adjustment transactions.</li>
            <li>To reconcile customer statement accurately.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Purchase Bill</h3>
          <p className="text-sm text-gray-600 mt-1">A supplier-side tax bill that records goods/services purchased by your business. It updates payable value and forms the base document for payment out.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why we use it:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>To maintain item-wise purchase history and taxable value.</li>
            <li>To track supplier payable and due amount clearly.</li>
            <li>To preserve GST details from supplier invoices for accounting reference.</li>
            <li>To support later adjustment through debit notes when needed.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Payment In</h3>
          <p className="text-sm text-gray-600 mt-1">A receipt entry for money received from customer. It can be linked to a specific sales invoice or kept as on-account advance.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why we use it:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>To reduce receivable balance against invoices.</li>
            <li>To track receipt mode, date, and reference in one place.</li>
            <li>To mark invoices as Partially Paid or Paid automatically.</li>
            <li>To keep auditable receipt history for reconciliation.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Payment Out</h3>
          <p className="text-sm text-gray-600 mt-1">A payment entry for money paid to supplier. It can be linked to a specific purchase bill or recorded as on-account advance.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why we use it:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>To reduce payable balance against supplier bills.</li>
            <li>To track payment mode, date, and bank/reference evidence.</li>
            <li>To mark bills as Partially Paid or Paid automatically.</li>
            <li>To keep clear supplier payment history for reconciliation.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Debit Note</h3>
          <p className="text-sm text-gray-600 mt-1">A purchase adjustment document raised against supplier when payable value should be reduced or corrected, for example return-to-vendor, excess billing, or quality claim.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why we use it:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>To reduce supplier payable for returns and billing corrections.</li>
            <li>To preserve original purchase bill and keep audit trail clean.</li>
            <li>To capture tax impact on purchase-side adjustments.</li>
            <li>To reconcile supplier statement accurately.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Low Stock Threshold</h3>
          <p className="text-sm text-gray-600 mt-1">Minimum stock level. Item is flagged low when current stock is less than or equal to this value.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white md:col-span-2">
          <h3 className="font-semibold text-gray-800">Adjust Stock</h3>
          <p className="text-sm text-gray-600 mt-1">Manual stock correction action. Use <span className="font-semibold">in</span> to increase stock or <span className="font-semibold">out</span> to decrease stock. This updates current stock and writes an audit log.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">What it does:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li><span className="font-semibold">in</span> increases current stock</li>
            <li><span className="font-semibold">out</span> decreases current stock</li>
            <li>Saves an audit log entry (who changed, how much, reason)</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Use it for cases like:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Physical count mismatch</li>
            <li>Damaged goods removal</li>
            <li>Free samples/manual issue</li>
            <li>Initial correction after migration</li>
          </ol>
        </div>
      </div>
    ),
    items: (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">How To Add An Item</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Open Inventory and click Add Item.</li>
            <li>Enter item name and unique SKU.</li>
            <li>Fill category, unit, HSN code, and GST percentage.</li>
            <li>Enter sale price and purchase price.</li>
            <li>Set opening stock, current stock, and low stock threshold.</li>
            <li>Keep Active enabled and click Create Item.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          SKU must be unique. If duplicate, API returns a conflict error.
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">How To Import Items From XLS</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Items and click Download Sample XLS.</li>
            <li>Fill item rows in the downloaded template.</li>
            <li>Click Import XLS and select your updated file.</li>
            <li>System creates new items and updates existing items by SKU.</li>
            <li>Review import summary for created, updated, and failed rows.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">How To Adjust Stock</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Inventory and open Items list.</li>
            <li>Click Adjust in the row of the item.</li>
            <li>Enter direction: in or out.</li>
            <li>Enter quantity and reason.</li>
            <li>Submit to update current stock and keep audit history.</li>
          </ol>
        </div>
      </div>
    ),
    parties: (
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-base font-semibold text-indigo-800">Customers &amp; Suppliers (Parties)</h3>
          <p className="text-sm text-indigo-700 mt-1">A Party is any customer or supplier you transact with. Every invoice, bill, payment, and note is linked to a party, and their receivable/payable balance updates automatically.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">How To Add A Party</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Open Customers &amp; Suppliers from the Parties section.</li>
            <li>Click Add Party and enter name and type (customer or supplier).</li>
            <li>Fill GSTIN, phone, email, and billing address details.</li>
            <li>Optionally set an opening balance (what they already owe or you owe them).</li>
            <li>Save to make the party available in all transaction forms.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Summary Cards</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li><span className="font-semibold">Total Parties</span>: count of all active customers and suppliers.</li>
            <li><span className="font-semibold">Receivables</span>: total money customers owe you.</li>
            <li><span className="font-semibold">Payables</span>: total money you owe suppliers.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Bulk Import Parties</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Open Customers &amp; Suppliers and click Download Sample XLS.</li>
            <li>Fill party rows in the downloaded template.</li>
            <li>Click Import XLS and select your updated file.</li>
            <li>Review the import summary and failed-row reasons table.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tip: Add the correct GSTIN and state for each party. State decides intra-state (CGST+SGST) vs inter-state (IGST) tax on their invoices.
        </div>
      </div>
    ),
    settings: (
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-base font-semibold text-indigo-800">Company Settings Presets</h3>
          <p className="text-sm text-indigo-700 mt-1">Tax Rates and Units are reusable master lists. They do not bill anything on their own; they power dropdowns and defaults in your invoices, bills, estimates, and notes so billing is faster and consistent.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Company Profile</h3>
          <p className="text-sm text-gray-600 mt-1">Your business identity used on printed documents (invoices, estimates, challans, notes).</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Fields:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Company name, GSTIN, phone, and email.</li>
            <li>City, state, and pincode.</li>
            <li>Logo URL — image link shown on document headers.</li>
            <li>Address — full address block printed on documents.</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why it is useful:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Professional, branded PDFs for customers and suppliers.</li>
            <li>Correct GSTIN/state on documents for tax compliance.</li>
          </ol>
          <p className="text-sm text-gray-600 mt-3">Fill the fields and click <span className="font-semibold">Save Company Profile</span>.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Tax Rates</h3>
          <p className="text-sm text-gray-600 mt-1">A saved list of your GST tax slabs so you do not retype them on every document.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Fields:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li><span className="font-semibold">Name</span> — a label such as "GST 18%", "GST 5%", or "Exempt".</li>
            <li><span className="font-semibold">Value</span> — the percentage number, for example 5, 12, 18, or 28.</li>
            <li><span className="font-semibold">Type</span> — the tax category (GST).</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why it is useful:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>The GST % field on invoices/bills offers these as quick-pick options.</li>
            <li>Line tax (CGST/SGST or IGST) is auto-calculated from the chosen rate.</li>
            <li>Consistent, correct rates across all documents and users.</li>
            <li>Fewer manual errors, which matters for accurate GST filing.</li>
          </ol>
          <p className="text-sm text-gray-600 mt-3">Example: Name <span className="font-semibold">GST 18%</span>, Value <span className="font-semibold">18</span>, Type <span className="font-semibold">GST</span>, then click Add.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Units</h3>
          <p className="text-sm text-gray-600 mt-1">A saved list of measurement units used for your items on documents.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Fields:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li><span className="font-semibold">Unit Name</span> — full name such as "Pieces", "Kilogram", "Litre", or "Box".</li>
            <li><span className="font-semibold">Unit Code</span> — short code shown on documents such as "PCS", "KG", "LTR", or "BOX".</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why it is useful:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>The Unit column on item lines picks from this list.</li>
            <li>The first unit you add becomes the default unit for new lines.</li>
            <li>Accurate quantities (KG vs PCS vs BOX) and professional printed documents.</li>
            <li>Standard unit codes help with GST/e-invoice compliance.</li>
          </ol>
          <p className="text-sm text-gray-600 mt-3">Example: Unit Name <span className="font-semibold">Pieces</span>, Unit Code <span className="font-semibold">PCS</span>, then click Add.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Bank Accounts</h3>
          <p className="text-sm text-gray-600 mt-1">Your business bank/cash accounts used for payment references and document footers.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Typical fields:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Account holder name and bank name.</li>
            <li>Account number and IFSC/branch.</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Why it is useful:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Show your bank details on invoices so customers can pay you.</li>
            <li>Keep a reference list for recording Payment In / Payment Out.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tip: Add your common rates (0, 5, 12, 18, 28) and units (PCS, KG, LTR, BOX, MTR) once. Until added, invoice forms fall back to manual entry and a default unit of "pcs".
        </div>
      </div>
    ),
    invoice: (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Sales Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Create or import Items with correct GST %, rate, and stock.</li>
            <li>Create Parties (customer/supplier) with GSTIN and address details.</li>
            <li>Optional: create Estimate first and share estimate PDF for approval.</li>
            <li>Open Sale Invoices and click Create Invoice.</li>
            <li>Select Party, Invoice Date, and Supply Type (intra/inter state).</li>
            <li>Add line items. System auto-computes taxable value and GST split.</li>
            <li>Save as Draft for future edit, or mark Confirmed to finalize.</li>
            <li>Use PDF action in invoice list to download printable invoice copy.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Estimate Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Sales menu and open Estimates.</li>
            <li>Click Create Estimate and select Party, date, supply type, and line items.</li>
            <li>Review GST totals and save the estimate as draft or confirmed.</li>
            <li>Download estimate PDF and share with customer for approval.</li>
            <li>Edit is allowed only while estimate status is Draft.</li>
            <li>After customer confirmation, create final Sale Invoice from approved values.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Delivery Challan Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Sales menu and open Delivery Challans.</li>
            <li>Create challan by selecting Party, challan date, supply type, and line items.</li>
            <li>Review totals and save as draft or confirmed dispatch record.</li>
            <li>Download challan PDF and share with transporter/customer as delivery proof.</li>
            <li>Edit is allowed only while challan status is Draft.</li>
            <li>Create or reconcile final Sale Invoice from delivered items as needed.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Credit Note Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Sales menu and open Credit Notes.</li>
            <li>Create credit note by selecting Party, date, supply type, and adjusted line items.</li>
            <li>Add reason/notes (for return, rate correction, or discount adjustment).</li>
            <li>Review GST totals and save as draft or confirmed.</li>
            <li>Download credit note PDF and share with customer/accounts.</li>
            <li>Edit is allowed only while credit note status is Draft.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Payment In Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Sales menu and open Payment In.</li>
            <li>Click Receive Payment and select customer party.</li>
            <li>Optionally select an open invoice to settle, or keep as on-account receipt.</li>
            <li>Enter amount, mode, date, and reference details, then save receipt.</li>
            <li>When linked to invoice, system updates paid and balance values automatically.</li>
            <li>Invoice status changes to Partially Paid or Paid based on remaining balance.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Payment Out Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Purchase menu and open Payment Out.</li>
            <li>Click Record Payment Out and select supplier party.</li>
            <li>Optionally select an open purchase bill to settle, or keep as on-account payment.</li>
            <li>Enter amount, mode, date, and reference details, then save payment.</li>
            <li>When linked to bill, system updates paid and balance values automatically.</li>
            <li>Bill status changes to Partially Paid or Paid based on remaining balance.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Debit Note Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Purchase menu and open Debit Notes.</li>
            <li>Create debit note by selecting supplier, date, supply type, and line items.</li>
            <li>Add reason/notes (return, quality issue, overcharge correction).</li>
            <li>Review tax totals and save as draft or confirmed.</li>
            <li>Download debit note PDF and share with supplier/accounts team.</li>
            <li>Edit is allowed only while debit note status is Draft.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Purchase Bill Flow (How To Use)</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Go to Purchase menu and open Purchase Bills.</li>
            <li>Click Record Purchase and select supplier party, dates, and supply type.</li>
            <li>Add item lines. System auto-fills purchase rate and GST from item master.</li>
            <li>Review totals (taxable, CGST/SGST/IGST, total) and save draft or confirmed.</li>
            <li>Edit is allowed only while purchase bill status is Draft.</li>
            <li>Download purchase bill PDF for accounting and supplier reconciliation.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Discount And GST Breakdown</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li><span className="font-semibold">Disc %</span>: Line-level discount percent. Applied before tax.</li>
            <li><span className="font-semibold">GST %</span>: Total GST rate for the item.</li>
            <li><span className="font-semibold">CGST + SGST</span>: Used for intra-state sale (same state). GST is split equally.</li>
            <li><span className="font-semibold">IGST</span>: Used for inter-state sale (different state). Full GST goes to IGST.</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Calculation flow:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Base = Qty × Rate</li>
            <li>Discount Amount = Base × Disc% / 100</li>
            <li>Taxable Value = Base - Discount Amount</li>
            <li>Total GST = Taxable Value × GST% / 100</li>
            <li>Intra-state: split Total GST into CGST and SGST</li>
            <li>Inter-state: Total GST is IGST</li>
            <li>Line Total = Taxable Value + applicable tax</li>
          </ol>
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Example: Qty 1, Rate 50, Disc% 0, GST% 1, Supply Type intra-state.<br />
            Taxable = 50, Total GST = 0.50, CGST = 0.25, SGST = 0.25, IGST = 0.00, Line Total = 50.50.
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Invoice Status Meaning</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li><span className="font-semibold">Draft</span>: Work-in-progress invoice. Values can still be revised before final confirmation.</li>
            <li><span className="font-semibold">Confirmed</span>: Finalized sales invoice shared for billing and payment collection.</li>
            <li><span className="font-semibold">Partially Paid</span>: Customer has paid only part of total amount.</li>
            <li><span className="font-semibold">Paid</span>: Full invoice amount is received.</li>
            <li><span className="font-semibold">Cancelled</span>: Invoice is closed and should not be used for active billing.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">When Invoice Edit Is Allowed</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Edit is generally allowed only in <span className="font-semibold">Draft</span> stage.</li>
            <li>For <span className="font-semibold">Confirmed</span>, <span className="font-semibold">Partially Paid</span>, and <span className="font-semibold">Paid</span> invoices, direct edits should be restricted.</li>
            <li>Corrections after confirmation should be done through adjustment documents (for example credit note or debit note), not by changing original posted invoice.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Current implementation supports invoice, estimate, delivery challan, credit note, purchase bill, payment in, payment out, and debit note flows with GST auto-calculation and receivable/payable settlement updates.
        </div>
      </div>
    ),
    reports: (
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="text-base font-semibold text-indigo-800">Reports Overview</h3>
          <p className="text-sm text-indigo-700 mt-1">Reports turn your transactions into business insights. Most reports support a date range — set From/To dates and click <span className="font-semibold">Apply Filters</span>, or <span className="font-semibold">Reset</span> to clear. Summary cards give a quick snapshot and the table shows detail.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Profit &amp; Loss</h3>
          <p className="text-sm text-gray-600 mt-1">Shows profitability for a period: net sales, net purchases, gross profit, and gross margin %, with adjustments (credit/debit notes) and a month-wise breakdown.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Use it to:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Check if the business is profitable over a chosen period.</li>
            <li>Compare month-over-month sales and margin trends.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Stock Summary</h3>
          <p className="text-sm text-gray-600 mt-1">Inventory valuation and quantity report. Shows total items, total stock quantity, stock value at cost and at sale price, and low-stock items, with category and active filters.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Use it to:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Know how much stock value you are holding.</li>
            <li>Spot items that need reordering (low stock).</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Day Book</h3>
          <p className="text-sm text-gray-600 mt-1">A unified in/out register for a date range. Lists invoices, payments, and adjustment documents together with total in, total out, and net flow.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Use it to:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>See all daily money movement in one place.</li>
            <li>Reconcile cash/bank activity quickly.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">GST Reports</h3>
          <p className="text-sm text-gray-600 mt-1">GSTR-1 outward summary and GSTR-3B liability vs input tax credit, plus a month-wise tax movement table.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Export options (top right):</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li><span className="font-semibold">PDF</span> — opens a print-ready report; use "Save as PDF" to keep a copy.</li>
            <li><span className="font-semibold">XLS</span> — Excel file with formatted tables.</li>
            <li><span className="font-semibold">CSV</span> — plain data file for Excel/Sheets or your accountant.</li>
          </ol>
          <p className="text-sm font-semibold text-gray-700 mt-3">Use it to:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>Prepare GST return filing (GSTR-1 / GSTR-3B).</li>
            <li>Share tax summaries with your CA and keep audit records.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Party Ledger</h3>
          <p className="text-sm text-gray-600 mt-1">A voucher-wise statement for one party. Shows opening balance, total debit/credit, closing balance, and every transaction in the period.</p>
          <p className="text-sm font-semibold text-gray-700 mt-3">Use it to:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-gray-600">
            <li>See exactly what a customer/supplier owes or is owed.</li>
            <li>Share an account statement and settle disputes.</li>
          </ol>
        </div>
      </div>
    ),
    features: (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-white">
          <h3 className="font-semibold text-gray-800">Completed So Far</h3>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-gray-700">
            <li>Auth: Signup and Login with JWT.</li>
            <li>Dashboard: KPI cards and quick actions layout.</li>
            <li>Database: Items, Parties, Sales, Purchase, Settings, Auth core tables.</li>
            <li>Items API: CRUD, pagination, sorting, validation, stock adjust endpoint.</li>
            <li>Items UI: search, filters, add/edit/delete, pagination, quick stock adjustment, reset filters.</li>
            <li>Items import: sample XLS download, bulk import, and failed-row reasons table.</li>
            <li>Parties API/UI: CRUD, search/filter, add/edit/delete, receivable/payable summary cards.</li>
            <li>Parties import: sample XLS download, bulk import, and failed-row reasons table.</li>
            <li>Sales API/UI: invoice list, create invoice, GST auto-calculation (intra/inter), and invoice PDF download.</li>
            <li>Estimate API/UI: estimate list, create estimate, draft-only edit, and estimate PDF download.</li>
            <li>Delivery Challan API/UI: challan list, create challan, draft-only edit, and challan PDF download.</li>
            <li>Credit Note API/UI: credit note list, create credit note, draft-only edit, and credit note PDF download.</li>
            <li>Purchase API/UI: purchase bill list, record purchase form, draft-only edit, and purchase bill PDF download.</li>
            <li>Payment In API/UI: receipt list, receive payment form, open-invoice selector, and invoice paid/balance status update on receipt posting.</li>
            <li>Payment Out API/UI: payment list, payment out form, open-bill selector, and bill paid/balance status update on payment posting.</li>
            <li>Debit Note API/UI: debit note list, create/edit draft flow, and debit note PDF generation.</li>
            <li>Reports API/UI: Profit & Loss report with date filter, net sales/purchase summary, margin %, and month-wise profitability.</li>
            <li>Reports API/UI: Stock Summary report with category/low-stock filters, valuation at cost/sale, and item-wise stock table.</li>
            <li>Reports API/UI: Day Book report with date/type filters and unified in/out register for invoices, payments, and adjustment documents.</li>
            <li>Reports API/UI: GST report with GSTR-1 outward summary, GSTR-3B liability vs ITC, and month-wise tax movement.</li>
            <li>Reports API/UI: Party Ledger report with opening balance, increase/decrease totals, and running voucher-wise statement.</li>
            <li>Settings API/UI: Company profile, tax rates, units, and bank accounts setup with add/edit/delete workflows.</li>
            <li>Sales/Purchase forms: invoice, estimate, delivery challan, credit note, purchase bill, and debit note line items now load GST preset suggestions and unit fallback from configured settings masters.</li>
            <li>Low-stock KPI wired to items table.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Reports and settings modules are now live with settings-master adoption across core transaction and adjustment forms.
        </div>
      </div>
    ),
  }), []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Help Center</h1>
        <p className="text-sm text-gray-500 mt-1">Guides, terms, and module usage for Flowventory.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 p-3 flex flex-wrap gap-2">
          {HELP_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  active ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 bg-gray-50 min-h-[360px]">
          {sections[activeTab]}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Help;
