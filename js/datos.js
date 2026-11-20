/* ==========================================================================
   datos.js · Los datos de la app: modelo, guardado y migración
   --------------------------------------------------------------------------
   Todo se guarda en el navegador (localStorage) bajo la clave 'collectorrack-v2'
   como un único objeto:

       {
         version: 2,
         albums:      [ { id, titulo, artista, genero, fechaLanzamiento,
                          puntuacion, comentario, portada, mbid,
                          anadidoEn, fechaEstimada } ],
         escuchar:    [],     // lista "Quiero escuchar"   (se usará en el Hito 3)
         colecciones: [],     // colecciones personalizadas (se usará en el Hito 3)
         ajustes:     { orden: 'fecha', ordenAsc: false }
       }

   Los álbumes de la versión antigua (clave 'collector-albums') se migran solos
   la primera vez. La clave antigua NO se borra: queda como copia de seguridad.
   ========================================================================== */
window.CR = window.CR || {};

CR.Datos = (function () {

    const CLAVE = 'collectorrack-v2';
    const CLAVE_ANTIGUA = 'collector-albums';
    const CLAVE_DANADO = 'collectorrack-v2-danado';        // copia por si los datos se corrompen
    const ORDENES = ['fecha', 'alfabetico', 'puntuacion', 'genero'];

    let estado = estadoVacio();

    function estadoVacio() {
        return {
            version: 2,
            albums: [],
            escuchar: [],
            colecciones: [],
            ajustes: { orden: 'fecha', ordenAsc: false }     // por defecto: más recientes primero
        };
    }

    /* ======================= LIMPIEZA DE DATOS ======================= */

    /* Recorta un texto y le pone un tope de longitud. */
    function texto(valor, maximo) {
        return String(valor == null ? '' : valor).trim().slice(0, maximo);
    }

    /* Convierte cualquier objeto "crudo" (de localStorage, de un archivo importado…)
       en un álbum con todos sus campos y tipos correctos.
       Los campos que falten se rellenan con valores por defecto. */
    function normalizarAlbum(crudo, ahoraIso) {
        const a = crudo || {};
        const nota = CR.Util.leerNumero(a.puntuacion);
        const fechaValida = CR.Util.esFechaIso(a.anadidoEn);

        return {
            id: (typeof a.id === 'string' && a.id) ? a.id : CR.Util.crearId(),
            titulo: texto(a.titulo, 200),
            artista: texto(a.artista, 200),
            genero: texto(a.genero, 60),
            fechaLanzamiento: CR.Util.esFechaLanzamiento(a.fechaLanzamiento) ? a.fechaLanzamiento : '',
            puntuacion: isFinite(nota) ? CR.Util.recortarNota(nota) : 0,
            comentario: texto(a.comentario, 2000),
            portada: /^https:\/\//.test(a.portada || '') ? a.portada : '',      // solo URLs https
            mbid: /^[0-9a-f-]{36}$/i.test(a.mbid || '') ? String(a.mbid).toLowerCase() : '',
            anadidoEn: fechaValida ? a.anadidoEn : ahoraIso,
            // Si no conocemos la fecha real en que se añadió, lo marcamos para no mostrarla
            fechaEstimada: fechaValida ? !!a.fechaEstimada : true
        };
    }

    /* Limpia un estado completo (lo que se lee de localStorage o de una copia .json). */
    function normalizarEstado(crudo) {
        const limpio = estadoVacio();
        if (!crudo || typeof crudo !== 'object') return limpio;

        const ahora = new Date().toISOString();
        const idsUsados = new Set();

        (Array.isArray(crudo.albums) ? crudo.albums : []).forEach(function (raw) {
            const album = normalizarAlbum(raw, ahora);
            if (!album.titulo || !album.artista) return;      // sin título o artista no es un álbum válido
            if (idsUsados.has(album.id)) album.id = CR.Util.crearId();
            idsUsados.add(album.id);
            limpio.albums.push(album);
        });

        limpio.escuchar = Array.isArray(crudo.escuchar) ? crudo.escuchar : [];
        limpio.colecciones = Array.isArray(crudo.colecciones) ? crudo.colecciones : [];

        const ajustes = crudo.ajustes || {};
        if (ORDENES.includes(ajustes.orden)) limpio.ajustes.orden = ajustes.orden;
        if (typeof ajustes.ordenAsc === 'boolean') limpio.ajustes.ordenAsc = ajustes.ordenAsc;
        return limpio;
    }

    /* ======================= CARGAR Y GUARDAR ======================= */

    /* Lee los datos al arrancar. Devuelve un mensaje para mostrar a la persona, o '' si todo va bien. */
    function cargar() {
        let guardado = null;
        try {
            guardado = localStorage.getItem(CLAVE);
        } catch (e) {
            estado = estadoVacio();
            return 'Este navegador no permite guardar datos. Podrás usar la app, pero se perderán al cerrarla.';
        }

        // 1) Ya existen datos nuevos: se usan
        if (guardado) {
            try {
                estado = normalizarEstado(JSON.parse(guardado));
                return '';
            } catch (e) {
                // Datos dañados: los apartamos en otra clave para no perderlos y empezamos limpio
                try { localStorage.setItem(CLAVE_DANADO, guardado); } catch (e2) { /* nada que hacer */ }
                estado = estadoVacio();
                return 'Los datos guardados estaban dañados. He guardado una copia aparte y empiezo con la colección vacía.';
            }
        }

        // 2) No hay datos nuevos: buscamos los de la versión antigua y los migramos
        estado = estadoVacio();
        const antiguos = leerAntiguos();
        if (antiguos.length) {
            estado.albums = antiguos;
            guardar();
            return 'He migrado tus ' + antiguos.length + ' álbumes a la nueva versión.';
        }
        return '';
    }

    /* Lee los álbumes de la versión antigua (solo tenían título, artista, nota y comentario).
       Como no tenían fecha, les damos fechas escalonadas (1 minuto entre cada uno) para conservar su orden,
       y los marcamos como "fechaEstimada" para no enseñar una fecha inventada. */
    function leerAntiguos() {
        let lista;
        try {
            lista = JSON.parse(localStorage.getItem(CLAVE_ANTIGUA) || '[]');
        } catch (e) {
            return [];
        }
        if (!Array.isArray(lista)) return [];

        const base = Date.now() - lista.length * 60000;
        const resultado = [];
        lista.forEach(function (raw, i) {
            const album = normalizarAlbum(
                Object.assign({}, raw, { id: '', anadidoEn: new Date(base + i * 60000).toISOString(), fechaEstimada: true }),
                new Date().toISOString()
            );
            if (album.titulo && album.artista) resultado.push(album);
        });
        return resultado;
    }

    /* Guarda todo en el navegador. Devuelve true si salió bien. */
    function guardar() {
        try {
            localStorage.setItem(CLAVE, JSON.stringify(estado));
            return true;
        } catch (e) {
            CR.UI.aviso('No se pudo guardar. Puede que el navegador esté en modo privado o sin espacio.', 'error');
            return false;
        }
    }

    /* ======================= CONSULTAS ======================= */

    function albums() { return estado.albums; }

    function buscar(id) { return estado.albums.find(function (a) { return a.id === id; }) || null; }

    /* Número de registro: la posición del álbum según el orden en que se añadió. */
    function numeroDe(id) { return estado.albums.findIndex(function (a) { return a.id === id; }) + 1; }

    function ajustes() { return estado.ajustes; }       // se modifica y luego se llama a guardar()

    /* Géneros que ya has usado (sin repetir), para sugerirlos en el formulario. */
    function generosUsados() {
        const vistos = {};
        const lista = [];
        estado.albums.forEach(function (a) {
            const clave = CR.Util.norm(a.genero);
            if (a.genero && !vistos[clave]) { vistos[clave] = true; lista.push(a.genero); }
        });
        return lista;
    }

    /* ¿Son el mismo álbum? Si los dos tienen id de MusicBrainz, manda ese;
       si no, se comparan título y artista normalizados. */
    function sonIguales(a, b) {
        if (a.id && b.id && a.id === b.id) return true;
        if (a.mbid && b.mbid) return a.mbid === b.mbid;
        return CR.Util.norm(a.titulo) === CR.Util.norm(b.titulo) &&
               CR.Util.norm(a.artista) === CR.Util.norm(b.artista);
    }

    function existeDuplicado(datos, ignorarId) {
        return estado.albums.some(function (a) { return a.id !== ignorarId && sonIguales(a, datos); });
    }

    /* ======================= CAMBIOS ======================= */

    /* Añade un álbum nuevo. La fecha de incorporación se pone sola, con la fecha de hoy. */
    function anadir(datos) {
        const album = normalizarAlbum(Object.assign({}, datos, { id: '', anadidoEn: new Date().toISOString(), fechaEstimada: false }), new Date().toISOString());
        estado.albums.push(album);
        guardar();
        return album;
    }

    /* Edita un álbum existente (por id). Nunca crea uno nuevo, y conserva su id y su fecha de incorporación. */
    function actualizar(id, cambios) {
        const i = estado.albums.findIndex(function (a) { return a.id === id; });
        if (i < 0) return null;
        const actual = estado.albums[i];
        const mezclado = Object.assign({}, actual, cambios, {
            id: actual.id, anadidoEn: actual.anadidoEn, fechaEstimada: actual.fechaEstimada
        });
        estado.albums[i] = normalizarAlbum(mezclado, actual.anadidoEn);
        guardar();
        return estado.albums[i];
    }

    /* Elimina un álbum y lo quita también de las colecciones donde estuviera. */
    function eliminar(id) {
        estado.albums = estado.albums.filter(function (a) { return a.id !== id; });
        estado.colecciones.forEach(function (c) {
            if (c && Array.isArray(c.albumIds)) c.albumIds = c.albumIds.filter(function (x) { return x !== id; });
        });
        guardar();
    }

    /* Borra todos los álbumes (las colecciones se quedan, pero vacías). */
    function vaciar() {
        estado.albums = [];
        estado.colecciones.forEach(function (c) { if (c && Array.isArray(c.albumIds)) c.albumIds = []; });
        guardar();
    }

    /* Añade álbumes de una importación SIN duplicar los que ya tienes.
       Devuelve cuántos se añadieron y cuántos se saltaron. */
    function combinar(lista) {
        const ahora = new Date().toISOString();
        let anadidos = 0, saltados = 0;

        lista.forEach(function (raw) {
            const album = normalizarAlbum(raw, ahora);
            if (!album.titulo || !album.artista || existeDuplicado(album)) { saltados++; return; }
            if (estado.albums.some(function (a) { return a.id === album.id; })) album.id = CR.Util.crearId();
            estado.albums.push(album);
            anadidos++;
        });
        guardar();
        return { anadidos: anadidos, saltados: saltados };
    }

    /* Sustituye los álbumes por los de una lista (importación en modo "reemplazar"). */
    function reemplazarAlbums(lista) {
        estado.albums = normalizarEstado({ albums: lista }).albums;
        guardar();
    }

    /* Sustituye TODO (álbumes, lista de escuchar y colecciones) por el contenido de una copia .json.
       Los ajustes de orden actuales se conservan. */
    function reemplazarTodo(crudo) {
        const nuevo = normalizarEstado(crudo);
        nuevo.ajustes = estado.ajustes;
        estado = nuevo;
        guardar();
    }

    /* Copia de todo lo que hay que guardar en un archivo de respaldo. */
    function exportable() {
        return JSON.parse(JSON.stringify({ albums: estado.albums, escuchar: estado.escuchar, colecciones: estado.colecciones }));
    }

    return {
        cargar, guardar, albums, buscar, numeroDe, ajustes, generosUsados,
        existeDuplicado, anadir, actualizar, eliminar, vaciar,
        combinar, reemplazarAlbums, reemplazarTodo, exportable
    };
})();
