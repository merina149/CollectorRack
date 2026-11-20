/* ==========================================================================
   ui.js · Avisos breves y ventanas de confirmación
   --------------------------------------------------------------------------
   Sustituye a alert() y confirm(), que son feos y bloquean la página.
   ========================================================================== */
window.CR = window.CR || {};

CR.UI = (function () {

    let temporizador = null;

    /* Muestra un mensaje breve abajo ("Álbum guardado").
       tipo = 'error' lo marca con borde rojo y lo deja más tiempo. */
    function aviso(texto, tipo) {
        const el = document.getElementById('aviso');
        clearTimeout(temporizador);
        el.textContent = texto;
        el.className = 'aviso visible' + (tipo === 'error' ? ' aviso-error' : '');
        // popover="manual" lo coloca en la capa superior, por encima de las ventanas <dialog>
        if (el.showPopover && !el.matches(':popover-open')) el.showPopover();
        temporizador = setTimeout(function () {
            el.classList.remove('visible');
            setTimeout(function () { if (el.hidePopover && el.matches(':popover-open')) el.hidePopover(); }, 250);
        }, tipo === 'error' ? 6000 : 3500);
    }

    /* Ventana de confirmación. Devuelve una promesa con el "valor" del botón pulsado,
       o null si se cierra con Esc.

       Uso:
           const respuesta = await CR.UI.confirmar({
               titulo: '¿Eliminar este álbum?',
               texto: 'No se puede deshacer.',
               botones: [
                   { texto: 'Cancelar', valor: 'no' },
                   { texto: 'Eliminar', valor: 'si', estilo: 'boton-peligro' }
               ]
           });
       El primer botón recibe el foco, así que debe ser la opción segura. */
    function confirmar(opciones) {
        return new Promise(function (resolver) {
            const dialogo = document.getElementById('confirmacion');
            const contenedorBotones = document.getElementById('confirmacion-botones');

            document.getElementById('confirmacion-titulo').textContent = opciones.titulo;
            document.getElementById('confirmacion-texto').textContent = opciones.texto || '';

            contenedorBotones.textContent = '';
            opciones.botones.forEach(function (b) {
                const boton = document.createElement('button');
                boton.type = 'button';
                boton.className = 'boton ' + (b.estilo || 'boton-secundario');
                boton.textContent = b.texto;
                boton.addEventListener('click', function () { dialogo.close(b.valor); });
                contenedorBotones.appendChild(boton);
            });

            function alCerrar() {
                dialogo.removeEventListener('close', alCerrar);
                resolver(dialogo.returnValue || null);
            }
            dialogo.addEventListener('close', alCerrar);
            dialogo.returnValue = '';
            dialogo.showModal();
        });
    }

    return { aviso, confirmar };
})();
