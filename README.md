# CarritoFlex - Demo Checkout Flex

Demo web estatico para probar integracion de checkout Flex con 3 flujos:

- Formulario normal (inline)
- Pop up (modal)
- Formulario expandido

El proyecto esta pensado para pruebas y se ejecuta solo con archivos estaticos (`index.html` + `vff_oop.js` + assets).

## 1. Estructura del proyecto

```txt
CarritoFlex/
  .nojekyll
  index.html
  vff_oop.js
  Pay-Me.png
```

- `index.html`: UI completa, estilos y estructura de la pagina.
- `vff_oop.js`: logica de checkout, autenticacion, nonce, render de respuestas y comportamiento responsive.
- `Pay-Me.png`: logo de cabecera.
- `.nojekyll`: evita procesamiento Jekyll en GitHub Pages.

## 2. Requisitos

- Navegador moderno (Chrome, Edge, Firefox, Safari).
- Internet (usa CSS/JS externos y endpoints remotos).
- No requiere Node, npm ni build step.

## 3. Ejecucion local

Opciones recomendadas:

1. Abrir `index.html` directamente en el navegador.
2. Levantar servidor estatico:

```powershell
cd "c:\Users\pkukurelo\OneDrive - BIZLINKS SAC\Documentos\CarritoFlex"
python -m http.server 8080
```

Luego abrir:

```txt
http://localhost:8080
```

## 4. Funcionalidad principal

### 4.1 Flujos de pago

- `Formulario normal`: renderiza checkout en `#demo`.
- `Pop up`: abre modal y renderiza checkout en `#demoModal`.
- `Formulario expandido`: activa clase `expandido` y renderiza en `#demo`.

Funciones globales expuestas:

- `abrirFormularioNormal(monto?, moneda?)`
- `abrirModal(monto?, moneda?)`
- `abrirFormularioExpandido(monto?, moneda?)`
- `cerrarModal()`

### 4.2 Navegacion superior

- Link `Checkout` ejecuta el mismo flujo que `Formulario normal`.
- Link `Documentacion` abre docs externas.
- Boton de `Datos de prueba` abre pagina de referencia.

### 4.3 Comportamiento responsive del header

- Desktop:
  - Logo a la izquierda.
  - Menu principal al centro.
  - Boton azul de datos de prueba al extremo derecho.
- Mobile (`max-width: 640px`):
  - Icono sandwich a la izquierda.
  - Logo centrado horizontalmente.
  - Boton azul de datos de prueba a la derecha.

### 4.4 Opciones de checkout

Desde la UI se puede cambiar:

- Monto (`#paymentAmount`)
- Moneda (`#paymentCurrency`)
- Metodos de pago (checkboxes `name="pm"`)

## 5. Configuracion tecnica

La configuracion vive en `vff_oop.js`, objeto `CONFIG`:

- `debug`
- `environment` (`tst` o `prod`)
- `algApiVersion`
- `qrExpirationMs`
- `environments.tst` y `environments.prod`:
  - `authBaseUrl`
  - `apiDevBaseUrl`
  - `cancelApiBaseUrl`
  - `apiAudience`
  - `js` y `css` de Flex
  - `creds` (`clientId`, `clientSecret`, `merchantCode`)

Tambien existe panel "Pago seguro" para alternar ambiente y credenciales desde UI, incluyendo guardado de perfiles en `localStorage`.

## 6. Deploy a dominio .io (GitHub Pages)

El proyecto ya esta listo para despliegue estatico.

Archivos minimos a publicar:

- `index.html`
- `vff_oop.js`
- `Pay-Me.png`
- `.nojekyll`

Pasos rapidos:

1. Subir estos archivos a la rama `main` de tu repo.
2. En GitHub: `Settings -> Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main` y carpeta `/ (root)`.
5. Guardar y esperar publicacion.

URL esperada:

```txt
https://<usuario>.github.io
```

Si usas dominio propio `.io`, agrega `CNAME` en el repo y configura DNS en tu proveedor.

## 7. Operacion y debug

Consola util:

- `window.vffDebugState()`
- `window.printQrExpiration()`
- `window.printQrCancellation()`
- `window.forceQrCancellationNow()`

## 8. Troubleshooting rapido

1. No carga Flex:
   - Validar internet y URLs de `js/css` en `CONFIG.environments`.
2. Error de token/nonce:
   - Revisar credenciales y ambiente (`tst` vs `prod`).
3. No se ven cambios de UI:
   - Forzar recarga con `Ctrl+F5`.
4. Menu mobile raro:
   - Verificar viewport y reglas `@media(max-width:640px)`.

## 9. Nota de alcance

Este proyecto esta orientado a pruebas y demo visual/funcional.

Para uso productivo, se recomienda mover manejo de secretos a backend y endurecer politicas de seguridad del frontend.

