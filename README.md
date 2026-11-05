# Maths Academy — single-page website

Static site: HTML, CSS, JavaScript, SVG, and GSAP + ScrollTrigger (bundled locally in `js/vendor/`, no build step).

## Run locally

```bash
cd maths-academy
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static server works, e.g. `npx serve`.) The only external request is the Inter Tight font from Google Fonts; the site falls back to system fonts offline.

## Structure

```
index.html        All sections (single page)
css/styles.css    Styles, palette tokens, responsive rules
js/config.js      Site configuration (WhatsApp number)
js/main.js        Navigation, hero timeline, scroll animations, galleries, form
js/vendor/        gsap.min.js, ScrollTrigger.min.js
assets/images/    Drop photographs here
```

## Adding photographs

Photos are not invented — labelled placeholders show until you add files. Save images with these exact names (JPG, ideally ≤ 300 KB, ~1600px wide) and they replace the placeholders automatically:

- Founder: `assets/images/founder.jpg` (portrait, ~5:6)
- Academy gallery: `academy-1.jpg` … `academy-6.jpg`
- Career gallery: `career-1.jpg` … `career-5.jpg`

To use other names or add more, edit the `<img src>` in `index.html`. Update the `alt` text to describe each photo.

## WhatsApp enquiry number

Edit `whatsappNumber` in `js/config.js` (international format, digits only, e.g. `918778311898`). The form opens WhatsApp with the details pre-filled. Nothing is stored or sent to a server.

## Notes

- Respects `prefers-reduced-motion` (hero shows the first word statically; scroll animations are skipped).
- Hero rotation pauses when the tab is hidden or the hero is off-screen.
