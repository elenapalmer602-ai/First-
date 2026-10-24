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

All colours, fonts and depth live in the `:root` block at the top of `styles.css`.
Change a token there and it applies across the whole page.

- `--bg*`, `--surface*`, `--well`  Charcoal surfaces (`--well` is the pressed-in inset)
- `--text*`   Text on charcoal: white, then two greys
- `--paper*`, `--ink*`  Porcelain sections and the text on them
- `--glow`    The warm white light used for rims, streaks and the horizon (an rgb triplet)
- `--green-*`, `--blue-*`, `--amber-*`  Accents for icons, dots and pills only, never text
- `--raise*`, `--press*`  Neumorphic shadows (`-l` versions are for porcelain)

Sections are charcoal by default. Add `light` to a section to make it porcelain, and
`alt` for the slightly lifted charcoal. Icon tiles use `.ibox green|blue|white`, and
checklists use `.tick` (a dark rounded box with a green gradient tick).

## Before going live

- Confirm the image licence covers commercial website use
- Add the full registered office address to the footer (UK requirement)
- Add a privacy notice, since the contact form collects personal details
- Connect the form to a real endpoint. It currently builds the enquiry text
  for the visitor to copy or open in their email client; nothing is submitted.

## Deploying

Any static host works: Netlify, Vercel, Cloudflare Pages, GitHub Pages.
Drop the folder in, no build command, publish directory is the folder itself.
