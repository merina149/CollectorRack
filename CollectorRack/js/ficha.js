/* ==========================================================================
   ficha.js · Ficha del álbum: el CD sale de la estantería y se muestra de frente
   --------------------------------------------------------------------------
   Usa un <dialog>: el navegador atrapa el foco dentro, lo devuelve al cerrar y
   cierra con Esc. Aquí solo se rellenan los datos y se hace la animación.
   Cuando se elimina un álbum se avisa con el evento 'cr:cambio' (lo escucha app.js).
   ========================================================================== */
window.CR = window.CR || {};

CR.Ficha = (function () {

    const visor = document.getElementById('visor');
    const fondo = document.getElementById('visor-fondo');
    const cdFrente = document.getElementById('cd-frente');
    const ficha = document.getElementById('ficha');

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let abiertoId = null;     // id del álbum que está en la ficha
    let lomo = null;          // el CD de canto del que ha salido
    let animando = false;     // evita pulsar mientras dura la animación

    function el(id) { return document.getElementById(id); }

    function buscarLomo(id) {
        return document.querySelector('.cd[data-id="' + CSS.escape(id) + '"]');
    }

    /* ---------- Datos de la ficha ---------- */
    function rellenar(album) {
        const nota = CR.Util.formatearNota(album.puntuacion);
        const estilo = CR.Util.estiloDeLomo(album.titulo);

        cdFrente.className = 'cd-frente ' + estilo;

        // Portada: si existe y carga, sustituye al disco; si falla, se queda el disco de siempre
        const portada = el('v-portada');
        portada.hidden = true;
        portada.removeAttribute('src');
        portada.onload = function () { portada.hidden = false; cdFrente.classList.add('con-portada'); };
        portada.onerror = function () { portada.hidden = true; cdFrente.classList.remove('con-portada'); };
        portada.alt = 'Portada de ' + album.titulo;
        if (album.portada) portada.src = album.portada;
        el('v-num').textContent = 'nº ' + CR.Datos.numeroDe(album.id);
        el('v-pegatina-titulo').textContent = album.titulo;
        el('v-pegatina-artista').textContent = album.artista;
        el('v-pegatina-nota').textContent = nota + '/10';

        el('visor-titulo').textContent = album.titulo;
        el('v-artista').textContent = album.artista;

        // Datos opcionales: solo se enseñan si existen
        const genero = el('v-genero');
        genero.textContent = album.genero;
        genero.hidden = !album.genero;

        const lanzamiento = el('v-lanzamiento');
        lanzamiento.textContent = 'Lanzamiento: ' + CR.Util.formatearLanzamiento(album.fechaLanzamiento);
        lanzamiento.hidden = !album.fechaLanzamiento;

        // Si la fecha de incorporación es solo una estimación (álbumes antiguos), no se enseña
        const anadido = el('v-anadido');
        anadido.textContent = 'Añadido el ' + CR.Util.formatearFecha(album.anadidoEn);
        anadido.hidden = album.fechaEstimada;

        el('v-nota').textContent = nota + '/10';
        el('v-barra-relleno').style.width = (album.puntuacion * 10) + '%';
        el('v-barra').setAttribute('aria-label', 'Nota ' + nota + ' de 10');

        const comentario = el('v-comentario');
        comentario.textContent = album.comentario;
        comentario.hidden = !album.comentario;
    }

    /* ---------- Animación: cuánto hay que mover y escalar el CD de frente para que
       parta exactamente desde el lomo (y vuelva a él al cerrar) ---------- */
    function medidas() {
        const o = lomo.getBoundingClientRect();
        const d = cdFrente.getBoundingClientRect();
        return {
            dx: (o.left + o.width / 2) - (d.left + d.width / 2),
            dy: (o.top + o.height / 2) - (d.top + d.height / 2),
            sx: o.width / d.width,
            sy: o.height / d.height
        };
    }

    /* k = 1: el CD está en el lomo · k = 0: en su sitio. giro = inclinación en grados. */
    function tumbado(m, giro, k) {
        k = (k === undefined) ? 1 : k;
        return 'translate(' + (m.dx * k) + 'px,' + (m.dy * k) + 'px) perspective(900px) rotateX(' + giro + 'deg) scale(' +
               (1 + (m.sx - 1) * k) + ',' + (1 + (m.sy - 1) * k) + ')';
    }

    /* ---------- Abrir ---------- */
    function abrir(id) {
        const album = CR.Datos.buscar(id);
        if (!album || abiertoId || animando) return;

        abiertoId = id;
        lomo = buscarLomo(id);
        rellenar(album);

        visor.showModal();
        document.body.classList.add('visor-abierto');
        if (lomo) lomo.classList.add('fuera');            // su hueco se queda vacío mientras está fuera

        if (sinMovimiento || !lomo) return;

        const m = medidas();
        animando = true;
        fondo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'both' });
        ficha.animate([
            { opacity: 0, transform: 'translateX(-24px)' },
            { opacity: 0, transform: 'translateX(-24px)', offset: 0.5 },
            { opacity: 1, transform: 'none' }
        ], { duration: 650, easing: 'ease-out', fill: 'both' });
        cdFrente.animate([
            { transform: tumbado(m, 82, 1) },
            { transform: tumbado(m, 50, 0.25), offset: 0.45 },
            { transform: 'none' }
        ], { duration: 750, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' })
            .onfinish = function () { animando = false; };
    }

    /* ---------- Cerrar (con animación de vuelta al hueco) ---------- */
    function cerrar() {
        if (!abiertoId || animando) return;
        if (sinMovimiento || !lomo) { terminar(true); return; }

        const m = medidas();
        animando = true;
        fondo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'both' });
        ficha.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' });
        cdFrente.animate([
            { transform: 'none' },
            { transform: tumbado(m, 82, 1) }
        ], { duration: 550, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'both' })
            .onfinish = function () { terminar(true); };
    }

    /* Cierra la ventana y deja todo limpio. devolverFoco = true lo lleva de vuelta al CD. */
    function terminar(devolverFoco) {
        visor.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
        if (lomo) lomo.classList.remove('fuera');
        if (visor.open) visor.close();
        document.body.classList.remove('visor-abierto');
        const id = abiertoId;
        abiertoId = null;
        animando = false;
        if (devolverFoco && id) {
            const volver = buscarLomo(id);
            if (volver) volver.focus();
        }
        lomo = null;
    }

    /* ---------- Botones de la ficha ---------- */
    el('v-cerrar').addEventListener('click', cerrar);
    fondo.addEventListener('click', cerrar);

    // Esc: en vez de cerrar de golpe, usamos nuestra animación
    visor.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });

    el('v-editar').addEventListener('click', function () {
        const album = CR.Datos.buscar(abiertoId);
        if (!album || animando) return;
        terminar(false);
        CR.Formulario.abrir(album);
    });

    el('v-eliminar').addEventListener('click', async function () {
        const album = CR.Datos.buscar(abiertoId);
        if (!album || animando) return;

        const respuesta = await CR.UI.confirmar({
            titulo: '¿Eliminar «' + album.titulo + '»?',
            texto: 'Se borrará de tu colección y de cualquier colección donde esté. No se puede deshacer.',
            botones: [
                { texto: 'Cancelar', valor: 'no' },                                  // primera opción = segura
                { texto: 'Eliminar álbum', valor: 'si', estilo: 'boton-peligro' }
            ]
        });
        if (respuesta !== 'si') return;

        terminar(false);
        CR.Datos.eliminar(album.id);
        CR.UI.aviso('Álbum eliminado.');
        document.dispatchEvent(new CustomEvent('cr:cambio'));
        document.getElementById('btn-anadir').focus();
    });

    return { abrir };
})();
