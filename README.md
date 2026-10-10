<div align="center">

<img src="frontend/src/assets/bunny-sticker.webp" alt="The Doory bunny" width="120" />

# Doory — the open-source Canva alternative

**Design anything in your browser. Free forever, no sign-up to start, and yours to self-host.**

Posters, social posts, slides, invitations, resumes, thumbnails and more, in a full design editor
that runs in the browser, with real-time co-editing, animation, video export and a library of templates.

[![License: Attribution Assurance](https://img.shields.io/badge/license-Attribution%20Assurance-c9bcff?style=flat-square)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-2b1c17?style=flat-square&logo=react)](frontend/package.json)
[![Django 5](https://img.shields.io/badge/Django-5-2b1c17?style=flat-square&logo=django)](backend/requirements.txt)
[![Self-hostable with Docker](https://img.shields.io/badge/self--host-Docker%20Compose-2b1c17?style=flat-square&logo=docker)](#-run-it-yourself-in-3-commands)

<br />

<img src=".github/readme/landing.webp" alt="The Doory landing page" width="900" />

</div>

<br />

## ✨ Why Doory

- **Everything is free.** No Pro tier, no locked templates, no watermarks, no ads. Every feature is for everyone.
- **Start in one click.** Guests design right away; their work is saved in the browser. Create an account only
  when you want your designs in the cloud, and they move over in one step.
- **Own your work.** Run Doory on your own server with Docker Compose, keep every design and upload under your
  control, and export to open formats whenever you like.
- **A real editor, not a toy.** Layers, groups, masks, filters, curved text, snapping, rulers, multi-page
  designs, animation, audio, presenting, comments and live co-editing.

<br />

## 🎨 The editor

<p align="center">
  <img src=".github/readme/editor.webp" alt="Editing the Night Bloom concert poster template in the Doory editor" width="900" />
</p>

| | |
|---|---|
| **Text** | Headings, curved text, text effects, font pairings, bulleted and numbered lists, an open-licensed font catalogue and your own uploaded fonts |
| **Elements** | Shapes, lines and arrows, about 25,000 icons, emoji and illustrations, stickers, QR codes |
| **Photos** | Upload, crop, masks and filters, one-click background removal (the model runs in your browser), stock photo search with an Unsplash or Pexels key |
| **Layout** | Layers with lock and hide, groups, alignment guides, snapping, rulers, multi-page designs with pages of different sizes, magic resize |
| **Motion** | 27 enter and exit animations, 12 emphasis animations and 16 page transitions on a timeline |
| **Sound** | A built-in library of 24 music loops and 88 sound effects (CC0), uploads, voiceover recording, trims and fades |
| **Present** | Present mode with speaker notes, timing, auto-advance, a laser pointer and a second presenter window |
| **Together** | Share links that can view, comment or edit (optionally password protected), pinned comments, version history and real-time co-editing with live cursors |
| **Brand** | Brand kits with your colours, fonts and logos, one click away in every design |
| **Export** | PNG, JPG, SVG and PDF, MP4, WebM and animated GIF, all made in the browser, plus print-ready PDF with bleed and crop marks |

<br />

## 🖼️ Templates that look good from the start

<p align="center">
  <img src=".github/readme/template-collage.webp" alt="Ten starter templates: a gig poster, a wedding invitation, an event story, a sale post, a café flyer, a quote card, a resume, a YouTube thumbnail, a pitch deck and a business card" width="900" />
</p>

Every starter template is fully editable, ships in the repository with its own palette, and is set in open-licensed
fonts. Browse them by category, size and orientation:

<p align="center">
  <img src=".github/readme/templates.webp" alt="The template gallery" width="900" />
</p>

<br />

## 🚀 Run it yourself in 3 commands

```bash
cp .env.example .env     # set DJANGO_SECRET_KEY (openssl rand -base64 48) and POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec api python manage.py createsuperuser
```

Open <http://localhost:8080> and start designing. The `web` container serves the app and forwards `/api` and
`/ws` to the backend, so the browser only ever talks to one address.

<details>
<summary><b>Add the starter content</b> (templates, icons, fonts, audio)</summary>

<br />

A new site starts empty. Add whatever you want once it is running:

```bash
docker compose exec api python manage.py seed_gallery         # template categories
docker compose exec api python manage.py seed_templates       # the starter templates
docker compose exec api python manage.py seed_elements        # shapes and graphics
docker compose exec api python manage.py sync_element_packs   # icons, emoji and illustrations (download)
docker compose exec api python manage.py sync_fonts --popular 100
docker compose exec api python manage.py sync_models          # background removal model
docker compose exec api python manage.py sync_audio           # music and sound effects
```

</details>

<details>
<summary><b>Settings worth knowing</b> (<code>.env</code>)</summary>

<br />

| Setting | What it does |
|---------|--------------|
| `SITE_URL` | The public address of the site, e.g. `https://doory.example.com` (no trailing slash) |
| `DJANGO_ALLOWED_HOSTS` | The host names the site answers to, comma separated |
| `SECURE_SSL_REDIRECT`, `SECURE_COOKIES` | `true` behind HTTPS, `false` for plain `http://` |
| `EMAIL_URL`, `DEFAULT_FROM_EMAIL` | SMTP, e.g. `smtp+tls://user:password@smtp.example.com:587` (without it, emails are printed to the API log) |
| `WEB_PORT`, `WEB_BIND` | Where the site is published (default `0.0.0.0:8080`) |
| `INSTALL_CHROMIUM` | `false` skips the headless browser that server-side PDF export needs |
| `GOOGLE_CLIENT_ID` | Turns on "Sign in with Google" |
| `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY` | Turn on stock photo search |
| `USE_S3` and `AWS_*` | Store uploads in S3-compatible storage instead of a local volume |

</details>

<details>
<summary><b>Develop locally</b></summary>

<br />

```bash
make setup     # virtualenv, dependencies, local database
make dev-api   # API on http://localhost:8000
make dev-web   # app on http://localhost:5173 (second terminal)
```

`make help` lists the other targets (tests, lint, content).

</details>

<br />

## 🧱 Built with

**Frontend:** React 19, TypeScript, Vite, Fabric.js, Yjs, Zustand &nbsp;·&nbsp;
**Backend:** Django 5, Django REST Framework, Channels, PostgreSQL &nbsp;·&nbsp;
**Runs on:** Docker Compose with nginx, optional Redis and S3-compatible storage

<br />

## 🤝 Contributing

Bug reports, ideas and pull requests are welcome. Open an [issue](https://github.com/shaongitbd/doory/issues) to
report a bug or suggest a feature. For a security problem, please report it privately through the repository's
**Security** tab instead.

If Doory is useful to you, a ⭐ helps other people find it.

<br />

## 📜 License and credit

Doory is released under the [Attribution Assurance License](LICENSE). You may use, change and redistribute it,
but **you must credit the author**: keep the licence and [NOTICE](NOTICE) with it, and display this credit
prominently in the running app:

> Doory by Siam, creator and maintainer of Doory — https://github.com/shaongitbd/doory

Third-party software, fonts and content keep their own licences; see [THIRD_PARTY.md](THIRD_PARTY.md).

<div align="center">
<br />
<img src="frontend/src/assets/bunny-mark.webp" alt="" width="40" />
<br />
<sub>Made with care by Siam and the Doory bunny.</sub>
</div>
