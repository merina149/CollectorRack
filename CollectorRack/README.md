# CollectorRack

Estantería de CDs personal. Web estática (HTML + CSS + JavaScript sin dependencias) pensada para GitHub Pages.

## Estructura
```
CollectorRack/
├── index.html            ← página principal (carga el CSS y los scripts)
├── css/
│   └── estilos.css       ← todo el diseño (variables de color, estantería, modales)
├── js/                   ← lógica, un archivo por tarea (se cargan en este orden)
│   ├── util.js           ← funciones pequeñas: fechas, notas, ids
│   ├── ui.js             ← avisos y ventana de confirmación
│   ├── musicbrainz.js    ← API: busca álbumes y portadas (MusicBrainz + Cover Art Archive)
│   ├── datos.js          ← guardar/leer álbumes en el navegador (localStorage)
│   ├── estanteria.js     ← dibuja la estantería y ordena
│   ├── ficha.js          ← ventana con el CD de frente y su información
│   ├── formulario.js     ← añadir/editar álbum + buscador de portadas
│   ├── copia.js          ← exportar/importar copia de seguridad (.json y .txt)
│   └── app.js            ← arranque: conecta todo
├── assets/               ← icono de la app (apple-touch-icon.png) y logo.svg
├── ejemplos/albums-ejemplo.txt  ← lista de ejemplo para probar "Importar archivo"
├── docs/DESIGN.md        ← paleta, tipografía y decisiones de diseño
└── .nojekyll             ← evita que GitHub Pages procese el sitio con Jekyll
```

## Publicar en GitHub Pages
1. Sube **el contenido** de esta carpeta a la raíz del repositorio (manteniendo las carpetas `css`, `js`, `assets`...).
2. Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## API de álbumes y portadas
Usa MusicBrainz (datos) y Cover Art Archive (portadas): gratuitas, sin clave. Se consulta desde el navegador al pulsar «Buscar» en el formulario de añadir álbum.

## Datos
Se guardan solo en el navegador (localStorage). Usa «Descargar copia (.json)» de vez en cuando.
