/* ==========================================================================
   formulario.js · Ventana para añadir o editar un álbum
   --------------------------------------------------------------------------
   El mismo formulario sirve para las dos cosas:
     · Añadir:  abrir()        → crea un álbum nuevo
     · Editar:  abrir(album)   → actualiza ESE álbum por su id (nunca crea un duplicado)
   Al guardar avisa con el evento 'cr:cambio' (lo escucha app.js).
   ========================================================================== */
window.CR = window.CR || {};

CR.Formulario = (function () {

    const dialogo = document.getElementById('editor');
    const form = document.getElementById('form-album');
    const botonGuardar = document.getElementById('f-guardar');

    /* Géneros que se sugieren al escribir (el campo sigue siendo libre: se puede escribir cualquier otro). */
    const GENEROS_BASE = ['Pop', 'Rock', 'Indie', 'Alternativo', 'Hip-hop / Rap', 'R&B / Soul', 'Jazz', 'Clásica',
        'Electrónica', 'Metal', 'Punk', 'Folk', 'Reggae', 'Country', 'Banda sonora', 'Experimental'];

    let editandoId = null;      // null = estamos añadiendo; un id = estamos editando ese álbum

    function campo(nombre) { return form.elements[nombre]; }

    /* Rellena la lista de sugerencias: los géneros base + los que ya has usado. */
    function actualizarSugerencias() {
        const lista = document.getElementById('generos');
        const vistos = {};
        lista.textContent = '';
        GENEROS_BASE.concat(CR.Datos.generosUsados()).forEach(function (g) {
            const clave = CR.Util.norm(g);
            if (vistos[clave]) return;
            vistos[clave] = true;
            const opcion = document.createElement('option');
            opcion.value = g;
            lista.appendChild(opcion);
        });
    }

    /* Abre la ventana. Sin argumentos: añadir. Con un álbum: editarlo. */
    function abrir(album) {
        editandoId = album ? album.id : null;
        form.reset();
        actualizarSugerencias();

        document.getElementById('editor-titulo').textContent = album ? 'Editar álbum' : 'Añadir álbum';
        botonGuardar.textContent = album ? 'Guardar cambios' : 'Guardar álbum';
        botonGuardar.disabled = false;

        if (album) {
            campo('titulo').value = album.titulo;
            campo('artista').value = album.artista;
            campo('genero').value = album.genero;
            campo('nota').value = album.puntuacion;
            campo('lanzamiento').value = album.fechaLanzamiento;
            campo('comentario').value = album.comentario;
        }
        dialogo.showModal();
    }

    function cerrar() { dialogo.close(); }

    /* Guarda: valida, avisa de posibles duplicados y añade o actualiza. */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (botonGuardar.disabled) return;                  // evita guardar dos veces con un doble clic
        botonGuardar.disabled = true;

        const nota = CR.Util.leerNumero(campo('nota').value);
        if (!isFinite(nota) || nota < 0 || nota > 10) {
            CR.UI.aviso('La nota debe estar entre 0 y 10.', 'error');
            campo('nota').focus();
            botonGuardar.disabled = false;
            return;
        }

        const datos = {
            titulo: campo('titulo').value,
            artista: campo('artista').value,
            genero: campo('genero').value,
            puntuacion: nota,
            fechaLanzamiento: campo('lanzamiento').value.trim(),
            comentario: campo('comentario').value
        };

        // ¿Ya tienes un álbum con ese título y artista?
        if (CR.Datos.existeDuplicado(datos, editandoId)) {
            const respuesta = await CR.UI.confirmar({
                titulo: 'Este álbum ya está en tu colección',
                texto: 'Ya tienes «' + datos.titulo.trim() + '» de ' + datos.artista.trim() + '. ¿Quieres guardarlo igualmente?',
                botones: [
                    { texto: 'Volver al formulario', valor: 'no' },
                    { texto: 'Guardar igualmente', valor: 'si', estilo: 'boton-suave' }
                ]
            });
            if (respuesta !== 'si') { botonGuardar.disabled = false; return; }
        }

        let guardado;
        if (editandoId) {
            guardado = CR.Datos.actualizar(editandoId, datos);          // actualiza el álbum existente
        } else {
            guardado = CR.Datos.anadir(datos);                          // crea uno nuevo
        }

        cerrar();
        if (!guardado) { CR.UI.aviso('No se encontró el álbum que estabas editando.', 'error'); return; }

        CR.UI.aviso(editandoId ? 'Cambios guardados.' : 'Álbum guardado.');
        document.dispatchEvent(new CustomEvent('cr:cambio', { detail: { resaltarId: guardado.id } }));
    });

    document.getElementById('f-cancelar').addEventListener('click', cerrar);

    return { abrir };
})();
