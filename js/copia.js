/* ==========================================================================
   copia.js · Copias de seguridad: exportar e importar
   --------------------------------------------------------------------------
   Dos formatos:
     · .json  → copia completa (álbumes, lista "Quiero escuchar" y colecciones).
                Es la recomendada para restaurar todo.
     · .txt   → lista sencilla, una línea por álbum:
                título;artista;nota;comentario;género
                También se leen los archivos antiguos de 4 campos (sin género).
   Al importar nunca se sobrescribe nada sin preguntar, y se evitan duplicados.
   ========================================================================== */
window.CR = window.CR || {};

CR.Copia = (function () {

    const MAX_BYTES = 5 * 1024 * 1024;                  // límite de tamaño del archivo a importar (5 MB)
    const archivo = document.getElementById('archivo');

    /* ---------- Descargar un archivo ---------- */
    function descargar(nombre, contenido, tipo) {
        const url = URL.createObjectURL(new Blob([contenido], { type: tipo + ';charset=utf-8' }));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }

    function fechaParaNombre() { return new Date().toISOString().slice(0, 10); }

    /* ---------- Exportar ---------- */
    function exportarJson() {
        const copia = Object.assign(
            { formato: 'collectorrack', version: 2, exportadoEn: new Date().toISOString() },
            CR.Datos.exportable()
        );
        descargar('collectorrack-' + fechaParaNombre() + '.json', JSON.stringify(copia, null, 2), 'application/json');
        CR.UI.aviso('Copia descargada.');
    }

    function exportarTxt() {
        // En el .txt el punto y coma separa campos y el salto de línea separa álbumes, así que se sustituyen
        const limpio = function (t) { return String(t).replace(/;/g, ',').replace(/[\r\n]+/g, ' '); };
        const lineas = CR.Datos.albums().map(function (a) {
            return [limpio(a.titulo), limpio(a.artista), a.puntuacion, limpio(a.comentario), limpio(a.genero)].join(';');
        });
        descargar('albums.txt', lineas.join('\n') + '\n', 'text/plain');
        CR.UI.aviso('Lista descargada.');
    }

    /* ---------- Leer un .txt (4 o 5 campos por línea) ---------- */
    function leerTxt(contenido) {
        const albums = [];
        let ignoradas = 0;
        contenido.split(/\r?\n/).forEach(function (linea) {
            if (!linea.trim()) return;
            const d = linea.split(';');
            if (d.length !== 4 && d.length !== 5) { ignoradas++; return; }
            albums.push({ titulo: d[0], artista: d[1], puntuacion: d[2], comentario: d[3], genero: d[4] || '' });
        });
        return { albums: albums, ignoradas: ignoradas };
    }

    /* ---------- Importar ---------- */
    function importar(fichero) {
        if (fichero.size > MAX_BYTES) { CR.UI.aviso('El archivo es demasiado grande (máximo 5 MB).', 'error'); return; }

        const lector = new FileReader();
        lector.onerror = function () { CR.UI.aviso('No se pudo leer el archivo.', 'error'); };
        lector.onload = async function () {
            const contenido = String(lector.result).replace(/^﻿/, '');     // quita la marca BOM si la hay
            let datos = null;
            let esJson = false;
            let ignoradas = 0;

            if (/\.json$/i.test(fichero.name) || contenido.trim().charAt(0) === '{') {
                try {
                    datos = JSON.parse(contenido);
                    esJson = true;
                } catch (e) {
                    CR.UI.aviso('Ese archivo no es una copia válida de CollectorRack.', 'error');
                    return;
                }
                if (!datos || !Array.isArray(datos.albums)) {
                    CR.UI.aviso('El archivo no contiene álbumes.', 'error');
                    return;
                }
            } else {
                const leido = leerTxt(contenido);
                ignoradas = leido.ignoradas;
                datos = { albums: leido.albums };
            }

            if (!datos.albums.length) { CR.UI.aviso('No encontré álbumes en el archivo.', 'error'); return; }

            const respuesta = await CR.UI.confirmar({
                titulo: 'Importar ' + datos.albums.length + ' álbumes',
                texto: 'Combinar los añade a tu colección sin repetir los que ya tienes. Reemplazar borra tu colección actual y deja solo lo del archivo.',
                botones: [
                    { texto: 'Cancelar', valor: 'no' },
                    { texto: 'Combinar', valor: 'combinar', estilo: 'boton-primario' },
                    { texto: 'Reemplazar', valor: 'reemplazar', estilo: 'boton-peligro' }
                ]
            });
            if (respuesta !== 'combinar' && respuesta !== 'reemplazar') return;

            if (respuesta === 'combinar') {
                const r = CR.Datos.combinar(datos.albums);
                CR.UI.aviso(r.anadidos + ' añadidos, ' + (r.saltados + ignoradas) + ' omitidos (repetidos o incompletos).');
            } else if (esJson) {
                CR.Datos.reemplazarTodo(datos);
                CR.UI.aviso('Copia restaurada.');
            } else {
                CR.Datos.reemplazarAlbums(datos.albums);
                CR.UI.aviso('Colección reemplazada' + (ignoradas ? ' (' + ignoradas + ' líneas omitidas).' : '.'));
            }
            document.dispatchEvent(new CustomEvent('cr:cambio'));
        };
        lector.readAsText(fichero, 'UTF-8');
    }

    /* ---------- Vaciar la colección ---------- */
    async function vaciar() {
        const total = CR.Datos.albums().length;
        if (!total) { CR.UI.aviso('Tu colección ya está vacía.'); return; }
        const respuesta = await CR.UI.confirmar({
            titulo: '¿Vaciar la colección?',
            texto: 'Se borrarán los ' + total + ' álbumes. Descarga antes una copia si quieres conservarlos.',
            botones: [
                { texto: 'Cancelar', valor: 'no' },
                { texto: 'Vaciar colección', valor: 'si', estilo: 'boton-peligro' }
            ]
        });
        if (respuesta !== 'si') return;
        CR.Datos.vaciar();
        CR.UI.aviso('Colección vacía.');
        document.dispatchEvent(new CustomEvent('cr:cambio'));
    }

    /* ---------- Botones ---------- */
    document.getElementById('btn-exportar-json').addEventListener('click', exportarJson);
    document.getElementById('btn-exportar-txt').addEventListener('click', exportarTxt);
    document.getElementById('btn-importar').addEventListener('click', function () { archivo.click(); });
    document.getElementById('btn-vaciar').addEventListener('click', vaciar);
    archivo.addEventListener('change', function () {
        if (archivo.files[0]) importar(archivo.files[0]);
        archivo.value = '';                              // permite elegir el mismo archivo otra vez
    });

    return {};
})();
