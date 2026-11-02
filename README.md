# Kittycat

**A full-stack online shop with QR payments, live stock control and an order management dashboard.**

![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

**[View the live site](https://kitty-gotochi.vercel.app/)** · [At a glance](#at-a-glance) · [Architecture](#architecture) · [Engineering decisions](#engineering-decisions) · [Running locally](#running-locally)

Kittycat is an online shop for regional Japanese keychains, built for customers in Singapore. Customers browse by prefecture, check out without creating an account and pay by scanning a PayNow QR code. The shop owner then manages each order from a private dashboard, from payment through to delivery.

I built it to solve the problems that make real commerce hard: two people buying the last item at the same moment, prices that can't be tampered with, and order records that stay accurate over time.

**Status:** deployed and in active development, ahead of opening to customers. Product images are sample illustrations for now.

![Storefront section showing keychains for the Kansai region of Japan](docs/screenshots/home.png)

| Product page | Checkout |
| :---: | :---: |
| ![Product page with price, stock and add to cart button](docs/screenshots/product.png) | ![Checkout form with inline validation messages](docs/screenshots/checkout.png) |

| PayNow payment | Order dashboard |
| :---: | :---: |
| ![Order page with a PayNow QR code](docs/screenshots/payment.png) | ![Admin dashboard listing orders by status](docs/screenshots/admin.png) |

<sub>Screenshots use sample customer details and a non-working QR code.</sub>

## At a glance

| Challenge | How Kittycat handles it |
| --- | --- |
| Two customers want the last item | [Row locks inside a transaction](#overselling-is-prevented-at-the-database-level) mean only one order succeeds |
| Someone edits the price in their browser | [The server reads prices from the database](#the-server-decides-what-things-cost) and ignores the browser |
| An order is changed by mistake | [Only valid status changes are accepted](#order-status-can-only-change-in-valid-ways), with the order locked during each update |
| Customer data must stay private | [The public database key sees zero rows](#customer-data-is-not-reachable-from-the-browser), and [admin access is checked on every request](#admin-access-is-checked-on-the-server-every-time) |
| Payment needs no third-party gateway | [PayNow QR codes are built to the banking standard](#payment-qr-codes-follow-the-banking-standard) and tested with a banking app |

## Features

**For customers**

- Browse products by prefecture, grouped by region, with stock shown as it stands
- Keep a cart between visits, with no account needed
- Get clear form errors before submitting, and a specific message if an item sells out during checkout
- Pay by scanning a QR code that fills in the amount and payment reference automatically
- Follow the order on its own page, which updates by itself once payment is confirmed

**For the shop owner**

- Sign in to a private dashboard restricted to approved admin accounts
- Filter orders by status and search by payment reference, customer name or order number
- Move orders through payment, shipping or cancellation, with stock returned automatically on cancellation

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | PostgreSQL on Supabase, queried with hand-written SQL through [postgres.js](https://github.com/porsager/postgres) |
| Authentication | Supabase Auth with cookie-based server sessions |
| Interface | Tailwind CSS 4, shadcn/ui, Base UI |
| Payments | PayNow QR (SGQR / EMVCo format), with the payload built in-house |
| Hosting | Vercel |

## Architecture

```mermaid
flowchart LR
    Browser["Customer or admin browser"]
    subgraph Vercel
        App["Next.js pages and API routes"]
    end
    subgraph Supabase
        Auth["Auth"]
        DB[("PostgreSQL")]
    end
    Browser -->|"Pages, checkout, order status"| App
    Browser -->|"Admin sign-in"| Auth
    App -->|"Verify admin session"| Auth
    App -->|"SQL, server side only"| DB
```

Browsers never query the database. Every read and write goes through server code, which is where prices, stock and permissions are checked.

## Engineering decisions

### Overselling is prevented at the database level

Order creation runs in a single database transaction. It locks the product rows with `SELECT ... FOR UPDATE`, checks stock, writes the order and reduces stock. If two customers try to buy the last item at once, the second waits for the first to finish, then sees an accurate sold-out message. If any step fails, nothing is saved.

See [`app/api/orders/route.ts`](app/api/orders/route.ts).

### The server decides what things cost

The browser sends only product IDs and quantities. Prices and totals are read from the database when the order is placed, so editing a request can't change what a customer pays. All amounts are stored as whole cents to avoid floating-point rounding errors.

### Past orders stay accurate

Each order line keeps its own copy of the product name and unit price, so later catalogue changes don't alter past orders.

### Order status can only change in valid ways

Allowed status changes are defined in one place and enforced on the server. The order row is locked during each update, so a double click or two admins acting at once can't apply conflicting changes.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> pending_payment: order placed
    pending_payment --> paid: payment confirmed
    pending_payment --> cancelled: stock returned
    paid --> fulfilled: shipped
    paid --> cancelled: stock returned
    fulfilled --> [*]
    cancelled --> [*]
```

See [`app/api/admin/orders/[id]/route.ts`](app/api/admin/orders/%5Bid%5D/route.ts).

### Payment QR codes follow the banking standard

[`lib/paynow.ts`](lib/paynow.ts) builds the SGQR / EMVCo payload directly, including its tag-length-value fields and CRC16 checksum. The amount is locked, and each order carries a random reference that the owner can match against bank records. A QR library is used only to draw the final image. I tested the result by scanning it with a banking app.

### Admin access is checked on the server, every time

Being signed in isn't enough. A user must also appear in an `admins` table, and that check runs on the server for the dashboard page and for every admin API request. Logged-out visitors are redirected before any dashboard content is sent, and admin pages are excluded from search engines.

Customers don't have accounts, so each order page sits behind a random UUID rather than a guessable order number.

### Customer data is not reachable from the browser

Supabase's public key ships to every browser, so it can't be what protects the data. Row Level Security is enabled on every table with no public policies, and the app reaches the database only from the server. I checked this by querying as the public role: it sees zero rows in every table, and its updates change nothing.

### The database enforces the rules too

Application checks are backed by [database constraints](db/schema.sql). Stock can't go below zero, an order can't hold an unknown status, and payment references must be unique, even if a future code change contains a bug.

### A payment setup problem can't hide an order

During deployment, a missing environment variable crashed the order page. I traced the failure to the QR step, reproduced it on a local production build, and changed the page so this kind of failure is logged while the customer still sees their order and payment reference.

### Validation rules are shared

The checkout form and the orders API use the same rules from [`lib/checkout.ts`](lib/checkout.ts). Customers get instant feedback in the browser, while the server still checks every request independently.

## How an order works

```mermaid
sequenceDiagram
    actor Customer
    participant App as Next.js app
    participant DB as PostgreSQL
    actor Owner as Shop owner

    Customer->>App: Place order (product IDs and quantities)
    App->>DB: Lock products, check stock, create order, reduce stock
    DB-->>App: Order created
    App-->>Customer: Order page with PayNow QR code
    Customer->>Customer: Scan and pay in banking app
    Owner->>App: Confirm payment in dashboard
    App->>DB: Validate status change and record payment time
    Customer->>App: Check status every 5 seconds
    App-->>Customer: Page updates to "Paid"
```

## API

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/prefectures` | Public | List prefectures with their products |
| `GET` | `/api/products?prefecture=` | Public | List active products, optionally by prefecture |
| `POST` | `/api/orders` | Public | Validate and place an order |
| `GET` | `/api/orders/[id]/status` | Anyone with the order's UUID | Read an order's status |
| `GET` | `/api/admin/orders?status=` | Admins | List orders, optionally by status |
| `PATCH` | `/api/admin/orders/[id]` | Admins | Apply a valid status change |

## Project structure

```text
app/
  page.tsx             Storefront
  products/[slug]/     Product page
  cart/, checkout/     Cart and checkout
  orders/[id]/         Order status and PayNow QR code
  admin/               Login and order dashboard
  api/                 Public and admin API routes
components/            Cart state, status polling and shared UI
db/
  schema.sql           Tables, constraints and access rules
  seed.sql             Sample prefectures and products
lib/
  checkout.ts          Shared validation
  paynow.ts            PayNow QR payload builder
  queries.ts           Catalogue and order queries
  admin-auth.ts        Admin access check
  supabase/            Browser and server auth clients
```

## Data model

| Table | Purpose |
| --- | --- |
| `prefectures` | Regions and prefectures, with English and Japanese names |
| `products` | Catalogue, price in cents, stock and active status |
| `orders` | Customer details, total, payment reference, status and payment time |
| `order_items` | Items in each order, with the name and price at the time of purchase |
| `admins` | Supabase user IDs allowed to use the dashboard |

```mermaid
erDiagram
    prefectures ||--o| products : "has one"
    products |o--o{ order_items : "appears in"
    orders ||--o{ order_items : contains
    auth_users ||--o| admins : "may be"
```

The full definition is in [`db/schema.sql`](db/schema.sql).

## Running locally

You'll need a current Node.js LTS release and a Supabase project. In the Supabase SQL editor, run [`db/schema.sql`](db/schema.sql) and then [`db/seed.sql`](db/seed.sql).

```bash
git clone https://github.com/Jaydenbong/kitty-gotochi.git
cd kitty-gotochi
npm install
```

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # Supabase publishable key
DATABASE_URL=                        # PostgreSQL connection string
PAYNOW_PROXY_TYPE=mobile             # mobile or uen
PAYNOW_PROXY_VALUE=                  # Mobile number or UEN that receives payment
PAYNOW_MERCHANT_NAME=                # Name shown in the banking app
```

Then start the app:

```bash
npm run dev
```

The site runs at <http://localhost:3000>. To use the dashboard at `/admin`, create a user in Supabase Auth and add that user's ID to the `admins` table.

To check the code:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## What I'd build next

- **Automated tests** for the order transaction, status rules and QR payload
- **Automatic payment matching**, since the owner currently confirms each PayNow payment by hand
- **Expiry for unpaid orders**, since unpaid orders hold their stock until they're cancelled
- **Email confirmations** for order and shipping updates
- **Rate limiting** on the public orders endpoint

---

Built by [Jaydenbong](https://github.com/Jaydenbong). Kittycat is an independent project and is not affiliated with Sanrio.
