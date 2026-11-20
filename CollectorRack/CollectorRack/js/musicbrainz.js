/* ==========================================================================
   musicbrainz.js · Búsqueda de álbumes (MusicBrainz) y portadas (Cover Art Archive)
   --------------------------------------------------------------------------
   · MusicBrainz es gratuito y no necesita clave.  Pide no pasar de 1 petición por segundo.
   · Cover Art Archive sirve las portadas; se usan como <img src="..."> directamente,
     así que NO hay llamadas de API cada vez que se dibuja la estantería.

   Para respetar los límites:
     - Solo se busca cuando pulsas «Buscar» (nunca de forma automática).
     - Las peticiones van en una cola con 1,1 segundos de separación.
     - Se recuerdan las búsquedas ya hechas mientras la página esté abierta (caché).
     - Cada búsqueda hace como máximo 2 peticiones.

   Los errores se devuelven con un "tipo" que entiende formulario.js:
     'red' (sin conexión o bloqueada) · 'limite' (demasiadas peticiones) · 'http' (otro fallo)
   ========================================================================== */
window.CR = window.CR || {};

CR.API = (function () {

    const BASE = 'https://musicbrainz.org/ws/2/release-group';
    const PORTADAS = 'https://coverartarchive.org/release-group/';
    const INTERVALO = 1100;            // milisegundos mínimos entre dos peticiones
    const TIEMPO_MAXIMO = 10000;       // si MusicBrainz no responde en 10 s, se corta
    const MAX_RESULTADOS = 8;

    let ultimaPeticion = 0;
    let cola = Promise.resolve();      // las peticiones se encadenan: de una en una
    const cache = new Map();           // texto buscado -> lista de resultados

    function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function fallo(tipo) { const e = new Error(tipo); e.tipo = tipo; return e; }

    /* ---------- Petición con tiempo máximo y un reintento si hay límite ---------- */
    async function pedirJson(url, puedeReintentar) {
        const control = new AbortController();
        const reloj = setTimeout(function () { control.abort(); }, TIEMPO_MAXIMO);
        let respuesta;
        try {
            // Sin cabeceras personalizadas: así el navegador no necesita permiso previo (CORS)
            respuesta = await fetch(url, { signal: control.signal });
        } catch (e) {
            throw fallo('red');
        } finally {
            clearTimeout(reloj);
        }

        if (respuesta.status === 503 || respuesta.status === 429) {      // demasiadas peticiones
            if (puedeReintentar) {
                await esperar(2500);
                ultimaPeticion = Date.now();
                return pedirJson(url, false);
            }
            throw fallo('limite');
        }
        if (!respuesta.ok) throw fallo('http');
        try { return await respuesta.json(); } catch (e) { throw fallo('http'); }
    }

    /* Mete la petición en la cola: espera su turno para no pasar de 1 por segundo. */
    function pedirEnCola(url) {
        const tarea = cola.then(async function () {
            const falta = ultimaPeticion + INTERVALO - Date.now();
            if (falta > 0) await esperar(falta);
            ultimaPeticion = Date.now();
            return pedirJson(url, true);
        });
        cola = tarea.catch(function () { /* un fallo no bloquea la cola */ });
        return tarea;
    }

    /* ---------- Preparar el texto de búsqueda ---------- */
    // Entre comillas solo hay que quitar las comillas y la barra invertida
    function entreComillas(t) { return String(t).replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim(); }
    // Sin comillas hay que quitar además los signos especiales del buscador
    function sinSignos(t) { return String(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); }

    function urlBusqueda(consulta) {
        return BASE + '?fmt=json&limit=' + MAX_RESULTADOS + '&query=' + encodeURIComponent(consulta);
    }

    /* ---------- Convertir un resultado de MusicBrainz a lo que usa la app ---------- */
    const TIPOS = { Album: 'Álbum', Single: 'Sencillo', EP: 'EP', Broadcast: 'Emisión', Other: 'Otro' };
    const SECUNDARIOS = { Compilation: 'Recopilatorio', Soundtrack: 'Banda sonora', Live: 'En directo', Remix: 'Remix',
        Mixtape: 'Mixtape', 'Mixtape/Street': 'Mixtape', Demo: 'Demo', Spokenword: 'Palabra hablada', 'DJ-mix': 'Mezcla DJ' };

    function mayuscula(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }

    function convertir(rg) {
        if (!rg || !/^[0-9a-f-]{36}$/i.test(rg.id || '')) return null;

        const artista = (rg['artist-credit'] || [])
            .map(function (c) { return (c.name || '') + (c.joinphrase || ''); }).join('').trim();

        // Etiquetas de la comunidad, de más a menos votadas: la primera sugiere el género
        const etiquetas = (rg.tags || []).slice()
            .sort(function (a, b) { return (b.count || 0) - (a.count || 0); })
            .map(function (t) { return mayuscula(t.name); }).filter(Boolean);

        // Tipo de edición: "Álbum", "EP", "En directo"… (lo que MusicBrainz sabe del lanzamiento)
        const tipos = [];
        if (rg['primary-type']) tipos.push(TIPOS[rg['primary-type']] || rg['primary-type']);
        (rg['secondary-types'] || []).forEach(function (s) { tipos.push(SECUNDARIOS[s] || s); });

        const fecha = rg['first-release-date'] || '';
        const mbid = rg.id.toLowerCase();

        return {
            mbid: mbid,
            titulo: String(rg.title || '').trim(),
            artista: artista,
            fecha: CR.Util.esFechaLanzamiento(fecha) ? fecha : '',
            tipo: tipos.join(' · '),
            generos: etiquetas.slice(0, 3),
            genero: etiquetas[0] || '',
            portada250: PORTADAS + mbid + '/front-250',
            portada500: PORTADAS + mbid + '/front-500'
        };
    }

    /* ---------- Buscar ----------
       Devuelve una lista de resultados (puede estar vacía). */
    async function buscar(titulo, artista) {
        const t = entreComillas(titulo);
        const a = entreComillas(artista);
        const clave = CR.Util.norm(t) + '|' + CR.Util.norm(a);
        if (cache.has(clave)) return cache.get(clave);

        // 1.º intento: título y artista exactos
        let consulta = 'releasegroup:"' + t + '"' + (a ? ' AND artist:"' + a + '"' : '');
        let datos = await pedirEnCola(urlBusqueda(consulta));
        let lista = (datos['release-groups'] || []).map(convertir).filter(Boolean);

        // 2.º intento (solo si no hubo nada): búsqueda más abierta
        if (!lista.length) {
            datos = await pedirEnCola(urlBusqueda(sinSignos(titulo + ' ' + artista)));
            lista = (datos['release-groups'] || []).map(convertir).filter(Boolean);
        }

        cache.set(clave, lista);
        return lista;
    }

    return { buscar };
})();
