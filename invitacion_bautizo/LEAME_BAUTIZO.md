# Invitación de Bautizo Interactiva - Blue Safari

Este repositorio contiene el código necesario para crear una invitación de bautizo web, con temática "Blue Safari", cuenta regresiva y un sistema automático de confirmación de asistencia vinculado a Google Sheets.

## ¿Qué necesitas?
1. Una cuenta de Google (Gmail).
2. De 10 a 15 minutos para configurarlo.

---

## Instrucciones de Instalación

### Paso 1: Crear la Base de Datos (Google Sheets)
1. Ve a [Google Sheets](https://sheets.google.com/) y crea una hoja de cálculo nueva (en blanco).
2. Cámbiale el nombre al archivo por algo como "Lista de Invitados Bautizo".
3. A la pestaña de abajo (que por defecto dice "Hoja 1"), hazle doble clic y ponle el nombre: **Invitados** (debe ser exacto).
4. En la primera fila (fila 1), escribe los siguientes encabezados en las columnas A, B, C y D:
   - **Columna A:** Nombre_Invitado
   - **Columna B:** Boletos_Asignados
   - **Columna C:** Codigo_Unico
   - **Columna D:** Asistencia_Confirmada
5. Llena tus datos a partir de la fila 2.
   - Ejemplo en A2: `Familia García`
   - Ejemplo en B2: `4`
   - Ejemplo en C2: `fam-garcia` *(Este código lo inventas tú, debe ser corto, sin espacios, y único para cada invitado).*
6. **Copia la URL** que aparece en la barra superior de tu navegador (ej: `https://docs.google.com/spreadsheets/d/1abc123...`).

### Paso 2: Crear el Proyecto en Google Apps Script
1. Abre [Google Apps Script](https://script.google.com/) e inicia sesión.
2. Haz clic en el botón azul **"Nuevo proyecto"**.
3. Cambia el nombre del proyecto arriba a la izquierda por "Invitación Bautizo".
4. Verás un archivo llamado `Código.gs` (o `Code.gs`). Borra todo lo que tiene adentro y pega **todo el contenido** de nuestro archivo `Code.gs`.
5. En la línea 5 de `Code.gs`, donde dice `'URL_DE_TU_GOOGLE_SHEET'`, **reemplaza ese texto por la URL que copiaste en el Paso 1** (manteniendo las comillas simples).
6. Haz clic en el ícono del símbolo **+** (al lado de Archivos) y elige **"HTML"**.
7. Nombra el archivo exactamente **`Index`** (Google le agregará el .html solo).
8. Borra el contenido por defecto de ese archivo y pega **todo el contenido** de nuestro archivo `Index.html`.
9. Haz clic en el ícono de **Guardar** (el disquete).

### Paso 3: Publicar la Invitación Web
1. En la parte superior derecha, haz clic en el botón azul **"Implementar"** (Deploy) y luego en **"Nueva implementación"**.
2. Haz clic en el ícono de engranaje (⚙️) junto a "Seleccionar tipo" y elige **"Aplicación web"**.
3. Rellena los datos:
   - *Descripción:* Versión 1 (o déjalo vacío).
   - *Ejecutar como:* **Yo** (tu correo).
   - *Quién tiene acceso:* **Cualquier usuario** (Muy importante para que tus invitados puedan verla).
4. Haz clic en **"Implementar"**.
5. *Nota de seguridad:* La primera vez, Google te pedirá "Autorizar acceso". Haz clic en *Revisar permisos* -> elige tu cuenta -> haz clic en *Avanzado* (abajo) -> y luego en *Ir a Invitación Bautizo (no seguro)* -> Permitir.
6. Al terminar, te aparecerá una ventana con una **URL de la aplicación web**. Cópiala. (Ejemplo: `https://script.google.com/macros/s/ABC123xyz/exec`).

### Paso 4: Compartir con tus invitados
La URL que te dio Google es la dirección base de tu invitación. Para enviársela a un invitado y que la página sepa quién es y cuántos boletos tiene, solo debes agregarle `?invitado=CODIGO` al final.

Por ejemplo, si el código único que le pusiste a la Familia García en el Excel fue `fam-garcia`, el enlace que les mandarás por WhatsApp o pondrás en el PDF será:
`https://script.google.com/macros/s/ABC123xyz/exec?invitado=fam-garcia`

Cuando la abran, la página les dirá *"Familia García, tienes 4 lugares reservados"* y al hacer clic en "Sí", se guardará automáticamente en tu Excel. ¡Listo!