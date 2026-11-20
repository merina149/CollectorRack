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

    // Datos que vienen de la búsqueda (o del álbum que se edita) y no tienen campo visible
    let elegido = { mbid: '', portada: '' };
    let buscando = false;       // evita lanzar dos búsquedas a la vez con un doble clic

    const botonBuscar = document.getElementById('f-buscar');
    const zonaResultados = document.getElementById('f-resultados');
    const cajaPortada = document.getElementById('f-portada-caja');
    const imgPortada = document.getElementById('f-portada-img');
    const miniatura = document.getElementById('f-portada-miniatura');
    const textoPortada = document.getElementById('f-portada-texto');

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

        elegido = { mbid: album ? album.mbid : '', portada: album ? album.portada : '' };
        zonaResultados.textContent = '';
        mostrarPortadaElegida();

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

    /* ======================= BÚSQUEDA DE PORTADA E INFORMACIÓN ======================= */

    /* Enseña (u oculta) la portada elegida debajo de los resultados. */
    function mostrarPortadaElegida() {
        miniatura.classList.remove('sin-portada');
        if (elegido.portada) {
            cajaPortada.hidden = false;
            textoPortada.textContent = 'Portada elegida';
            imgPortada.onerror = function () {
                // La portada no existe en el servidor: se guarda el álbum sin ella
                elegido.portada = '';
                miniatura.classList.add('sin-portada');
                textoPortada.textContent = 'Este álbum no tiene portada disponible. Se guardará sin ella.';
            };
            imgPortada.src = elegido.portada;
        } else {
            cajaPortada.hidden = true;
            imgPortada.removeAttribute('src');
        }
    }

    function mensajeBusqueda(texto) {
        zonaResultados.textContent = '';
        const p = document.createElement('p');
        p.className = 'mensaje-busqueda';
        p.textContent = texto;
        zonaResultados.appendChild(p);
    }

    /* Dibuja la lista de coincidencias: portada, título, artista, año, tipo y género. */
    function pintarResultados(lista) {
        zonaResultados.textContent = '';
        const ul = document.createElement('ul');
        ul.className = 'lista-resultados';

        lista.forEach(function (r) {
            const li = document.createElement('li');
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'resultado';

            const marco = document.createElement('div');
            marco.className = 'miniatura';
            const img = document.createElement('img');
            img.alt = '';                                           // decorativa: el texto ya dice qué álbum es
            img.width = 56; img.height = 56;
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.addEventListener('error', function () { marco.classList.add('sin-portada'); img.remove(); });
            img.src = r.portada250;
            marco.appendChild(img);

            const texto = document.createElement('div');
            texto.className = 'resultado-texto';
            const t = document.createElement('strong');
            t.textContent = r.titulo;
            const a = document.createElement('span');
            a.textContent = r.artista;
            const meta = document.createElement('small');
            meta.textContent = [r.fecha ? r.fecha.slice(0, 4) : '', r.tipo, r.generos.join(', ')].filter(Boolean).join(' · ');
            texto.appendChild(t); texto.appendChild(a); texto.appendChild(meta);

            boton.appendChild(marco);
            boton.appendChild(texto);
            boton.addEventListener('click', function () { elegir(r); });

            li.appendChild(boton);
            ul.appendChild(li);
        });
        zonaResultados.appendChild(ul);
    }

    /* Se ha elegido una coincidencia: se rellenan los datos del álbum.
       NUNCA se tocan la nota ni el comentario. El género y la fecha solo se rellenan si estaban vacíos
       (así no pisa lo que ya hubieras escrito). Después puedes revisarlo todo antes de guardar. */
    function elegir(r) {
        campo('titulo').value = r.titulo;
        campo('artista').value = r.artista;
        if (!campo('genero').value.trim() && r.genero) campo('genero').value = r.genero;
        if (r.fecha) campo('lanzamiento').value = r.fecha;

        elegido = { mbid: r.mbid, portada: r.portada500 };
        mostrarPortadaElegida();
        mensajeBusqueda('Datos rellenados. Revísalos, pon tu nota y guarda.');
        campo('nota').focus();
    }

    async function buscar() {
        if (buscando) return;
        const titulo = campo('titulo').value.trim();
        if (!titulo) {
            mensajeBusqueda('Escribe al menos el título del álbum para buscar.');
            campo('titulo').focus();
            return;
        }

        buscando = true;
        botonBuscar.disabled = true;
        botonBuscar.textContent = 'Buscando…';
        mensajeBusqueda('Buscando…');

        try {
            const lista = await CR.API.buscar(titulo, campo('artista').value.trim());
            if (!dialogo.open) return;                                      // cerraste la ventana mientras buscaba
            if (lista.length) pintarResultados(lista);
            else mensajeBusqueda('No encontré coincidencias. Prueba con otro título o artista, o rellena los datos a mano.');
        } catch (e) {
            if (!dialogo.open) return;
            if (e.tipo === 'limite') mensajeBusqueda('MusicBrainz está recibiendo demasiadas peticiones. Espera un momento e inténtalo de nuevo.');
            else if (e.tipo === 'red') mensajeBusqueda('No se pudo conectar con MusicBrainz. Comprueba tu conexión; puedes guardar el álbum a mano sin portada.');
            else mensajeBusqueda('MusicBrainz no respondió bien. Inténtalo más tarde o guarda el álbum a mano.');
        } finally {
            buscando = false;
            botonBuscar.disabled = false;
            botonBuscar.textContent = 'Buscar portada e información';
        }
    }

    botonBuscar.addEventListener('click', buscar);

    document.getElementById('f-portada-quitar').addEventListener('click', function () {
        elegido.portada = '';
        mostrarPortadaElegida();
    });

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
            comentario: campo('comentario').value,
            mbid: elegido.mbid,
            portada: elegido.portada
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
