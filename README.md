# Extensión para JKLM.fun (Firefox)

Esta extensión de Firefox permite automatizar la búsqueda y selección de palabras durante las partidas de BombParty en JKLM.fun.

El bot mantiene un ciclo de letras de la `A` a la `Z`. Al elegir una palabra,
prioriza las opciones que consumen más letras que todavía no fueron utilizadas
en el ciclo actual. Las letras de la palabra se quitan del ciclo y, cuando ya
no queda ninguna, el ciclo vuelve a comenzar desde la `A`.

---

## Guía de Instalación y Uso

Pasos para cargar y probar temporalmente la extensión en Mozilla Firefox:

### 1. Cargar la extensión en Firefox
1. Abrir Firefox y entrar a la siguiente dirección:
   `about:debugging#/runtime/this-firefox`
2. Buscar la opción **"Cargar complemento temporal..."**.
3. Seleccionar y subir el archivo `manifest.json` ubicado en la carpeta raíz del proyecto.
4. Verificar que la extensión aparezca en la lista de extensiones cargadas temporalmente. Si se hacen cambios en el código, se puede recargar la extensión haciendo clic en el botón **"Recargar"**. 
5. Verificar en el ícono de extensiones (arriba a la derecha) que la extensión esté activa y visible.

---

### 2. Unirse a una partida
1. Entrar al sitio web oficial del juego: [https://jklm.fun/](https://jklm.fun/)
2. Unirse a una partida. 
   > **Consejo de prueba:** Para probarla rápidamente, se puede utilizar una sala con un bot existente. Suelen tener la palabra **bot** en el nombre de la sala (por ejemplo: `BirdBot`).

---

### 3. Activar la extensión
1. Hacer clic en el ícono de extensiones de Firefox y buscar la extensión.
2. Al momento de darle a **"Unirse al juego"** en la sala, en el pop-up de la extensión hacer clic en **"Jugar"**.
3. Esperar a que encuentre la partida y comience a elegir palabras de forma automática.

### 4. Demora antes de enviar
En el pop-up se puede configurar un rango en segundos (por ejemplo, entre `0.5` y `3.5`).
En cada turno el bot sortea un tiempo al azar dentro de ese rango: es el tiempo **total** desde que
empieza a escribir la palabra hasta que la envía. Funciona en los dos modos:

* **Completa:** escribe la palabra de una vez y la envía cuando se cumple ese tiempo.
* **Auto:** la escribe letra por letra y el tipeo cuenta dentro de ese tiempo. Si tipear a velocidad
  normal no entra (por ejemplo, palabra larga con un rango corto), tipea más rápido para llegar.

* Si el mínimo es mayor que el máximo, se dan vuelta automáticamente. El máximo permitido es 10 s.
* Los cambios se aplican en caliente, sin reiniciar el bot.
* Si el turno termina mientras el bot espera, la palabra no se envía.
* Ojo: si la demora es muy larga, la bomba puede explotar antes del envío.

### 5. Ver el informe de la partida
En el pop-up, el botón **"📊 Ver último informe"** abre una pestaña con una tabla de todas las
jugadas de la última partida: sílaba, palabra elegida, letras del ciclo consumidas, otras opciones
consideradas, demora de envío y tiempo tipeando.

* El informe se guarda en cada turno, así que se puede abrir durante la partida o después.
* Si la pestaña queda abierta mientras se juega, se actualiza sola.
* Al empezar una partida nueva, el informe arranca de cero.

---

## Requisitos
* Navegador **Mozilla Firefox**.
* Archivo `manifest.json` y demás archivos del proyecto descargados localmente.