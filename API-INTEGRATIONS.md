# Ecommerce API — integration guide

This project exposes a **Django REST Framework** JSON API for catalog data (collections, products, variants, options, tags). Use this document when connecting a storefront, mobile app, or internal tool.

## Base URL and versioning

- **API prefix:** `/api/v1/`
- **Example (local):** `http://localhost:8000/api/v1/`
- Replace the host with your deployed origin in production.

### React storefront in this workspace

The Vite app prefixes requests with **`/api/v1`** (proxy) or with **`VITE_API_ORIGIN` + `/api/v1`**; see `src/api/client.ts`.

- **`pnpm dev`:** Leave `VITE_API_ORIGIN` unset so requests use **`/api/v1/...`**; `vite.config.ts` proxies **`/api`** to **`http://localhost:8000`** (matches local Django).
- **Production build:** Set **`VITE_API_ORIGIN`** to your deployed API origin (HTTPS). Django must allow **CORS** for the storefront origin unless you proxy through the same host.

See `.env.example`.

## OpenAPI (machine-readable spec + UI)

- **OpenAPI schema (JSON):** `GET /api/schema/`
- **Swagger UI:** `GET /api/docs/`

Prefer the schema or Swagger for field-by-field detail; it stays aligned with the code via **drf-spectacular**.

## Request and response format

- **JSON only** for request bodies: `Content-Type: application/json`
- **Responses:** JSON (`DEFAULT_RENDERER_CLASSES` is `JSONRenderer`).

### Images and uploads

- Models use **ImageField** values; storage is configured for **Cloudinary** (see Django `DEFAULT_FILE_STORAGE` / `STORAGES`).
- API responses expose image fields as **URLs** (strings) when files are present.
- Uploading images typically requires **multipart** requests. The project’s default parsers are **JSON-only**; if you need browser or mobile **direct file upload** through the API, you will likely need to extend DRF with `MultiPartParser` / `FormParser` on the relevant views—plan integration accordingly.

## Authentication and permissions

- Viewsets currently use **`AllowAny`**: catalog endpoints are **public** and do **not** require a token.
- `SPECTACULAR_SETTINGS` references JWT for documentation purposes; **JWT is not wired as default authentication** in `REST_FRAMEWORK` in the current codebase. Treat the API as **unauthenticated** unless you add auth classes and align permissions.

**Production:** Do not rely on open write access; add authentication and narrow permissions before exposing create/update/delete to the internet.

## Resources and routes

DRF’s **`DefaultRouter`** registers these **ModelViewSet** resources (full CRUD where not blocked by serializers—see [Writes and nested data](#writes-and-nested-data)):

| Resource            | URL path                     | Notes |
|---------------------|------------------------------|--------|
| Collections         | `/api/v1/collections/`       | Includes computed `products_count` on read |
| Products            | `/api/v1/products/`          | Nested data on read; see below |
| Product variants    | `/api/v1/variants/`          | FK: `product` |
| Product options     | `/api/v1/options/`           | FK: `product`; nested `values` on read |
| Option values       | `/api/v1/option-values/`     | FK: `option` |
| Tags                | `/api/v1/tags/`              | Unique `name` |

### Standard actions (per resource)

| Action        | Method | Path pattern        |
|---------------|--------|----------------------|
| List          | GET    | `/api/v1/{resource}/` |
| Create        | POST   | `/api/v1/{resource}/` |
| Retrieve      | GET    | `/api/v1/{resource}/{id}/` |
| Full update   | PUT    | `/api/v1/{resource}/{id}/` |
| Partial update| PATCH  | `/api/v1/{resource}/{id}/` |
| Delete        | DELETE | `/api/v1/{resource}/{id}/` |

### Product read response (shape)

`GET /api/v1/products/{id}/` returns a product with nested objects (all read-only in the serializer):

- **`collection`** — nested collection object (if set)
- **`tags`** — list of tag objects
- **`variants`** — variants with nested **`option_values`**
- **`options`** — options with nested **`values`**
- **`min_price`** / **`max_price`** — derived from variant prices

### Domain model summary (fields to expect)

Common metadata on most entities: **`id`**, **`created_at`**, **`updated_at`** (from `TimeStampedModel`).

- **Collection:** `title`, `handle` (auto from title if empty), `description`, `image`, `is_active`, **`products_count`** (read)
- **Tag:** `name` (unique)
- **Product:** `title`, `handle`, `description`, `collection` (FK), `tags` (M2M), `featured_image`, `vendor`, `product_type`, **`status`** (`draft` \| `active` \| `archived`), `is_published`
- **ProductOption:** `product`, `name` — unique per product
- **ProductOptionValue:** `option`, `value` — unique per option
- **ProductVariant:** `product`, `title`, `sku`, `barcode`, `price`, `compare_at_price`, `cost_per_item`, `inventory_quantity`, `weight`, `is_active`, `image`, `option_values` (M2M)

## Writes and nested data

The **`ProductSerializer`** declares **`collection`**, **`tags`**, **`variants`**, and **`options`** as **read-only** nested representations. That means:

- You **cannot** set **`collection`** or **`tags`** on create/update through the product serializer as currently written.
- Nested **`variants`** / **`options`** are not written via the product payload; manage them via **`/api/v1/variants/`**, **`/api/v1/options/`**, **`/api/v1/option-values/`** using the appropriate foreign keys (`product`, `option`).

If your integration requires assigning a product to a collection or tags over the API, the backend needs serializer changes (e.g. writable `PrimaryKeyRelatedField` for `collection` and `tags`) or separate endpoints.

## Integration checklist

1. Point clients at **`{ORIGIN}/api/v1/`** (and **`/api/docs/`** during development).
2. Prefer **GET** for catalog reads; cache product lists if traffic is high.
3. Create **options → option values → variants** in order, linking `product` / `option` IDs from prior responses.
4. Plan **image** handling (JSON-only parsers vs multipart) before relying on file upload from clients.
5. Lock down **writes** and add **real authentication** before production.

---

## AI assistant prompt (copy-paste)

Use the block below in Cursor or another AI tool when generating a client, tests, or UI against this backend.

```text
You are integrating with a Django REST Framework ecommerce catalog API.

Base URL: {ORIGIN}/api/v1/

Facts:
- JSON request/response; Content-Type application/json for writes.
- OpenAPI schema at GET /api/schema/, Swagger UI at GET /api/docs/.
- Endpoints: collections, products, variants, options, option-values, tags (all under /api/v1/).
- Standard DRF router: list/create on collection URL; retrieve/update/delete on /api/v1/{resource}/{id}/.
- Products GET returns nested collection, tags, variants (with option_values), options (with values), plus read-only min_price and max_price.
- Product serializer makes collection, tags, variants, and options read-only nested fields—do not assume PATCH /products/ can set collection or tags; use variant/option/option-value endpoints with FKs for structured writes.
- Permissions are currently open (AllowAny); no JWT required unless the server is changed.
- Images: fields are URLs in JSON; storage may be Cloudinary; multipart upload may require server parser support.

Generate code that uses relative paths under /api/v1/, handles pagination if enabled later, and validates HTTP status codes. For field names and types, prefer mirroring the OpenAPI schema from /api/schema/.
```

Replace `{ORIGIN}` with `http://localhost:8000` or your production host.
