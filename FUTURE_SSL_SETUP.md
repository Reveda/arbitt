# Future SSL Setup

Current production Docker setup is HTTP-only because no VPS domain and SSL certificate are available yet. When the VPS and domain are ready, add SSL at the public Nginx layer, not inside the Node backend.

## Where Certificates Go

Use Let's Encrypt/Certbot on the VPS. The expected certificate paths are:

```text
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

If the API and frontend use the same domain, keep API under `/api`. If using a separate API subdomain, create certificates for both `yourdomain.com` and `api.yourdomain.com`.

## Docker Compose Changes

When SSL is ready, expose both ports:

```yaml
ports:
  - "80:80"
  - "443:443"
```

Mount the certificates into the Nginx container as read-only:

```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

## Nginx Changes

Add an HTTP redirect server:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Add the HTTPS server:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

## Backend Environment Changes

After HTTPS is active, update `backend/.env`:

```env
FRONTEND_URL=https://yourdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

If frontend and API are on different subdomains and cookies must be shared, set:

```env
COOKIE_DOMAIN=.yourdomain.com
```

## Cloudflare Optional

If Cloudflare is used, set SSL/TLS mode to `Full (Strict)`, enable `Always Use HTTPS`, and restrict VPS ports `80` and `443` to Cloudflare IP ranges only.
