# Reicon Avatars API — Cloudflare Worker

> Global edge API for **Ugly Avatars for your Beautiful UI**.

Hosted live on Cloudflare Workers at `https://avatars.reicon.dev`.

---

## ⚡ Endpoints

| Format | Endpoint Pattern | Description |
| :--- | :--- | :--- |
| **SVG** | `https://avatars.reicon.dev/v1/svg/{seed}` | Vector SVG image markup (`image/svg+xml`) |
| **JSON** | `https://avatars.reicon.dev/v1/json/{seed}` | JSON payload (`application/json`) with raw SVG |

---

## 🎛️ Parameters

- `shape`: `square` (default), `circle`, or `squircle`
- `size` / `width` / `height`: Resolution in pixels (default `500`)

---

## 💻 HTML Usage

```html
<img src="https://avatars.reicon.dev/v1/svg/dev?size=400&shape=squircle" alt="Avatar" width="400" height="400" />
```

---

## 🛡️ Rate Limits & Caching

- **Rate Limit**: 100 requests per minute per IP.
- **Diagnostic Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- **CDN Caching**: `Cache-Control: public, max-age=31536000, immutable`.

---

## 🚀 Deployment Commands

```bash
# Start local development server
npm run dev

# Deploy to Cloudflare Workers
npm run deploy
```
