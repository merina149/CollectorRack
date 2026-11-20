/* ==========================================================================
   estanteria.js · Dibuja la estantería de CDs y ordena los álbumes
   --------------------------------------------------------------------------
   Estructura que se genera:
       .mueble  (4 columnas, 10 huecos por columna = 40 CDs; si hay más, otro mueble debajo)
         └ .columna (<ol>)
             └ .hueco (<li>)
                 └ .cd (<button>)  ← el CD visto de canto, con data-id del álbum

   Está escrita para servir a cualquier lista de álbumes (la colección principal ahora;
   la lista "Quiero escuchar" y las colecciones más adelante).
   ========================================================================== */
window.CR = window.CR || {};

CR.Estanteria = (function () {

    const COLUMNAS = 4;
    const HUECOS_POR_COLUMNA = 10;
    const HUECOS_POR_MUEBLE = COLUMNAS * HUECOS_POR_COLUMNA;

    /* ======================= ORDENACIÓN ======================= */

    /* Devuelve una COPIA ordenada de la lista; la lista original no se toca.
       orden: 'fecha' | 'alfabetico' | 'puntuacion' | 'genero'
       ascendente: solo afecta a 'fecha' (false = más recientes primero). */
    function ordenar(albums, orden, ascendente) {
        // Guardamos la posición original para que los empates sean siempre estables
        const lista = albums.map(function (a, i) { return { a: a, i: i }; });

        function porTitulo(x, y) {
            return x.a.titulo.localeCompare(y.a.titulo, 'es', { sensitivity: 'base', numeric: true }) || (x.i - y.i);
        }

        lista.sort(function (x, y) {
            if (orden === 'alfabetico') return porTitulo(x, y);

            if (orden === 'puntuacion') return (y.a.puntuacion - x.a.puntuacion) || porTitulo(x, y);   // mejor nota primero

            if (orden === 'genero') {
                const gx = CR.Util.norm(x.a.genero), gy = CR.Util.norm(y.a.genero);
                if (gx !== gy) {
                    if (!gx) return 1;                    // los álbumes sin género van al final
                    if (!gy) return -1;
                    return gx.localeCompare(gy, 'es');
                }
                return porTitulo(x, y);
            }

            // 'fecha': por fecha de incorporación a CollectorRack
            const dif = (Date.parse(x.a.anadidoEn) - Date.parse(y.a.anadidoEn)) || (x.i - y.i);
            return ascendente ? dif : -dif;
        });

        return lista.map(function (x) { return x.a; });
    }

    /* ======================= DIBUJO ======================= */

    function crearSpan(clase, contenido) {
        const s = document.createElement('span');
        s.className = clase;
        s.textContent = contenido;
        return s;
    }

    /* Crea el botón de un CD visto de canto. */
    function crearLomo(album, mostrarGenero) {
        const lomo = document.createElement('button');
        const estilo = CR.Util.estiloDeLomo(album.titulo);
        const nota = CR.Util.formatearNota(album.puntuacion);

        lomo.type = 'button';
        lomo.className = 'cd ' + estilo;
        lomo.dataset.id = album.id;
        lomo.dataset.estilo = estilo;
        lomo.setAttribute('aria-label', album.titulo + ', ' + album.artista +
            (album.genero ? ', ' + album.genero : '') + ', nota ' + nota);

        // Al ordenar por género, el lomo enseña también el género junto al artista
        const secundario = (mostrarGenero ? (album.genero || 'Sin género') + ' · ' : '') + album.artista;

        lomo.appendChild(crearSpan('cd-titulo', album.titulo));
        lomo.appendChild(crearSpan('cd-artista', secundario));
        lomo.appendChild(crearSpan('cd-nota', nota));
        return lomo;
    }

    /* Dibuja la estantería dentro de "contenedor".
       opciones = { orden, ordenAsc } */
    function pintar(contenedor, albums, opciones) {
        const lista = ordenar(albums, opciones.orden, opciones.ordenAsc);
        const mostrarGenero = opciones.orden === 'genero';
        const muebles = Math.max(1, Math.ceil(lista.length / HUECOS_POR_MUEBLE));

        contenedor.textContent = '';

        for (let m = 0; m < muebles; m++) {
            const mueble = document.createElement('div');
            mueble.className = 'mueble';

            for (let c = 0; c < COLUMNAS; c++) {
                const columna = document.createElement('ol');
                columna.className = 'columna';

                for (let h = 0; h < HUECOS_POR_COLUMNA; h++) {
                    // Se llena columna por columna, de arriba abajo
                    const posicion = m * HUECOS_POR_MUEBLE + c * HUECOS_POR_COLUMNA + h;
                    const hueco = document.createElement('li');
                    hueco.className = 'hueco';
                    if (posicion < lista.length) hueco.appendChild(crearLomo(lista[posicion], mostrarGenero));
                    columna.appendChild(hueco);
                }
                mueble.appendChild(columna);
            }
            contenedor.appendChild(mueble);
        }
    }

    /* Hace entrar con animación el CD de un álbum recién guardado y lo trae a la vista. */
    function resaltar(contenedor, id) {
        const lomo = contenedor.querySelector('.cd[data-id="' + CSS.escape(id) + '"]');
        if (!lomo) return;
        lomo.classList.add('nuevo');
        lomo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    return { ordenar, pintar, resaltar };
})();
