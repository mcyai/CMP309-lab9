# Assignment 8 - Express Information Server

A small Node.js and Express 5 server for a made-up study programme. It serves a
browser page at `/`, offers a handful of routes (text, JSON, errors, redirect),
logs every request and counts how many requests it has served.

## How to install and run

Requirements: Node.js (current LTS, tested with v22) and npm.

```bash
git clone https://github.com/mcyai/CMP309-lab9.git
cd CMP309-lab9
npm install
npm start        # runs: node server.js
```

Open `http://localhost:3000` in a browser.

- `npm run dev` runs the server with `node --watch`, so it restarts when a file changes (no extra package).
- The port is read from `process.env.PORT` and falls back to 3000, for example `PORT=4000 npm start`.
- The server can be started from any folder, because the `public/` path is built from the location of `server.js`.

## File organization

```
.
├─ public/
│   ├─ index.html     page with one button per API route
│   ├─ styles.css     styling
│   └─ app.js         fetch() calls and response display
├─ server.js          Express app, middleware, routes, 404 fallback
├─ package.json       "type": "module", scripts, express dependency
├─ package-lock.json
├─ .gitignore         node_modules/ and .env
└─ README.md
```

## Routes

| Method and path | Behaviour |
|---|---|
| GET / | Serves `public/index.html` (through `express.static`) |
| GET /hello | Plain text greeting |
| GET /robots.txt | Plain-text body with content type `text/plain` |
| GET /old-page | Redirects (302) to `/hello` |
| GET /api/courses | JSON array of courses with `id`, `title`, `credits` |
| GET /api/status | JSON `{ status, nodeVersion, uptimeSeconds }` |
| GET /api/headers | JSON echo of the `User-Agent` and `Accept` headers |
| POST /api/subscribe | 201 with `{ "subscribed": true }` |
| GET /api/admin | 403 with `{ "error": "Forbidden" }` |
| GET /api/stats | JSON `{ "requestsServed": <number> }` |
| anything else | 404: JSON for `/api` paths, text otherwise |

## Middleware

Two middleware functions are registered with `app.use` before every route, and
both call `next()`.

1. `requestLogger` prints one line per request: timestamp, method and URL.
2. `requestCounter` increments `requestsServed`, which `GET /api/stats` returns.

**Why this order.** Express runs middleware and routes in the order they are
registered, and a route that sends a response ends the chain. If the logger or
counter were registered after the routes, they would never run for any request
that a route already answered. They are first so that every request is seen.
The logger comes before the counter so that a request is logged even if later
code changes.

**Which requests are counted.** Every request is counted, because the counter
is registered before everything else:

- API and text routes: counted.
- `GET /api/stats` itself: counted (the number already includes the current request).
- Static files (`/`, `/styles.css`, `/app.js`): counted. Loading the page therefore adds 3 requests, plus the browser may also ask for `/favicon.ico`.
- 404 responses: counted, because the request arrived even though no route matched.

This was chosen because the counter answers "how many requests did the server
receive", which is simpler and more honest than choosing which ones matter. The
counter lives in memory and resets when the server restarts.

## Testing evidence (curl --include)

All outputs below were captured from the running server on port 3000.

### Successful JSON response

```
$ curl --include http://localhost:3000/api/courses
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 197
ETag: W/"c5-8zSg6R9cllZPIz99VjqSfnINfwc"
Date: Tue, 24 Nov 2026 10:32:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":1,"title":"Web Programming","credits":6},{"id":2,"title":"Database Systems","credits":5},{"id":3,"title":"Operating Systems","credits":5},{"id":4,"title":"Software Engineering","credits":4}]
```

### 201 response

```
$ curl --include -X POST http://localhost:3000/api/subscribe
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 19
ETag: W/"13-oWAPIqDXuocNexKhPYW9ayyk98c"
Date: Tue, 24 Nov 2026 10:32:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"subscribed":true}
```

### 403 response

```
$ curl --include http://localhost:3000/api/admin
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-TLNzmZqKxaTuFdX/dVWWPBu44/c"
Date: Tue, 24 Nov 2026 10:32:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Forbidden"}
```

### Redirect

```
$ curl --include http://localhost:3000/old-page
HTTP/1.1 302 Found
X-Powered-By: Express
Location: /hello
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 28
Date: Tue, 24 Nov 2026 10:32:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to /hello
```

### 404 on an /api path

```
$ curl --include http://localhost:3000/api/nope
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-bm7tJgu8FHlq5QU+Y6gDxOGPfRc"
Date: Tue, 24 Nov 2026 10:32:16 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Not found"}
```

### 404 on a non-API path

```
$ curl --include http://localhost:3000/nope
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 14
ETag: W/"e-vDAjs2Bjp2gdskaBRytU+hHw1Ow"
Date: Tue, 24 Nov 2026 10:32:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Page not found
```

### Plain-text file (bonus)

```
$ curl --include http://localhost:3000/robots.txt
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 35
ETag: W/"23-AFlBEdGVlEiTRhyly9yF5dDLJM0"
Date: Tue, 24 Nov 2026 10:32:17 GMT
Connection: keep-alive
Keep-Alive: timeout=5

User-agent: *
Disallow: /api/admin
```
