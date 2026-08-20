# ABN Group — Sitio corporativo

Sitio estático (HTML/CSS/JS vanilla, sin build). Páginas: `index.html` + subpáginas de unidad (`digital.html`, `studio.html`, `detrics.html`, `hike.html`).

## Branches / deploy

- Trabajo en `v2`. **Publicar = merge `v2` → `main`** (GitHub Pages: https://dartsteam.github.io/abn-group/).
- Bumpear los cache-busters `style.css?v=` / `script.js?v=` en TODAS las páginas cuando cambian esos archivos.

## Marca

- **Manual de marca (Drive):** https://drive.google.com/drive/folders/1Hix7BylCUMxrTiSIaFO9Y8CPZcVYVZ1T?usp=sharing
  (01 Manual · 02 Logo · 03 Isotipo · 04 Tipografías · 05 Elementos gráficos · 06 Video animado)
- Copia local del PDF: `ABN x ROJO - Manual de Marca - (10 JUN).pdf` (raíz del repo).
- Assets de marca locales: `Logos/`, `Gradientes - Fondo para Logo/`, `assets/` (los SVG `trimmed/` son los que usan loader/hero/footer — los sin trimear tienen viewBox 1000×1000 con aire y renderizan chicos).
- OG image compartida por todas las páginas: `assets/og/og-abn-group.jpg` (1200×630, logo sobre gradiente de marca).
- Tipografía: Montserrat (Google Fonts). Colores por unidad: verde=Digital, naranja=Studio, celeste=Detrics, violeta=Hike (custom props `--green/--orange/--lblue/--violet` en `style.css`).

## Gotchas

- El contenido está gateado por reveal-on-scroll (`.reveal*` + IntersectionObserver, clase `.js` en `<html>`): sin JS todo se ve estático; para screenshots headless hay que forzar los estados visibles con CSS `!important`.
- Logos de clientes: PNG blancos mono, 120px de alto, en `assets/clientes/` (originales en `_src/`); ajuste óptico por logo con `--s` en el marquee.
- El form de contacto (`index.html#contacto`) postea a Formspree — el `action` debe tener un form ID real antes de deployar (con `your-form-id` el JS simula éxito y los leads se pierden).
