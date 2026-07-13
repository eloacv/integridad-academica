# NOVA — experiencia interactiva sobre integridad académica

Proyecto estático compatible con GitHub Pages. No necesita servidor, instalación ni proceso de compilación.

## Probar localmente

Descomprime la carpeta y abre `index.html` en el navegador. Para una prueba más fiel, también puedes usar la extensión Live Server de Visual Studio Code.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube **el contenido de esta carpeta** a la raíz del repositorio.
3. En GitHub, entra en **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`.
6. Guarda los cambios y espera a que GitHub publique la dirección.

Todas las rutas son relativas, por lo que funciona dentro de una URL como `usuario.github.io/nombre-del-repositorio/`.

## Conectar Google Forms

Abre `script.js` y reemplaza esta línea:

```js
const FORM_EMBED_URL = "";
```

por la URL de inserción del formulario, por ejemplo:

```js
const FORM_EMBED_URL = "https://docs.google.com/forms/d/e/ID_DEL_FORMULARIO/viewform?embedded=true";
```

En Google Forms, la URL se obtiene desde **Enviar → Insertar HTML (`<>`)**.

## Archivos principales

- `index.html`: estructura y contenido de las ocho pantallas.
- `styles.css`: diseño, responsive y animaciones.
- `script.js`: navegación, puntaje e interacciones.
- `nova-engine.js`: estados y movimientos de Nova.
- `assets/nova.png`: imagen oficial de Nova.
