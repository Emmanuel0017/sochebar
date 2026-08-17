# Sochebar — Frontend

React + Vite + TypeScript + Tailwind frontend for the Bar Management System
backend.

## Design

A cash-register / receipt-ledger aesthetic, since the backend's whole
philosophy is "everything is a transaction, nothing gets silently edited":

- Dark ink background (`#14181B`) with a warm brass accent (`#C89B3C`) —
  evokes bar lighting/brass fittings, not a generic dark-mode dashboard.
- Money figures are set in **IBM Plex Mono** (tabular figures) so columns
  of amounts actually line up, the way a receipt or till display would.
- Summary cards on the dashboard have a torn/perforated top edge
  (`.receipt-tear` in `index.css`) — the one deliberate signature flourish,
  used sparingly.
- Tables use hairline dashed dividers (`.ledger-row`) instead of solid
  borders, echoing a running ledger.

## Pages

- **Login**
- **Dashboard** (ADMIN/MANAGER) — today's sales/expenses/net profit,
  payment collection breakdown, stock alerts, open cash sessions
- **POS** (ADMIN/MANAGER/CASHIER/BARTENDER) — product grid, cart, split
  payments, credit sales tied to a customer
- **Sales** — history, void (ADMIN/MANAGER only)
- **Products** — categories, units (Case/Bottle/Shot-style conversions),
  versioned prices
- **Inventory** — stock levels, adjustments (with the >10-base-unit
  approval flow the backend enforces), wastage
- **Purchases** — receive stock from a supplier, partial/full payment
- **Suppliers** — outstanding balance per supplier
- **Cash** — open/close session, till reconciliation
- **Expenses** — category, payment method, ties into the open cash session
  if paid in cash
- **Customers** — credit balances, record payments
- **Reports** — profit & loss, product sales/margin, customer credit,
  supplier debt
- **Users** (ADMIN only) — create staff accounts, activate/deactivate

Route access mirrors the backend's role guards exactly (see `App.tsx`) —
a cashier won't even see the Products or Reports nav items, for instance.

## Setup

```bash
npm install
cp .env.example .env      # set VITE_API_URL to your backend, e.g.
                           # http://localhost:3000/api
npm run dev
```

Build for production:

```bash
npm run build              # outputs to dist/
```

Deploy `dist/` to Vercel/Netlify/etc., matching your existing pattern for
the RFL frontend repos.

## Notes / what's not built yet

- No partial refunds in the UI (backend only exposes full void/refund for
  now — see backend README).
- No product/unit/price editing beyond create (no PATCH forms yet).
- No pagination — sales/purchases/expenses lists load everything. Fine at
  small scale, worth adding `take`/`skip` params once volume grows.
- No offline/PWA support — POS needs a live connection to the API.
