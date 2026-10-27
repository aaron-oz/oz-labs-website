# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for **OZ Labs LLC**, a technical consulting practice offering statistics & machine learning, web development, and custom data visualization. No build system, no bundler, no framework. Pure HTML/CSS/JS served directly. Deployed on Netlify at ozlabs.tech (canonical host, no www; www redirects via `_redirects`). Site copy is written in first-person singular ("I", "my"): OZ Labs is a solo practice, so never imply a team.

## Architecture

- **index.html** — Landing page: Hero ("We Build Tools That Let Data Speak"), 3 service overview cards linking to services tabs, "Why OZ Labs" section with R code block, about teaser, contact (mailto), hidden testimonials, footer
- **services.html** — Services hub with 3 JS-powered tabs: Statistics & ML, Web Development, Custom Data Visualization. Deep-linkable via URL hash (`#stats`, `#web`, `#dataviz`)
- **portfolio.html** — Two sections: "Technical Projects" (see-tao.live, future work) and "Research & Academic" (6 project cards + selected publications list with CV download)
- **about.html** — Full bio, education credentials, technical skills grid, publication highlights, Google Scholar / ORCID / CV links
- **styles.css** — All styling with CSS custom properties in `:root`. OZ Labs palette: cyan (#00f0ff), purple (#a855f7), magenta (#ff00ff), green (#00ff88). Responsive breakpoints at 968px and 768px
- **main.js** — `SpatialGPVisualizer` class renders animated GP background on `<canvas>` (pauses when tab hidden). Also handles navigation, smooth scroll, tab switching with hash deep-linking, and scroll-triggered animations via IntersectionObserver
- **img/**: `headshot.jpg` (about page photo), `ozlabs-favicon.svg` (seed favicon, mid crop: plant, eye, upper ring; also the nav logo), `ozlabs-logo.svg` (full seed logo: plant, eye, two rings; footer), `og-card.png` (1200×630 social share card with the seed logo), `apple-touch-icon.png` (180×180, seed favicon on the dark background). `/favicon.ico` (16/32/48 px) is the fallback icon. Sources: `~/Dropbox/OZ-Labs/logo/ozlabs-seed-*` (2026-10-21)
- **notes/**: hidden blog scaffold (not in nav, `noindex` until first post): `index.html` list page, `post-template.html`, `feed.xml` (RSS). Publishing steps documented in comments inside each file
- **sitemap.xml** / **robots.txt**: hand-maintained; add new pages/posts to the sitemap manually
- **oz-labs-logo-dark.svg** / **oz-labs-logo-light.svg** — Full eye logo SVGs (for marketing/print use)
- **aoz-2025-summer.pdf** — Aaron's CV, linked from about page and portfolio
- **_redirects** — Netlify redirect from old `/projects.html` to `/portfolio.html`

All 4 HTML files share identical `<head>` boilerplate (fonts, favicon, OG tags, commented Plausible analytics) and the same nav/footer markup. Each page includes `<canvas id="gp-canvas">` for the GP background and loads `main.js` at the end of `<body>`.

## Development

Open `index.html` in a browser. No build step, no dependencies, no package manager.

```bash
# Quick local server if needed
python3 -m http.server 8000
```

## Key Design Details

- Dark theme (bg #06060c) with semi-transparent glass-morphism section backdrops over the GP canvas background
- The GP visualizer supports 7 color schemes (rainbow, ocean, thermal, forest, viridis, magma, plasma) cycled via a toggle button on the landing page hero
- Nav logo is the seed favicon (`img/ozlabs-favicon.svg`, 48px); the footer shows the full seed logo (`img/ozlabs-logo.svg`, 120px tall)
- Fonts: Inter (body) + JetBrains Mono (code/monospace) loaded from Google Fonts
- Contact uses `mailto:aaron@ozlabs.tech` (no form backend)
- **Booking CTA**: "Book a 30-Minute Intro Call" buttons (class `.booking-cta`) exist in the contact sections but stay hidden until `BOOKING_URL` is set at the top of `main.js`; enabling them also demotes the email buttons (`.email-cta`) to secondary styling
- **Headshot**: `img/headshot.jpg`; About page picks it up automatically (hides gracefully via `onerror` if missing)
- **Testimonials section** (`index.html`): fully commented out (CSS styles remain). Re-enable when at least 2 real client quotes exist; instructions are in the comment block.
- **Analytics**: commented-out Plausible script in all HTML files (`data-domain="ozlabs.tech"`). Uncomment to activate.
- **SEO plumbing**: every page has a canonical link, unique title/description, OG/Twitter tags pointing at `img/og-card.png`; `index.html` carries JSON-LD (ProfessionalService + Person; city/state only, never a street address) and a commented Google Search Console verification placeholder. Keep heading order semantic: one `h1` per page, no level skips.
- **Service tabs**: JS in `main.js` (`initTabs()`) handles tab switching + URL hash deep-linking. Service cards on index.html link to `services.html#stats`, `#web`, `#dataviz`.

## Nav Structure (duplicated across 4 HTML files)

```
Services (services.html) | Portfolio (portfolio.html) | About (about.html) | Get in Touch (index.html#contact)
```

Any nav change must be updated in all 4 files.
