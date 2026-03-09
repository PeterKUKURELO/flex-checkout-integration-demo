# VFF Demo Monorepo

Estructura propuesta para mantener el ejemplo ordenado y listo para GitHub Pages.

## Arquitectura

- `apps/vff-static`: demo principal en HTML/JS.
- `apps/redypago-static`: variante RedyPago en HTML/JS.
- `packages/react-credential-profiles/src`: componentes React reutilizables del formulario de credenciales.
- `data`: archivos JSON de pruebas.
- `docs`: sitio estático publicado en GitHub Pages.
- `.github/workflows/deploy-pages.yml`: despliegue automático a GitHub Pages.
- `legacy`: respaldo de la estructura anterior (no usar para nuevos cambios).

## Publicación en GitHub Pages

1. Crea un repositorio en GitHub y sube este contenido.
2. Usa rama `main`.
3. Ve a `Settings > Pages` y en `Build and deployment` selecciona `GitHub Actions`.
4. Haz push a `main`.
5. El workflow `Deploy static docs to GitHub Pages` publicará automáticamente `docs/`.

## URLs esperadas

- Home: `https://<usuario>.github.io/<repo>/`
- Demo VFF: `https://<usuario>.github.io/<repo>/vff/`
- Demo RedyPago: `https://<usuario>.github.io/<repo>/redypago/`
