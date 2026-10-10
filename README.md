# Doory

**Free, open-source design for everyone.** A design editor in the browser for posters, social posts, slides,
cards and more, with a Django backend. Start designing as a guest; create an account to keep your work in the
cloud, build brand kits and share.

React · TypeScript · Vite · Fabric.js · Django · Django REST Framework · PostgreSQL

## Run it with Docker

```bash
cp .env.example .env     # set DJANGO_SECRET_KEY (openssl rand -base64 48) and POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec api python manage.py createsuperuser
```

Open <http://localhost:8080>. The `web` container serves the app and forwards `/api` and `/ws` to the backend,
so the browser only ever talks to one address.

Settings worth knowing in `.env`:

| Setting | What it does |
|---------|--------------|
| `SITE_URL` | The public address of the site, e.g. `https://doory.example.com` (no trailing slash) |
| `DJANGO_ALLOWED_HOSTS` | The host names the site answers to, comma separated |
| `SECURE_SSL_REDIRECT`, `SECURE_COOKIES` | `true` behind HTTPS, `false` for plain `http://` |
| `EMAIL_URL`, `DEFAULT_FROM_EMAIL` | SMTP, e.g. `smtp+tls://user:password@smtp.example.com:587` (without it, emails are printed to the API log) |
| `WEB_PORT`, `WEB_BIND` | Where the site is published (default `0.0.0.0:8080`) |
| `INSTALL_CHROMIUM` | `false` skips the headless browser that server-side PDF export needs |

A new site starts empty. Add the starter content once it is running:

```bash
docker compose exec api python manage.py seed_gallery         # template categories
docker compose exec api python manage.py seed_templates       # the starter templates
docker compose exec api python manage.py seed_elements        # shapes and graphics
docker compose exec api python manage.py sync_element_packs   # icons, emoji, illustrations (download)
docker compose exec api python manage.py sync_fonts --popular 100
docker compose exec api python manage.py sync_models          # background removal model
docker compose exec api python manage.py sync_audio           # music and sound effects
```

## Develop locally

```bash
make setup     # virtualenv, dependencies, local database
make dev-api   # API on http://localhost:8000
make dev-web   # app on http://localhost:5173 (second terminal)
```

`make help` lists the other targets (tests, lint, content).

## License and credit

Doory is released under the [Attribution Assurance License](LICENSE). You may use, change and redistribute it,
but **you must credit the author**: keep the licence and [NOTICE](NOTICE) with it, and display this credit
prominently in the running app:

> Doory by Siam, creator and maintainer of Doory — https://github.com/shaongitbd/doory

Third-party software, fonts and content keep their own licences; see [THIRD_PARTY.md](THIRD_PARTY.md).
