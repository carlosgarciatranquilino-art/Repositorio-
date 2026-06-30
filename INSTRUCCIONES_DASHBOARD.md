# Guía de Instalación: Dashboard de Análisis de Encuestas con IA

Este proyecto es una Web App de Google Apps Script diseñada para conectarse directamente a un Google Sheet (donde tengas respuestas de Google Forms) y analizarlas. Combina **análisis cuantitativo** (frecuencias, conteos, gráficas de barras) y **análisis cualitativo con IA** (palabras clave, análisis de sentimiento y categorización de preguntas abiertas).

## Prerrequisitos
1. Una cuenta de Google con acceso al Google Sheet que contiene las respuestas de tu formulario.
2. Una cuenta en [OpenAI](https://platform.openai.com/) y una **API Key**. OpenAI es el motor detrás de ChatGPT y requiere algo de saldo en la plataforma para procesar el análisis de texto.

---

## Paso 1: Configurar el Script en tu Google Sheet

1. Abre tu archivo de Google Sheets donde tienes las respuestas de tu encuesta.
2. En el menú superior, haz clic en **Extensiones** > **Apps Script**.
3. Se abrirá una nueva pestaña con un editor de código. Cambia el nombre del proyecto en la parte superior (donde dice "Proyecto sin título") a algo como "Dashboard Encuestas IA".

## Paso 2: Agregar el Código Backend

1. En el editor de Apps Script, verás un archivo llamado `Código.gs` (o `Code.gs`). Borra todo su contenido.
2. Copia todo el texto de nuestro archivo `DashboardCode.gs` y pégalo ahí.
3. **Configuraciones importantes en el código:**
   - Busca la línea: `const OPENAI_API_KEY = 'TU_API_KEY_DE_OPENAI_AQUI';` y reemplaza el texto con tu verdadera API Key de OpenAI.
   - Busca la línea: `const SHEET_NAME = 'Respuestas de formulario 1';`. Asegúrate de que el texto entre comillas coincida **exactamente** con el nombre de la pestaña (la solapa en la parte inferior de tu hoja de cálculo) donde están los datos.

## Paso 3: Agregar la Interfaz Gráfica (HTML)

1. En el editor de Apps Script, haz clic en el ícono del símbolo **+** (junto a la palabra "Archivos") y selecciona **HTML**.
2. Nombra a este archivo `Dashboard` (Google le agregará la extensión `.html` automáticamente).
3. Borra el código por defecto y copia ahí todo el texto de nuestro archivo `Dashboard.html`.
4. Guarda los cambios haciendo clic en el ícono del disquete en la barra superior.

## Paso 4: Publicar el Dashboard como Aplicación Web

1. En la parte superior derecha, haz clic en el botón azul **Implementar** (Deploy) y luego en **Nueva implementación**.
2. Haz clic en el ícono de engranaje (⚙️) junto a "Seleccionar tipo" y elige **Aplicación web**.
3. Completa los detalles:
   - **Descripción:** (Opcional, ej. "Versión 1").
   - **Ejecutar como:** "Yo" (Tu cuenta de correo).
   - **Quién tiene acceso:** "Solo yo" (Recomendado, a menos que quieras que todo tu equipo lo vea, en cuyo caso selecciona "Cualquier usuario que tenga una cuenta de Google").
4. Haz clic en **Implementar**.
5. *Nota:* La primera vez, Google te pedirá que "Revises permisos". Sigue las instrucciones en pantalla, elige tu cuenta de Google, ve a "Avanzado" y haz clic en "Ir a Dashboard Encuestas (no seguro)". Luego dale en "Permitir".
6. Obtendrás una **URL de Aplicación web**. ¡Cópiala y guárdala!

## Paso 5: ¡Uso del Dashboard!

1. Pega la URL en tu navegador web.
2. El Dashboard cargará automáticamente los datos de tu Google Sheet.
3. Usa el **primer menú desplegable** para seleccionar preguntas cerradas y ver su distribución en gráfica de barras.
4. Usa el **segundo menú desplegable** (en la sección de IA) para seleccionar una pregunta abierta (ej. "Comentarios adicionales") y haz clic en **Analizar con IA**. Espera unos segundos y la IA te mostrará el sentimiento general, palabras clave y agrupará los temas principales de lo que la gente escribió.