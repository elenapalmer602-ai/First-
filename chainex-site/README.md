# Chainex Supply website

Single-page marketing site. Plain HTML, CSS and JavaScript. No build step, no dependencies.

```
index.html                 All page content and the inline SVG icon set
assets/css/styles.css      Design tokens (:root) first, then components in page order
assets/js/main.js          Nav, hero comparison, flip cards, service drawer, setup models, forms
assets/img/                Logo and photography
```

## Preview locally

Open `index.html` in a browser, or serve it:

```
python3 -m http.server 8000
```

## Editing

All colours, fonts and spacing live in the `:root` block at the top of `styles.css`.
Change a token there and it applies across the whole page.

- `--char*`   Royal charcoal surfaces (nav, hero, panels, footer)
- `--paper*`  White and cool grey section backgrounds
- `--ink*`    Text on light sections
- `--on-char*` Text on charcoal sections
- `--cham*`   Champagne accent. `--cham` is for charcoal backgrounds,
              `--cham-ink` is the darker version for white backgrounds

Sections alternate `.section`, `.section.band` and `.section.band-dark.on-dark`.
Add `on-dark` to any section you make charcoal so the text colours follow.

## Before going live

- Confirm the image licence covers commercial website use
- Add the full registered office address to the footer (UK requirement)
- Add a privacy notice, since the contact form collects personal details
- Connect the form to a real endpoint. It currently builds the enquiry text
  for the visitor to copy or open in their email client; nothing is submitted.

## Deploying

Any static host works: Netlify, Vercel, Cloudflare Pages, GitHub Pages.
Drop the folder in, no build command, publish directory is the folder itself.
