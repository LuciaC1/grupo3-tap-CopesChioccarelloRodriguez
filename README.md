# JKLM Bot

Extensión para Mozilla Firefox que automatiza la búsqueda y selección de palabras
durante las partidas de BombParty en [JKLM.fun](https://jklm.fun/).

El bot mantiene un ciclo de letras de la `A` a la `Z` y prioriza las palabras que
consumen más letras que todavía no fueron utilizadas en el ciclo actual. Cuando
el ciclo se agota, vuelve a comenzar desde la `A`.

## Funcionalidades

- **Dos modos de escritura:**
  - **Completa:** escribe la palabra de una sola vez.
  - **Auto:** escribe la palabra letra por letra.
- **Demora configurable:** permite establecer un rango de espera de entre `0` y
  `10` segundos antes de enviar la palabra.
- **Control en caliente:** el bot puede encenderse, apagarse o reconfigurarse
  sin reiniciar la extensión.
- **Informe de la partida:** registra las decisiones tomadas y los tiempos de
  cada jugada.

## Instalación

La extensión se carga temporalmente desde Firefox:

1. Abrir `about:debugging#/runtime/this-firefox`.
2. Seleccionar **Cargar complemento temporal...**.
3. Elegir el archivo `manifest.json` ubicado en la raíz del proyecto.
4. Confirmar que **JKLM Bot** aparezca entre las extensiones cargadas.

Para aplicar cambios realizados en el código, utilizar el botón **Recargar** de
la extensión.

## Uso

1. Ingresar a [JKLM.fun](https://jklm.fun/) y unirse a una partida.
2. Abrir el menú de extensiones de Firefox y seleccionar **JKLM Bot**.
3. Elegir el modo de escritura y configurar, si se desea, los valores mínimo y
   máximo de la demora.
4. Durante la partida, seleccionar **▶ Encender bot**.
5. Para detenerlo, seleccionar **⏹ Apagar bot**. Si había una palabra pendiente
   de envío, se cancela.

Si la página se recarga mientras el bot está encendido, la extensión retoma su
funcionamiento automáticamente.

### Demora de envío

En cada turno se sortea una demora dentro del rango configurado. El tiempo
representa el total transcurrido desde que comienza la escritura hasta que se
envía la palabra:

- En modo **Completa**, la palabra se escribe de una vez y se envía al finalizar
  la demora.
- En modo **Auto**, el tiempo de tipeo está incluido en la demora total. Si el
  rango es demasiado corto para escribir a velocidad normal, el bot ajusta la
  velocidad para respetarlo.

Si los valores se ingresan invertidos, se ordenan automáticamente. Si el turno
termina antes del envío, la palabra no se envía.

## Métricas e informe

El botón **📊 Ver último informe** abre una pestaña con el detalle de la partida.
El informe se guarda después de cada turno, puede consultarse mientras la partida
está en curso y se actualiza automáticamente si la pestaña permanece abierta.

Para cada jugada se registran las siguientes métricas:

| Métrica | Descripción |
| --- | --- |
| Sílaba | Secuencia de letras solicitada por el juego. |
| Palabra elegida | Palabra seleccionada por el bot. |
| Letras del ciclo consumidas | Letras nuevas que la palabra quitó del ciclo actual. |
| Letras pendientes después de jugar | Letras que todavía quedan disponibles en el ciclo. |
| Ciclo de letras | Número del ciclo en el que se realizó la jugada. |
| Letras totales usadas | Letras consumidas acumuladas durante la partida. |
| Otras opciones (Top 3) | Hasta tres alternativas consideradas por el bot. |
| Demora de envío | Tiempo total, en segundos, hasta enviar la palabra. |
| Tiempo tipeando | Tiempo empleado en escribirla en modo **Auto**. |

El informe corresponde únicamente a la última partida: al comenzar una nueva,
las métricas anteriores se reemplazan.

## Requisitos

- Mozilla Firefox.
- Una copia local de este repositorio.
