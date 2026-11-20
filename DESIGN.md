# CollectorRack · sistema de diseño

Dark mode editorial. Un solo color de acento (rojo); todo lo demás es neutro.

## Color (variables en `estilos.css`, sección 1)
| Variable | Valor | Uso |
|---|---|---|
| `--negro` | #0A0A0B | fondo de página y campos |
| `--carbon` / `--carbon-2` | #121212 / #1c1c1c | superficies: ventanas, mueble |
| `--borde` | #221F22 | líneas y bordes |
| `--hueso` | #F7F4F0 | texto principal |
| `--gris` / `--gris-claro` | #8E8E93 / #b8b8be | texto secundario |
| `--rojo` | #E01E1B | acento: acción principal, foco, nota |

## Tipografía
Arial, Helvetica, sans-serif. Títulos en negrita, `text-wrap: balance`. Campos a 16 px (evita el zoom en iPhone). Números con `tabular-nums`.

## Forma y profundidad
Radio 8 px (controles), 14 px (ventanas). Sombras en capas en el mueble y las ventanas. Botones ≥ 44 px de alto.

## Componentes
- Botón primario (rojo), secundario (borde), suave (carbón), peligro (rojo tenue).
- CD de canto: tres acabados (hielo, humo, rojo) según el título.
- Ficha: CD de frente con caja esmerilada + datos.
- Avisos y confirmaciones propios, sin `alert()`.

## Movimiento
Solo `transform` y `opacity`. Se desactiva con `prefers-reduced-motion`.
