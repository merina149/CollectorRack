/* ==========================================================================
   app.js · Arranque y pegamento entre las piezas
   --------------------------------------------------------------------------
   Aquí solo se coordina: cargar datos, dibujar la estantería, el selector de
   orden y los eventos generales. Cada cosa concreta vive en su propio archivo.
   Cuando algo cambia los datos, avisa con el evento 'cr:cambio' y aquí se vuelve a dibujar.
   ========================================================================== */
(function () {

    const estanteria = document.getElementById('estanteria');
    const selectorOrden = document.getElementById('orden');
    const botonSentido = document.getElementById('btn-sentido');

    /* Vuelve a dibujar todo lo que depende de los datos. */
    function repintar(resaltarId) {
        const lista = CR.Datos.albums();
        const ajustes = CR.Datos.ajustes();

        CR.Estanteria.pintar(estanteria, lista, { orden: ajustes.orden, ordenAsc: ajustes.ordenAsc });

        document.getElementById('total').textContent = lista.length;
        document.getElementById('total-texto').textContent = lista.length === 1 ? 'álbum en la colección' : 'álbumes en la colección';
        document.getElementById('vacio').hidden = lista.length > 0;

        selectorOrden.value = ajustes.orden;
        botonSentido.hidden = ajustes.orden !== 'fecha';
        botonSentido.textContent = ajustes.ordenAsc ? 'Más antiguos primero' : 'Más recientes primero';

        if (resaltarId) CR.Estanteria.resaltar(estanteria, resaltarId);
    }

    /* Cambiar el orden solo cambia cómo se ve; los datos de los álbumes no se tocan. */
    selectorOrden.addEventListener('change', function () {
        CR.Datos.ajustes().orden = selectorOrden.value;
        CR.Datos.guardar();
        repintar();
    });

    botonSentido.addEventListener('click', function () {
        const ajustes = CR.Datos.ajustes();
        ajustes.ordenAsc = !ajustes.ordenAsc;
        CR.Datos.guardar();
        repintar();
    });

    /* Un solo oyente para todos los CDs (también los que se creen más tarde). */
    estanteria.addEventListener('click', function (e) {
        const lomo = e.target.closest('.cd');
        if (lomo) CR.Ficha.abrir(lomo.dataset.id);
    });

    document.getElementById('btn-anadir').addEventListener('click', function () { CR.Formulario.abrir(); });

    document.addEventListener('cr:cambio', function (e) {
        repintar(e.detail && e.detail.resaltarId);
    });

    /* ---------- Arranque ---------- */
    const mensaje = CR.Datos.cargar();
    repintar();
    if (mensaje) CR.UI.aviso(mensaje);
})();
