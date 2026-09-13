# Deployment Plan & Isolation Enforcement

## Objective
Ensure that the new FastAPI `analysis_service` safely co-exists with the legacy NodeJS monolith without exposing the legacy components to the internet, and that the new React frontend operates exclusively in "demo mode".

## Proxy Rules (NGINX / Reverse Proxy)

We must deploy an API Gateway or Reverse Proxy (e.g., NGINX) to strictly enforce routing and isolation.

### 1. Allowlist Demo Endpoints
Only the `/api/v2/demo/` namespace on the FastAPI backend should be publicly accessible.

```nginx
location /api/v2/demo/ {
    proxy_pass http://fastapi_backend:8000;
    proxy_set_header Host $host;
    # The rate limiter reads X-Forwarded-For, not X-Real-IP — see the
    # Rate Limiting note below. $proxy_add_x_forwarded_for appends
    # $remote_addr to any existing X-Forwarded-For value rather than
    # replacing it, which is required for TRUSTED_PROXY_COUNT to mean
    # anything (a single, unconditionally-overwritten header can't
    # distinguish "one hop" from "the client lied").
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 2. Block Legacy Public Access
All other API paths (`/api/v1/*`, ingest, mutate) must be blocked externally and only reachable via VPN or authenticated administrative gateways.

```nginx
# Explicitly drop all v1 routes
location /api/v1/ {
    return 403;
}

# Block direct access to FastAPI Swagger/OpenAPI docs
location /docs {
    return 403;
}
location /openapi.json {
    return 403;
}
```

### 3. Frontend Static Routing
The frontend should be built strictly with `VITE_USE_DEMO=true` to guarantee that legacy views and API calls are stripped or gated.

```nginx
location / {
    root /var/www/frontend/dist;
    try_files $uri $uri/ /index.html;
}
```

## Security Requirements
- **Cookie Security:** The FastAPI backend sets `demo_token` as `HttpOnly`,
  `SameSite=Lax`, and `Secure=<COOKIE_SECURE>` (an actual setting,
  `settings.cookie_secure`, read from the `COOKIE_SECURE` environment
  variable — defaults to `true`). **Set `COOKIE_SECURE=true` explicitly in
  production** and serve over HTTPS; only set it `false` for local
  plain-HTTP development.
- **CORS:** `ALLOWED_ORIGINS` (a JSON array, e.g.
  `["https://demo.example.com"]`) must list the exact production frontend
  origin(s). There is no CORS middleware on the FastAPI app itself —
  `verify_origin` (an explicit dependency on every unsafe-method route)
  is the actual CSRF guard, and it rejects any request whose `Origin`
  header is missing or not in this allowlist.
- **Rate Limiting / trusted proxy configuration:** `app.api.dependencies.auth.get_client_ip`
  reads the client IP from `X-Forwarded-For`, not `X-Real-IP`, and only
  when `TRUSTED_PROXY_COUNT` (an environment variable, default `0`) is
  greater than zero — with the default `0`, it trusts only the directly
  connected socket peer and ignores `X-Forwarded-For` entirely, which
  means behind a single reverse proxy every client would appear to share
  the proxy's IP unless this is configured. Set `TRUSTED_PROXY_COUNT=1`
  for a single reverse-proxy hop (like the NGINX config above), and
  ensure NGINX sets `X-Forwarded-For` via `$proxy_add_x_forwarded_for`
  (which appends to, rather than overwrites, any existing value) — never
  trust a client-supplied `X-Forwarded-For` directly. If there are
  multiple proxy hops in front of FastAPI, `TRUSTED_PROXY_COUNT` must
  match the exact hop count or the rate limiter will key on the wrong
  address.
