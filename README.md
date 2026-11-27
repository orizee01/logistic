# SwiftDrop Logistics

A delivery platform where customers (pre-seeded, or self-registered by email) set a password, book deliveries, and track them; dispatchers assign riders; and riders update the delivery status.

```
server/   Node.js + TypeScript + Express 5 + PostgreSQL (pg-promise, raw SQL, Joi, JWT, bcrypt)
client/   React + Vite + TypeScript
```

## Delivery lifecycle

```
pending ──(dispatcher assigns rider)──▶ assigned ──(rider)──▶ picked_up ──▶ in_transit ──▶ delivered
   │                                       │                       └──────────────────────▲
   └──(customer cancels)──▶ cancelled      └── dispatcher can reassign until picked up
```

Every transition is written to `delivery_status_history`, which powers the customer's tracking timeline.

## How seeded customers log in

Seeded customers have `password_hash = NULL`, so they **cannot** log in until they set a password themselves. There is no shared default password.

1. The customer opens **Set up your password** (`/activate`) and enters their email.
2. `POST /api/v1/auth/activation/request` creates a random, single-use token, stores only its SHA-256 hash, and expires it after 60 minutes. An unknown customer email creates a new customer account (self sign-up); rider accounts must already exist. The response never reveals whether an email was already registered.
3. The link is "emailed". In development, `src/utils/mailer.ts` prints it to the server console. In production, replace that function with a real email provider.
4. The customer opens the link, chooses a password, and `POST /api/v1/auth/activation/complete` stores the bcrypt hash and marks the token as used.
5. `POST /api/v1/auth/login` now works and returns a JWT.

Riders use the same flow (`accountType: "rider"`). Admins are created by the seed script from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Getting started

Prerequisites: Node 20+ and PostgreSQL 13+.

```bash
# 1. Database
createdb logistic

# 2. API
cd server
cp .env.example .env
#    set JWT_SECRET, and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD for a staff login
npm install
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:4000

# 3. Web app (new terminal)
cd client
npm install
npm run dev            # http://localhost:5173  (proxies /api to :4000)
```

### Or run both with one command

From the project root, after creating `server/.env`:

```bash
npm run install:all   # installs root, server and client dependencies
npm run db:setup      # migrate + seed
npm run dev           # starts API (:4000) and web app (:5173) together
```

### Sign-in pages

Each account type has its own sign-in page:

| Who | URL |
|---|---|
| Customers | http://localhost:5173/login |
| Riders | http://localhost:5173/rider/login |
| Staff (admin / dispatcher) | http://localhost:5173/staff/login |

The customer page doesn't link to the rider or staff pages. Share those URLs directly with riders and staff.

### Try it end to end

1. **Customer:** open `/login` → "Set up your password". Enter `ada@example.com`, copy the link from the server console, and choose a password. Then sign in and book a delivery.
2. **Rider:** open `/rider/login` → "Set up your password" and activate `musa.rider@example.com` the same way.
3. **Staff:** sign in at `/staff/login` with your seed admin credentials and assign Musa to Ada's delivery.
4. **Rider:** mark the delivery picked up, in transit, then delivered.
5. **Customer:** open the delivery and watch the progress tracker and timeline update.

## API

**Interactive docs (Swagger UI):** http://localhost:4000/api/docs. The raw OpenAPI spec is at `/api/docs.json`, which you can import into Postman. To call protected endpoints from Swagger UI, run a login endpoint, click **Authorize**, and paste the `token`. The spec lives in `server/src/docs/openapi.ts`; update it whenever you change a route or Joi schema.

All routes are prefixed with `/api/v1`. Authenticated routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Customer login |
| POST | `/auth/rider/login` | public | Rider login |
| POST | `/auth/staff/login` | public | Admin / dispatcher login |
| POST | `/auth/activation/request` | public | Send a set-password link `{ email, accountType? }` |
| POST | `/auth/activation/complete` | public | Set password `{ token, password }` |
| GET | `/customers/me` | customer | Logged-in customer's profile |
| POST | `/deliveries` | customer | Create a delivery |
| GET | `/deliveries?limit&offset` | customer | List **own** deliveries |
| GET | `/deliveries/:id` | customer | One **own** delivery + tracking history |
| PATCH | `/deliveries/:id/cancel` | customer | Cancel a pending delivery |
| GET | `/admin/deliveries?status&limit&offset` | admin, dispatcher | List all deliveries |
| GET | `/admin/deliveries/:id` | admin, dispatcher | Delivery + history |
| GET | `/admin/riders` | admin, dispatcher | Riders with availability & load |
| PATCH | `/admin/deliveries/:id/assign` | admin, dispatcher | Assign / reassign `{ riderId }` |
| GET | `/rider/me` | rider | Rider profile |
| PATCH | `/rider/me/availability` | rider | Go on/off duty `{ isAvailable }` |
| GET | `/rider/deliveries?status` | rider | Deliveries assigned to me |
| PATCH | `/rider/deliveries/:id/status` | rider | `{ status: picked_up \| in_transit \| delivered, note? }` |

Example create-delivery body:

```json
{
  "pickupAddress": "12 Admiralty Way, Lekki, Lagos",
  "deliveryAddress": "4 Allen Avenue, Ikeja, Lagos",
  "recipientName": "Tunde Ade",
  "recipientPhone": "+2348031234567",
  "packageDescription": "Documents in an envelope",
  "packageWeightKg": 0.5,
  "notes": "Call on arrival"
}
```

## Security notes

- **Customers only ever see their own deliveries.** The customer ID always comes from the verified JWT (`authId(req)`), never from the body or query. The ownership check lives in the SQL `WHERE d.id = $<id> AND d.customer_id = $<customerId>`, and a delivery that isn't yours returns 404, not 403.
- Riders can only update deliveries assigned to them, and only along valid transitions (`RIDER_TRANSITIONS` in `delivery.service.ts`).
- Login returns the same `Invalid credentials` error for an unknown email, a wrong password, an account that isn't activated yet, or a deactivated account. Unknown emails are still compared against a dummy bcrypt hash, so response timing doesn't reveal which emails exist.
- Auth routes are rate-limited (20 requests per 15 minutes per IP). Passwords use bcrypt (cost 12). JWTs are HS256, expire after 1h, and require a secret of at least 32 characters.
- Assignments and status changes run in transactions with `SELECT … FOR UPDATE`, so concurrent dispatchers or riders can't put a delivery into an inconsistent state.

## Project layout

```
server/
├── migrations/001_init.sql        schema
├── seeds/                         customers.sql, riders.sql
└── src/
    ├── app.ts / server.ts
    ├── config/env.ts
    ├── database/                  db.ts, migrate.ts, seed.ts
    ├── middleware/                auth.ts, validate.ts, errorHandler.ts
    ├── routes/index.ts
    ├── utils/                     errors.ts, jwt.ts, mailer.ts
    └── modules/
        ├── auth/                  controller, service, repository, validation, routes
        ├── customers/             controller, service, repository, query, routes
        ├── deliveries/            controller, service, repository, query, validation, routes
        ├── admin/                 controller, routes
        └── riders/                controller, repository, routes
```

## Deployment (Render)

`render.yaml` defines a Postgres database, the API (migrations run as a pre-deploy step), and the static React site. After the first deploy, set:

- `CLIENT_URL` on **logistic-api** to the static site's URL (used for CORS and activation links)
- `VITE_API_URL` on **logistic-web** to the API's URL

Then run `npm run db:seed` once from the API service's shell. Before going live, replace the console mailer with a real email provider.

## Deployment (Vercel)

The repository includes `vercel.json` and a serverless API entry point.

1. Provision a PostgreSQL database (for example, Neon or Vercel Postgres).
2. Import `https://github.com/orizee01/logistic.git` in Vercel.
3. Set these environment variables in Vercel:
   - `DATABASE_URL`
   - `JWT_SECRET` (at least 32 characters)
   - `NODE_ENV=production`
   - `CLIENT_URL=https://<your-vercel-project>.vercel.app`
   - `VITE_API_URL=` (leave empty because the frontend and API share the same domain)
   - Optional mail settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
   - Optional seed values: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`
4. Deploy the project.
5. Run migrations and seeding once from a local terminal with the production database URL:

```bash
DATABASE_URL='postgresql://...' JWT_SECRET='at-least-32-characters' \
  npm --prefix server run db:migrate

DATABASE_URL='postgresql://...' JWT_SECRET='at-least-32-characters' \
  SEED_ADMIN_EMAIL='admin@example.com' \
  SEED_ADMIN_PASSWORD='a-strong-password' \
  npm --prefix server run db:seed
```
