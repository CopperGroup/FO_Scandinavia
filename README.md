# Nordiva

Online shop (storefront and admin panel) on Next.js 14 (app router), MongoDB and Redis.

## Local development (never touches production)

`next dev` reads `.env.development.local`, which points the app at a local MongoDB and a
local Redis, and switches off e-mail, analytics and Nova Poshta.

```bash
npm ci                      # .npmrc sets legacy-peer-deps (next-auth and nodemailer disagree on a peer version)
npm run db:local            # MongoDB on 127.0.0.1:27018 (data in .local/mongo)
npm run db:seed             # one-off: copies production into the local database, read-only
npm run redis:local         # optional: Redis on 127.0.0.1:6380 (needs Docker); without it the cache stays in memory
npm run dev
npm test                    # unit tests: catalog engine, storefront helpers, import, admin helpers
```

`db:seed` only ever issues `listCollections`, `listIndexes` and `find` against
production and refuses to write anywhere but a loopback address.

### Checking the production build locally

`next build` and `next start` read `.env.local`, which holds the production settings.
To run the production build against the local services instead:

```bash
npm run build:local         # builds into .next-prod, so `npm run dev` can keep running
npm run start:local         # http://localhost:3100
```

`tools/local-db/next-local.mjs` loads `.env.development.local` first and refuses to
start if the database is not local or an e-mail, Nova Poshta or analytics key is set.

## Catalog engine (`lib/catalog`)

One module decides how products become catalog cards and size/colour choices; the
catalog page, the product page, search, the menu, the sitemap and the admin overview all read from it.

- **Group**: the same item in different sizes (one card). Derived from the article
  number (`1354663001-XS` -> `1354663001`), confirmed by the size param or the name.
- **Model**: groups that are the same item in different colours (shown as thumbnails).
- Every product of a group is always reachable from the product page; sold-out
  sizes are shown struck through, never hidden.
- **Departments** (`departments.ts`): the flat category list is sorted into
  Жінкам / Чоловікам / Дітям / Взуття / Дім / Продукти by category name, so a new
  category appears in the menu without anyone editing it. Empty categories and
  import leftovers are left out.
- **Brands** (`vendors.ts`): spellings such as `H&M`, `Hennes&Mauritz`, `ELLOS`
  are merged into one name per brand.
- `lib/catalog/server/service.ts` builds an immutable snapshot from MongoDB, keeps it
  in memory and publishes it to the cache under a new generation key, switching readers
  over by flipping one pointer. Product, category, filter and order actions invalidate it;
  the admin overview has a button that forces a rebuild.

### Cache

| `CATALOG_CACHE_DRIVER` | Used when | Notes |
| --- | --- | --- |
| `redis` (default) | `REDIS_URL` is set | Self-hosted Redis; `docker-compose.yaml` runs one next to the app |
| `upstash` | only the Upstash credentials are set | The previous setup, kept as a fallback |
| `memory` | nothing is configured | Per process; fine for development |

The cache is never required: when Redis is unreachable the site serves from memory or
rebuilds from MongoDB, and asks the cache again a minute later.

Page-level caches are dropped through one function, `clearCache(event, productId?)` in
`lib/actions/cache.ts`. Call it once per action; it also invalidates the catalog snapshot
for the events that change what the catalog shows.

## Storefront (`components/storefront`, `app/(root)`)

- Header with search suggestions and a department menu, mobile menu and bottom tab bar,
  cart drawer, footer: `components/storefront/*`.
- The department menu is a `MenuConfig` (`lib/catalog/departments.ts`). Until the owner edits
  it in the admin ("Меню") it is the automatic one, built from the category names; once saved
  it is exactly what the owner made. `buildNavigation()` drops departments with nothing in
  stock, and a stocked category that is in no department still shows under "other".
- Catalog URL contract (filters, sorting, paging): `lib/storefront/catalog-url.ts`.
- Design tokens: `brand.*` colours and the `font-display` / `font-sans` families in
  `tailwind.config.ts`; shared classes (`.shell`, `.btn-primary`, `.field`, ...) in `app/globals.css`.
- Sticky layout: the header publishes its height as CSS variables (`--header-h`,
  `--sticky-top`) in `app/globals.css`. Anything that sticks under the header uses
  `top: calc(var(--sticky-top) + N)`, so it follows the header when it collapses on scroll.
- Orders are priced and stock is reserved on the server (`createOrder` in
  `lib/actions/order.actions.ts`). Nothing about money or about who is ordering is taken
  from the browser: a signed-in customer orders for their own account, a guest is matched by e-mail.
- Shop contacts (phone, e-mail, messengers) are edited in the admin at `/admin/settings`;
  `getStoreContacts()` in `lib/storefront/session.ts` reads them.
- Texts the owner can change (home headline, the four tiles, where they and the links under
  them lead, the
  advantages row, rail titles, product-page notes, delivery and payment, returns, footer,
  the two legal documents) are listed in `lib/content/schema.ts` and read on a page with
  `getContent("<page>")` from `lib/content/server.ts`. One cached read serves the whole
  site and is dropped on save. If the database is unreachable the defaults are shown.
- The free-delivery sum is one of those values (`getFreeDelivery()`); client components get
  it from `useShopSettings()`. Order totals use the same value on the server.
- Advertising pixels (Meta, TikTok): the root layout reads the active pixels on the server
  (`lib/pixels/server.ts`, cached) and passes them to `components/pixel/FacebookPixel.tsx`.
  Events are sent with `trackFacebookEvent()` from `helpers/pixel.ts`.

### Sizes (storefront)

The storefront is laid out for a phone first and must hold at 320px. Its sizes come from one
system, the same idea as the admin's but with touch sizes:

| What | Values | Classes |
| --- | --- | --- |
| Text / line | 12/16, 14/20, 16/24 (body, buttons, fields), 18/28, 20/28, 24/32, 30/36, 36/40 | `text-xs` … `text-4xl`, never `text-[15px]` |
| Controls | 44 (secondary, chips, icon buttons), 48 (buttons, fields, the search field) | `h-11`, `h-12` |
| Pinned bars | tab bar 56, buy bar on the product page 64, border included | `h-14`, `h-16` |
| Space | multiples of 4; page gutter 16 (24 from 640px), the same in drawers | `px-4`, `gap-3`, never `-1.5` / `-2.5` |
| Corners | 2 photos, tags and marks; 6 controls and panels; 12 the top of a sheet | `rounded-sm`, `rounded-md`, `rounded-t-xl` |
| Icons | 16, 20, 24 (40 for an empty-state picture) | `h-4 w-4` … `h-6 w-6` |

Rules that keep a phone page sound:

- A field has 16px text: iOS zooms the page when a focused field has less.
- Everything a finger presses is 44px high. An icon in a 36px circle or a one-line text link
  keeps its look and gets the 44px around it (`h-11 w-11` button with the circle inside;
  `-my-3 inline-flex min-h-11 items-center` on a link).
- Nothing may be covered by a pinned bar. The bars mark themselves with
  `data-bottom-bar="tabs|buy"`; `app/globals.css` turns that into `--bottom-bar` and pads the
  end of the page by it, and the floating contact button stands on top of it.
- A row that cannot fit 288px wraps (`flex-wrap`) instead of pushing the page wider; a row
  that scrolls sideways on purpose (`.rail`) sets `scroll-px-*` so snapping keeps the gutter.
- Product photos go through `components/storefront/Photo.tsx`: the frame takes the photo's own
  background colour, so a photo shot on grey has no white bands beside it.
- An address no page answers is caught by `app/(root)/[...missing]/page.tsx` and shown the
  storefront's own `not-found.tsx`.

### Search engines

- `lib/seo.ts` holds what is shared: `absoluteUrl`, `clip` (snippets cut at a word),
  `catalogCanonical`, `listingTitle`, `departmentSearchName`, `breadcrumbJsonLd`.
  `components/seo/JsonLd.tsx` prints structured data.
- `metadataBase` is set in both root layouts, so canonical links and Open Graph images are
  absolute addresses of the shop, not of the machine the build runs on.
- Canonical addresses: home and info pages name themselves; a category is indexed under
  `/catalog?department=<its first department>&categories=<id>` whatever department it was
  opened from; a department under `/catalog?department=<key>`. Filtered, sorted, searched and
  second pages stay `noindex, follow` and have no canonical.
- Brand pages: `/catalog?vendor=<name>` is indexed when the brand is all the address asks for
  and the brand has at least `BRAND_PAGE_MIN` (5) cards in stock (`getBrandPages()` in
  `lib/storefront/navigation.ts`). The heading is the brand name; smaller brands and a brand
  combined with any other filter stay `noindex`.
- Titles: listing pages say what is sold ("… — купити в Україні"). A built-in department with
  its short built-in heading gets a longer search wording; a heading the owner wrote in "Меню"
  is used as written. A product's description starts with the price and availability.
- Texts on listing pages: a department's text ("Меню") and a category's text ("Категорії" →
  "Загальне") are shown under the products, on the unfiltered first page only.
- Product pages: each size is its own page. The structured data is a `ProductGroup` holding
  this size in full (`Product` + `Offer` with `itemCondition`, and the crossed-out price as
  `StrikethroughPrice`) and the addresses of the other sizes, which is Google's markup for
  variants on separate pages. Catalog and product pages print `BreadcrumbList`; the home page
  prints `WebSite` and `OnlineStore`. Reviews are in the same structured data (`review`,
  `aggregateRating`, every review counted), not in microdata.
- Return and delivery terms (`lib/policies.ts`): the offer carries `hasMerchantReturnPolicy`
  and `shippingDetails` built from what the owner set in "Налаштування" → "Доставка і
  повернення". Nothing is assumed: no return window means no return markup, and delivery is
  stated only when its cost is known (the stated cost, or 0 for a product that alone reaches
  the free-delivery sum).
- `app/sitemap.ts` lists the home page, the info pages, every department and category under
  its canonical address, the brand pages and every product that can be bought ("&" is escaped by hand: this
  version of Next writes addresses into the XML as they are).
- A product that does not exist is `null` from `fetchProductForPage`; a database failure is
  thrown, so it becomes an error page instead of a "not found" page a search engine would
  take as "this product is gone".
- There is no `loading.tsx` in `app/(root)` on purpose: with one the page starts streaming
  before it knows whether the product exists, and a missing page answers 200 instead of 404.

## Admin (`components/admin`, `app/admin`)

`AdminShell` is the frame (navigation, top bar). Every page is built from one kit; open
`/admin/kit` in a running app to see all of it.

- `components/admin/ui.tsx`: `AdminPage`, `Panel`, `StatTile`, `EmptyState`, `Pill`,
  `Field`, `Hint`, `Tabs`, `SearchForm`, `Pagination`, and the class strings `adminButton.*`,
  `adminButtonSm.*`, `adminInput`, `adminInputSm`, `adminTextarea`, `adminTable.*`.
- `components/admin/Select.tsx`: the only select of the panel. Plain for short lists,
  searchable from nine options; opens up or down depending on the room it has.
  There is no `<select>` element anywhere in the admin, and none should be added.
- Layouts that keep pages short:
  - `FormLayout` + `AsideCard`: a form with a side column that stays in view. The side column
    is for information only (status, a preview, numbers), never for buttons or inputs;
  - `SectionNav`: sticky jump links for a long record;
  - `SplitView`: a list or tree on the left, the chosen item on the right (categories, filters);
  - `SaveBar`: the action bar pinned to the bottom of the window. Saving a form and moving
    through steps happen here, on every screen size.
- `Pagination` works with links (`hrefFor`, for server pages) or callbacks (`onPage`, for a
  list a client component holds in memory). Lists pass `total`, `pageSize` and `jump`;
  long ones also pass `sizes`.
- Copy is written for a shop owner: no «фід», no ids shown as names, every error says what
  happened and what to do next.

### Sizes

The panel is built from one unit, 4px, at the normal 16px root. The numbers are the ones the
large design systems for work tools agree on (Material, Carbon, Fluent, Primer, Ant Design:
14px text on a 20px line, a 4px grid, controls of 32 to 40px). They are set once, as CSS
variables on the admin `<html>` (`app/globals.css`, "Admin proportions") that
`tailwind.config.ts` reads, so the ordinary Tailwind classes give these sizes inside the
admin and Tailwind's own sizes in the storefront.

| What | Values | Classes |
| --- | --- | --- |
| Text / line | 12/16, 14/20 (body), 17/24, 20/28, 24/32, 29/36: each step is 1.2 times the last | `text-xs` … `text-2xl` |
| Control height | 36 (one 20px line + 8 above and below), 28 for a table row or a tight toolbar; 44 and 36 on a touch screen | `h-control`, `h-control-sm` |
| Other heights | 20 tag, 40 tab and table row, 56 top bar | `h-5`, `h-10`, `h-14` |
| Space | 4, 8, 12, 16, 24, 32, 48. Panel padding 16, between panels 16, page gutter 24 | `p-4`, `gap-4`, `px-6` |
| Corners | 4 marks and tags, 6 controls, 8 panels and menus, 12 dialogs | `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl` |
| Icons | 16 in a control or a row, 20 standing alone | `h-4 w-4`, `h-5 w-5` |

Use the kit strings for buttons and fields instead of writing heights by hand, and no
arbitrary sizes (`text-[13px]`, `h-[30px]`): a page that needs one is a page that left the
system. A pointer target is never under 24px (WCAG 2.2, 2.5.8).

### Tooltips

`components/admin/TipLayer.tsx` is mounted once in `AdminShell` and serves the whole panel,
server and client components alike:

- `data-tip="…"` on any element shows the text on hover and on keyboard focus
  (`data-tip-side="right"` for the sidebar). Never the native `title`.
- A button or a link with only an icon shows its `aria-label` by itself.
- Text cut with an ellipsis (`truncate`, `line-clamp-*`) shows in full by itself.
- `<Hint text="…" />` is the small "i" next to a label; `<Field tip="…">` puts one there.
  `<Pill tip="…">` explains a status.

A tooltip adds to the screen: what a thing is, how a number is counted, what a status means.
Words needed to finish a task stay on the page (`Field hint`), because a tooltip cannot be
read on a phone or while typing.

### Settings and variables (`/admin/settings`, `lib/content/variables.ts`)

"Налаштування" keeps what the whole shop shares: the contacts (phone, e-mail, hours,
Telegram, Viber, address) and the variables. A variable is a value that any text edited in
"Сторінки" can name in braces, e.g. `Телефонуйте: {телефон}`; `getContent()` puts the values
in, so changing a value changes every text that names it.

- Contacts: fixed names (`{телефон}`, `{пошта}`, `{графік}`, `{телеграм}`, `{вайбер}`,
  `{адреса}`); the phone and the e-mail must be filled in, and the sidebar shows a mark until
  they are. The header, the footer and `/info/contacts` read the same values
  (`getStoreContacts()`).
- Filled in by the shop: `{магазин}`, `{рік}`, `{сума}` (the free-delivery sum).
- The admin's own: any name of letters, digits, spaces and hyphens.
- Saving a page with a name no variable has is refused, and a variable still named in a saved
  text cannot be deleted, so a customer never reads a bare `{name}`.
- Before variables existed the contacts lived in the "Contacts" record of the `pages`
  collection. A contact that was never saved in "Налаштування" is still read from there, so
  nothing changes on the site until the admin saves; `tools/migrate-contacts-to-variables.mjs`
  makes the copy permanent. A contact saved empty stays empty.

The second tab, "Доставка і повернення", keeps the terms search engines are told
(`lib/policies.ts`, `PolicySettingsForm`): the return window in days, who pays for sending a
return back, days to dispatch, days in transit and the usual delivery cost. An empty field
means "not stated". The texts customers read stay on their pages in "Сторінки"; the form
links to them, because the two must say the same.

### Menu, brands and listing texts

These are stored like the page texts, as records of the `sitecontents` collection read through
the one cached read (`getSetting` / `storeSetting` in `lib/content/server.ts`), keys `menu`,
`brands` and `policies`.

- "Меню" (`/admin/menu`, `lib/menu.ts`, `MenuEditor`): departments with their name, page
  heading, text and columns of categories; add, remove, reorder. "Новинки" and "Знижки" can
  only be hidden. A department's key is made from its name once (`slugify`) and never changes,
  so its address survives a rename. "Повернути автоматичне меню" removes the saved record.
- "Бренди" (`/admin/brands`, `lib/brands.ts`, `lib/admin/brands.ts`): a brand is the `vendor`
  of a product; the list is every vendor in use plus names added by hand. Renaming rewrites
  the field on all products of the brand, and renaming into an existing brand joins the two.
  Spellings of one brand are flagged (`brandTwinKey`: case, punctuation, accents, Cyrillic
  look-alike letters). The product form picks the brand from this list or adds a new one.
- Category text: the `text` field of a category, edited in "Категорії" → "Загальне".

### Page editor (`/admin/pages`, `lib/content`, `components/admin-components/content`)

Fields of the chosen page on the left, the real storefront page on the right.

- To make another text editable: add a field to `lib/content/schema.ts`, read it with
  `getContent()`, and put `data-edit="<page>:<field>"` on the element that shows it. The
  editor form is built from the schema; nothing else is needed.
- The preview is the storefront in a frame, opened with `?preview=1&draft=<page>`.
  `middleware.ts` marks such a request, `previewing()` checks that an administrator made it,
  and only then `getContent()` returns the unsaved draft the editor keeps
  (`saveSiteContentDraft`), and only for the page named in `draft`: an editing session
  abandoned on another page does not show up. Customers never see a draft.
- "Вставити змінну" in the editor lists the variables and writes the chosen name where the
  cursor was.
- `components/content/PreviewBridge.tsx` runs inside the frame: it redraws the page when the
  texts change, highlights the field being edited, and reports clicks back to the editor.
- "Where a tile leads" values (`department:shoes`, `category:<id>`, `sale`, ...) are resolved
  by `lib/content/targets.ts` against the live catalog; a deleted category falls back to the
  whole catalog.
- The small links under a home tile are a list per tile (`shoesLinks`, ...: a name and a
  target each, up to three). An empty list means the shop puts its own there
  (`autoLinkItems`: the clothing departments, or the first columns of the department); the
  editor shows those and "Змінити ці посилання" copies them into the list. A link can also
  lead to a column of the menu (`column:<department key>:<column name>`). A link whose place
  is gone (deleted or sold-out category, renamed column) is not shown, and the editor says so.
- The desktop menu row keeps the page's width whatever the owner puts in it: the departments
  scroll sideways inside the row when they do not fit.

### Access

Every export of a `"use server"` file is a public HTTP endpoint. Actions that read or change
other people's data start with a check from `lib/auth/guards.ts` (`requireAdmin`,
`requireOwner`, `requireUser`); the role is read from the database, not from the session token.

Registering on an e-mail that already has orders made without an account does not open the
account at once: the request waits, inactive, next to the guest record (`claim` in
`lib/models/user.model.ts`), and a letter with a link is sent to that address
(`lib/email/confirm-account.ts`). The account, with the earlier orders in it, opens only
from that link (`/verifyemail`, valid for 24 hours, one use). This needs working mail
credentials (`BREVO_LOGIN`, `BREVO_PASSWORD`); without them such a registration is refused
with a clear message, and Google sign-in still works. New addresses register as before.

### Product import (`/admin/fetchUrl`, `lib/import`)

Four steps: file, field matching, review, import. Field matching is one table: the field of
a product, the field of the file it is filled from, and what the shop will get for one
product of the file (shown the way the shop stores it); the arrows in the table heading walk
through the first products. There is no side column: every button of a step is in its
bottom bar. The file is parsed on the server
(`lib/import/xml.ts`) and kept in memory for an hour; products are matched by article
number, written in batches of 250, and a failed import continues from the batch that failed.
`public/samples/nordiva-sample-feed.xml` is a sample file; everything it creates is marked
(`SAMPLE-…` articles, `sample-…` category ids) and can be removed from the first step of the import.

### Delivery (`/admin/delivery`, `lib/admin/delivery.ts`, `lib/admin/novaposhta.ts`)

Orders waiting for a waybill, created waybills, sender branches and sender details.

The Nova Poshta API key is pasted on the "Відправник" tab. It is sealed with AES-256-GCM
(`lib/secrets.ts`) before it is stored (collection `settings`), is never sent back to the
browser, and the page shows only its last four characters. The sealing key is derived from
`SETTINGS_SECRET`, or `ENCRYPTION_KEY`, or `NEXTAUTH_SECRET` (the first that is set): keep
that variable unchanged on the server, or the saved key has to be pasted again.

Everything that talks to Nova Poshta gets the key from one function, `getNovaPoshtaKey()` in
`lib/admin/np-key.ts`: the saved key first, the `NOVA_POSHTA_API_KEY` variable as a fallback.
Without either the page shows what is not configured and creates nothing.

`.env.development.local` sets its own `SETTINGS_SECRET`, so a key sealed on production cannot
be opened by a local run of a database copy.

## Deploy and backups

The shop runs on its server from `docker-compose.yaml` (the app, a Redis cache, MinIO for
product photos) behind Caddy; the database is in MongoDB Atlas. The server has the old
`docker-compose` (1.29), so the commands are spelled with a hyphen. A release, in the
checkout on the server:

```bash
git pull
docker-compose --env-file .env.local build app      # the live site keeps running while this builds
docker-compose --env-file .env.local down           # never "down -v": the volume holds every product photo
docker-compose --env-file .env.local up -d          # about a minute without the site between these two
```

`--env-file .env.local` is needed every time: the build reads the server's `.env.local`, and
Compose takes the MinIO sign-in (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`) from the same file.
That sign-in is never written in the repository or in the code. The code works without any
database migration; the scripts under "Data maintenance" were run on production on
2026-11-18 and report "nothing to do" since.

The containers publish their ports on `127.0.0.1` only: from the internet the server answers
on 80/443 (Caddy) and 22 (SSH), nothing else. The MinIO admin console is reached through an
SSH tunnel: `ssh -L 9001:127.0.0.1:9001 root@<server>`, then `http://localhost:9001`.

To go back to the version before a release, the previous image is kept under the tag
`fo_scandinavia_app:previous`: `docker tag fo_scandinavia_app:previous fo_scandinavia_app:latest`,
then `down` and `up -d` as above (tag the current image as `previous` before each build).

### Nightly database backup (`tools/backup`)

```bash
# once, on the server, as root
bash tools/backup/install.sh /path/to/the/shop/.env.local
```

This installs `/usr/local/sbin/nordiva-backup` and a systemd timer that runs it every night
at 23:30 Kyiv time. The script takes a full `mongodump` of the database (read-only for the
database; `mongodump` runs from the official `mongo` Docker image, so the server needs
nothing but Docker), writes it to `/var/backups/nordiva/nordiva-<date>_<time>.archive.gz`
and keeps the newest 7. Older ones are deleted only after a new dump was written and
checked, so a failed night never costs an old backup. The database address is read from the
shop's own env file; settings are in `/etc/nordiva-backup.conf`.

```bash
nordiva-backup --list                                  # the backups that exist
systemctl start nordiva-backup                         # take one now
journalctl -u nordiva-backup -n 50 --no-pager          # what the last runs said
systemctl list-timers nordiva-backup.timer             # when the next one is
```

The backups are on the same server as the shop: they protect against a bad change or a
deleted record, not against losing the server. Copy them elsewhere for that.

Restoring puts a dump into a database. Restore into an empty database first and look at it;
`--drop` replaces every collection of the target with the dump's, so use it on the live
database only when that is what you mean:

```bash
# restore into the database named in TARGET_URL
docker run --rm -e TARGET_URL -v /var/backups/nordiva:/backup mongo:7.0 \
  sh -c 'mongorestore --uri="$TARGET_URL" --gzip --archive=/backup/<file>'
```

## Data maintenance (`tools/`)

The scripts are dry runs unless `--apply` is passed, take the database address only from
an environment variable, and refuse a non-local host unless `--allow-remote` is passed too.

```bash
# Categories named after ids, references to deleted categories, product lists out of sync
REPAIR_MONGODB_URL="<url>" node tools/repair-categories.mjs            # report
REPAIR_MONGODB_URL="<url>" node tools/repair-categories.mjs --apply

# Indexes for the order and client lists; makes the order number unique
INDEX_MONGODB_URL="<url>" node tools/create-indexes.mjs               # report
INDEX_MONGODB_URL="<url>" node tools/create-indexes.mjs --apply

# Nova Poshta key and sender data: from an env file into the database (the key is sealed)
SETTINGS_MONGODB_URL="<url>" node tools/migrate-settings-from-env.mjs --env .env.local          # report
SETTINGS_MONGODB_URL="<url>" node tools/migrate-settings-from-env.mjs --env .env.local --apply

# Shop contacts: from the old "Contacts" record into "Налаштування" (variables)
SETTINGS_MONGODB_URL="<url>" node tools/migrate-contacts-to-variables.mjs                        # report
SETTINGS_MONGODB_URL="<url>" node tools/migrate-contacts-to-variables.mjs --apply
```

`migrate-settings-from-env.mjs` moves `NOVA_POSHTA_API_KEY`, `NOVA_SENDER_REF`,
`NOVA_SENDER_CONTACT_REF` and `NOVA_SENDER_PHONE`. Point `--env` at the file the server is
really deployed with: the key is sealed with the secret from that same file, and the server
must have the same one. Values already saved in the admin are kept unless `--force` is passed.
It never prints the key, and after `--apply` it lists the variables that can be removed.

Run the report first and read it. On production, take a backup before `--apply`.

`migrate-contacts-to-variables.mjs` copies the phone, e-mail, hours, Telegram and Viber.
The site shows the same contacts before and after it; values already saved in
"Налаштування" are kept (even empty ones) unless `--force` is passed, the admin's own
variables are never touched, and the old record is left as it is.
