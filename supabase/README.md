# Backend Setup — Supabase

Your app runs on a real backend (Postgres database + Auth + live sync)
instead of the browser's `localStorage`. That means:

- Data is safe if you clear your browser cache, switch browsers, or get a new device.
- Multiple people can use the app at the same time and see each other's changes live.
- Login is enforced server-side (not just hidden in the frontend code).

Everything below is a one-time setup. Takes about 15 minutes.

---

## 1. Create a free Supabase project

1. Go to https://supabase.com and sign up (free tier is enough for this app).
2. Click **New Project**. Pick any name/region, set a database password (save it somewhere).
3. Wait ~2 minutes for the project to finish provisioning.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy the whole file, paste it into the editor, click **Run**.
4. Click **New query** again, open `supabase/auth_hardening.sql`, copy the whole
   file, paste it in, and **Run** it too.
5. Then run, in order: `migration_v2_deliveries.sql`, `migration_v3_organizations.sql`,
   `migration_v4_hierarchy.sql`, `migration_v5_accessories.sql` and finally
   `migration_v6_backend_fixes.sql` (accessory columns, per-organization unique
   serials/channels, realtime, and an API schema-cache reload) and
   `migration_v7_accommodation.sql` (Accommodation rooms, members and the live
   meal menu). Every one of them can be re-run safely.
6. Accommodation permissions (set in the app under **Settings -> Team & Users ->
   Access level**, or with SQL — see the bottom of `migration_v7_accommodation.sql`):
   - **Owner** can add/edit/delete rooms and members and move people between rooms.
   - **Sub-dept head + Accommodation** can edit the meal menu and the live status.
   - Everyone else who is signed in can view both.

`schema.sql` creates all 6 tables (`profiles`, `departments`, `walkies`,
`allocations`, `maintenance`, `history`), sets up baseline security rules,
turns on live sync, and seeds demo data.

`auth_hardening.sql` upgrades the auth setup for real sign-ups and password
resets — it also **fixes two privilege-escalation bugs** that existed in the
original schema (a signed-up user could set their own role to `Admin`, and
`raw_user_meta_data` sent from the browser was trusted for role assignment).
Run it even on a project that already has `schema.sql` applied.

## 3. Get your API keys

1. In Supabase: **Settings** → **API**.
2. Copy the **Project URL** and the **anon / public key**.
3. In this project's root folder, copy `.env.example` to a new file named `.env`.
4. Paste in your values:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Never share the **service_role** key or commit `.env` to git — the `.gitignore` already excludes it.

## 4. Configure Auth URLs (needed for password reset emails to work)

1. In Supabase: **Authentication** → **URL Configuration**.
2. Set **Site URL** to your app's URL (e.g. `http://localhost:3000` for local
   dev, or your deployed URL in production).
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/` (for local dev)
   - `https://your-deployed-domain.com/` (for production, once deployed)

The app redirects the password-reset link back to the site root and reads
the recovery token from the URL hash, so no extra path (like
`/reset-password`) needs to be whitelisted — this also avoids needing a
server-side rewrite rule on static hosts.

## 5. Decide on email verification

1. In Supabase: **Authentication** → **Providers** → **Email**.
2. **"Confirm email" ON** (recommended): new sign-ups must click a
   verification link before they can log in. The app already shows a
   "check your email" message and a resend button for this case.
3. **"Confirm email" OFF**: fine for a small internal/trusted team — new
   accounts can sign in immediately after signing up.

## 6. Create your first Admin

Real accounts now go through the app's own **Create an account** screen (or
you can add one manually from the Supabase dashboard). Either way, every new
sign-up starts as a read-only **Client** — that's enforced server-side, not
just in the UI — so you need to promote your first Admin by hand once:

1. Sign up for an account from the app's login screen (or **Authentication**
   → **Users** → **Add user** in the dashboard).
2. In Supabase **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'Admin' where email = 'you@yourcompany.com';
   ```
3. Sign in — you'll now see the **Users** tab in the sidebar, where you can
   promote/demote other people's roles and disable accounts, no SQL needed
   from here on.

## 7. Install and run

```bash
npm install
npm start
```

That's it — the app now reads/writes to your Supabase database, and any
change made by one signed-in user shows up live for everyone else.

---

### FAQ

**Do I need to keep paying for anything?**
No — Supabase's free tier covers this comfortably for a small team (500MB
database, 50k monthly active users, 2GB file storage, unlimited API requests
within fair use).

**What if I want to deploy this so it's not just on my laptop?**
Build the app (`npm run build`) and host the `build/` folder on any static
host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.). The Supabase
backend is already cloud-hosted, so the frontend can live anywhere. Remember
to add the deployed URL to Redirect URLs (step 4) too.

**Can I still use it offline / without Supabase?**
Not with this version — it now requires a Supabase connection to load data.
If you ever want a hybrid (offline-first with sync), that's a separate,
bigger change — just ask.

**How do I fully delete a user, not just disable them?**
Disabling (from the Users tab) immediately blocks sign-in and is enough for
almost everyone. Deleting the underlying Supabase Auth account requires the
`service_role` key, which intentionally never lives in the frontend — do
that from **Authentication** → **Users** → delete, in the Supabase dashboard.

**Something's not loading / blank screen.**
Open the browser console (F12). The most common cause is a missing or wrong
`.env` file — the app logs a clear error for that. Make sure you restarted
`npm start` after creating `.env` (env vars are only read at startup).

---

## Inventory & Purchase migrations (run in this order, after v7)

| File | What it adds |
|------|--------------|
| `migration_v11_inventory.sql` | Inventory items + stock ledger |
| `migration_v12_inventory_crud.sql` | Editable categories |
| `migration_v13_inventory_locations.sql` | Stock is issued to a **location** (Gate 3, Main Stage...), not a department. Every movement records **given by / received by / returned by**. Old department data is converted automatically. |
| `migration_v14_purchase.sql` | Vendors, purchase orders, goods received, payments |

All of them can be re-run safely.

**Inventory movements**
- *Issue*: send stock to a location. Given by (store person), Received by (person at the location, required).
- *Return*: bring stock back from a location. Returned by (required), Received by (store).
- *Receive*: new stock into the store. Received from (vendor), Received by.

**Purchase permissions**
- View: owner, IT head, Purchase and Inventory sub-department.
- Create / edit orders, vendors, payments: owner, IT head, Purchase sub-department.
- Approve / reject: owner and IT head only.
- Receive goods: the above + Inventory sub-department.

**Purchase order life:** draft -> awaiting approval -> approved -> ordered -> partly received -> received.
When goods are received against an order line that is linked to an inventory item, the stock is added to Inventory
automatically (a "receive" entry with the PO number as reference).

