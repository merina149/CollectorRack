/* ==========================================================================
   util.js · Funciones pequeñas que usa todo el proyecto
   --------------------------------------------------------------------------
   Todo el código cuelga de un único objeto global llamado CR
   (de CollectorRack) para que los archivos no se pisen entre sí:
       CR.Util · CR.UI · CR.Datos · CR.Estanteria · CR.Ficha · CR.Formulario · CR.Copia
   ========================================================================== */
window.CR = window.CR || {};

CR.Util = (function () {

    /* Convierte un texto a una forma "plana" para compararlo:
       sin mayúsculas, sin tildes y sin signos.
       Así "Tyler, The Creator" y "tyler the creator" cuentan como iguales. */
    function norm(texto) {
        return String(texto || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita las tildes
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    /* Crea un identificador único para cada álbum. */
    function crearId() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    /* Limita la nota al rango 0-10 con un solo decimal. */
    function recortarNota(numero) {
        return Math.min(10, Math.max(0, Math.round(numero * 10) / 10));
    }

    /* Convierte lo que escribe la persona ("8,5" u "8.5") en número. NaN si no es un número. */
    function leerNumero(texto) {
        return parseFloat(String(texto).trim().replace(',', '.'));
    }

    /* La fecha de lanzamiento puede ser "2016", "2016-08" o "2016-08-20". */
    const PATRON_LANZAMIENTO = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
    function esFechaLanzamiento(texto) {
        return typeof texto === 'string' && PATRON_LANZAMIENTO.test(texto);
    }

    /* Comprueba que un texto sea una fecha ISO válida (la fecha en que se añadió el álbum). */
    function esFechaIso(texto) {
        return typeof texto === 'string' && !isNaN(Date.parse(texto));
    }

    /* ---------- Formatos para mostrar (siempre en español) ---------- */

    function formatearNota(numero) {                       // 8.5 -> "8,5" · 10 -> "10"
        return Number(numero).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    }

    function formatearFecha(iso) {                         // ISO -> "20 nov 2026"
        const fecha = new Date(iso);
        if (isNaN(fecha)) return '';
        return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatearLanzamiento(texto) {                 // "2016-08" -> "agosto de 2016"
        if (!esFechaLanzamiento(texto)) return '';
        const partes = texto.split('-');
        if (partes.length === 1) return partes[0];
        const fecha = new Date(Date.UTC(+partes[0], +partes[1] - 1, partes[2] ? +partes[2] : 1));
        const opciones = partes.length === 2
            ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
            : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
        return fecha.toLocaleDateString('es-ES', opciones);
    }

    /* Elige uno de los tres acabados del CD según el título.
       Siempre da el mismo resultado para el mismo título. */
    function estiloDeLomo(titulo) {
        let h = 0;
        for (let i = 0; i < titulo.length; i++) h = (Math.imul(h, 31) + titulo.charCodeAt(i)) | 0;
        const n = ((h % 7) + 7) % 7;
        return n <= 2 ? 'estilo-hielo' : (n <= 5 ? 'estilo-humo' : 'estilo-rojo');
    }

    return {
        norm, crearId, recortarNota, leerNumero,
        esFechaLanzamiento, esFechaIso,
        formatearNota, formatearFecha, formatearLanzamiento, estiloDeLomo
    };
})();
