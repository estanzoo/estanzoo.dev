# Cloudflare: domain, hosting, email and analytics

The site is hosted on Cloudflare Workers (static assets, no Worker script) under the domain `estanzoo.dev`. These steps are done by hand in the Cloudflare dashboard (dash.cloudflare.com). Do them in this order. Menu labels are the dashboard's labels at the time of writing; when Cloudflare renames one, update this file.

## 1. Buy the domain (Registrar)

1. Sidebar → **Domain Registration** → **Register Domains**.
2. Search `estanzoo.dev` and select it.
3. Fill in the registrant contact, keep WHOIS redaction on, and pay.
4. Wait until the domain shows as **Active** under **Domain Registration** → **Manage Domains**. The zone `estanzoo.dev` now appears under **Websites** with Cloudflare DNS.

`.dev` is on the HSTS preload list: browsers load it over HTTPS only. Cloudflare issues the certificate; nothing else to do.

## 2. Create the Worker (Connect to Git)

The dashboard no longer offers new Pages projects, so the site deploys as a Worker that serves only static files. `wrangler.jsonc` at the repository root names the Worker `estanzoo-dev` and serves `./dist`.

1. Sidebar → **Workers & Pages** → **Create** → **Import a repository** (Connect to Git).
2. Authorize the Cloudflare GitHub app for the site's repository only, and select the repository.
3. **Set up your application**:

   | Field | Value |
   |---|---|
   | Project name | `estanzoo-dev` (it must match `name` in `wrangler.jsonc`) |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Root directory | `/` |

4. Under **Advanced settings** → **Build variables**, add `NODE_VERSION` = `24` (it matches `.nvmrc`).
5. **Deploy**. Wait for the first deployment to succeed and open the `*.workers.dev` URL to check it.

The production branch is the repository's default branch, `main`: every push to `main` deploys production. Pushes to other branches upload preview versions when **Builds for non-production branches** is on (Settings → Build).

## 3. Custom domain: root and www

1. **Workers & Pages** → the `estanzoo-dev` Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**.
2. Enter `estanzoo.dev` → **Add domain**. Cloudflare adds the DNS record and certificate.
3. Repeat with `www.estanzoo.dev`.
4. Wait until both show **Active**.

### Redirect www to the root

1. Sidebar → **Websites** → `estanzoo.dev` → **Rules** → **Overview** → **Create rule** → **Redirect Rule**.
2. Pick the template **Redirect from WWW to root**.
3. Check that it matches `www.estanzoo.dev` and redirects to `https://estanzoo.dev` with status 301 and the path and query string preserved.
4. **Deploy**.
5. Check: `curl -sI https://www.estanzoo.dev/` returns `301` with `location: https://estanzoo.dev/`.

## 4. Email Routing: hello@ to the owner's inbox

The site's public address is `hello@estanzoo.dev`. Mail to it is forwarded to the owner's personal Gmail. The personal address is not written in this repository.

1. **Websites** → `estanzoo.dev` → **Email** → **Email Routing** → **Get started** (or **Enable Email Routing**).
2. **Destination addresses** → **Add destination address** → enter the owner's Gmail address.
3. Open the verification mail from Cloudflare in that Gmail inbox and click **Verify email address**. The destination shows **Verified**.
4. **Routing rules** → **Create address**: custom address `hello`, action **Send to an email**, destination the verified Gmail address → **Save**.
5. When the dashboard asks, click **Add records and enable**. Cloudflare adds the MX and SPF (TXT) records.
6. Check: send a mail to `hello@estanzoo.dev` from another account and confirm it arrives in Gmail.

## 5. Web Analytics

1. Sidebar → **Analytics & Logs** → **Web Analytics** → **Add a site** → `estanzoo.dev` → **Done** (automatic setup for a proxied zone).
2. Cloudflare injects the analytics beacon at its edge. If no data appears after a day of traffic, check that the site is proxied (orange cloud) under **DNS**.
3. The numbers are under sidebar → **Analytics & Logs** → **Web Analytics**.

No cookie banner is needed: Cloudflare Web Analytics sets no cookies.
