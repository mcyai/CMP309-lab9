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

## Reasoning questions

**1. Route order. Experiment: move the 404 fallback to the top.**
I registered the fallback `app.use((req, res) => ...)` right after the app was
created, before the middleware and routes. Every request then received a 404,
including `/hello` (text 404), `/api/courses` (JSON `{"error":"Not found"}`)
and even `/` (the page itself). Express goes through the registered handlers in
order and the first one that sends a response ends the chain. A catch-all
without a path matches everything, so it answered first and the real routes
were never reached. This is why the fallback has to be the last thing
registered.

**2. Middleware. Experiment: remove `next()` from the logger.**
I tested this with curl, not with a browser. The request to `/hello` never
received a response: curl waited until my 4-second timeout and ended with exit
code 28 and no HTTP status. The server printed the log line for the request
once and nothing else, because the logger neither called `next()` nor sent a
response, so the request was stuck inside it. A browser sends the same request,
so I expect the tab to keep loading until it times out, but I did not check
that in a browser. The counter and all routes behind the logger never ran for
that request.

**3. Status codes.**
`POST /api/subscribe` creates a subscription, so 201 Created tells the client
that something new now exists, while 200 only says "the request worked". Clients,
tools and other developers read the status code before the body, so the code
must carry the real meaning. A missing page is a 404 and not a 200 with an
error message because the status line is what browsers, caches, search engines
and `fetch` (`response.ok`) look at. A 200 would tell them the page exists and
the error text would be treated as normal content.

**4. Configuration.**
The port is an environment setting, not part of the program. Hosting platforms
and test setups choose a free port and pass it in `PORT`, and a hard-coded 3000
would fail when that port is already in use or not allowed. Reading
`process.env.PORT` with a fallback of 3000 works in both cases without changing
the code.

**5. Dependencies.**
`node_modules` is large, can be rebuilt exactly from `package.json` and
`package-lock.json`, and can contain files that are specific to one operating
system. Committing it would bloat the repository and create noisy diffs. A
teammate must run `git clone <repo-url>`, `cd` into the folder, `npm install`
(which installs the locked versions) and then `npm start`.

**6. Same origin.**
If the page is opened directly from disk (a `file://` address), the relative URL
`/api/courses` is resolved against the file system, not against the server, so
the request goes to `file:///api/courses` and fails. If I wrote the full address
`http://localhost:3000/api/courses` instead, the page would come from a different
origin than the API and the browser would block the script from reading the
response. This restriction is the same-origin policy. It can only be relaxed by
the server, with CORS headers, and the `cors` package is not allowed here.

## Self-study notes

- **Node version and running time.** The Node documentation for the `process`
  object lists `process.version` (a string such as `v22.20.0`) and
  `process.uptime()` (seconds since the process started, as a number with
  decimals). `/api/status` returns `process.version` and
  `Math.round(process.uptime())`, so both values come from the running process.
- **Plain-text content type.** The Express documentation for `res.send` says a
  string body is sent as `text/html` by default. I saw this: my first `/hello`
  answered with `Content-Type: text/html`. `res.type('text/plain')` sets the
  type before `send`, and I use it for `/hello` and `/robots.txt`.
- **Formatting JSON in the page.** `JSON.stringify(value, null, 2)` formats an
  object with two-space indentation. Because the response is read as text
  first, `app.js` runs `JSON.parse` and then `JSON.stringify(..., null, 2)`, and
  falls back to the raw text if the body is not JSON.
- **Path that works from any folder.** `import.meta.dirname` (available in
  current Node versions) is the folder of the current module. I build the
  `public/` path with `path.join(import.meta.dirname, 'public')` so it does not
  depend on the folder the server is started from.
- **Auto restart.** `node --watch server.js` is built into Node and replaces
  `nodemon`.

## Challenges

- `/hello` first returned `text/html` because `res.send` with a string defaults
  to HTML. I found it by reading the headers with `curl --include`, then fixed
  it with `res.type('text/plain')`.
- My first 404 check used `startsWith('/api')`, which also matched `/apix` and
  answered it with JSON. I changed it to match `/api` exactly or paths that
  start with `/api/`.
- Express 5 no longer accepts `app.get('*', ...)`, so the fallback is a
  path-less `app.use` registered last.
- The fallback must come after `express.static`, otherwise the page and its
  files would end in the 404 handler.
- I had no browser automation, so I tested `public/app.js` against the running
  server with a small stand-in for the DOM, and I tested the freezing logger
  with curl instead of a browser.
- A tooling folder that is not part of the project was staged by mistake in two
  commits. I removed it from both commits before pushing.
