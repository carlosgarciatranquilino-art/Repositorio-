# Instrucciones - Fase 1: Preparación de Datos y Conexión

Esta fase se encarga de conectar tu entorno local de R con Google Drive, descargar las respuestas de la encuesta, y limpiar la base de datos para los análisis posteriores.

## Paso 1: Instalar R y RStudio (Si no los tienes)
1. Descarga e instala R desde: https://cran.r-project.org/
2. Descarga e instala RStudio Desktop desde: https://posit.co/download/rstudio-desktop/

## Paso 2: Preparar la Matriz de Dimensiones (Categorización USICAMM y COSAC)
1. Abre el archivo `matriz_dimensiones.csv` (puedes abrirlo en Excel).
2. Pasa la información de tu archivo de Word a este CSV, pegando el texto literal de cada pregunta en "Texto_Pregunta".
3. Asegúrate de mantener la nueva estructura de las columnas:
   - `Pregunta_ID`
   - `Texto_Pregunta`
   - `Dominio_Marco_Excelencia` (USICAMM)
   - `Indicador_Dominio_Marco_Excelencia` (USICAMM)
   - `Lineas_Tematicas_Orientaciones_COSAC`
   - `Atributos_Docencia_Orientaciones_COSAC`
4. Guarda los cambios manteniendo el formato `.csv` (valores separados por comas).

## Paso 3: Configurar el Script
1. Abre RStudio.
2. Abre el archivo `01_preparacion_datos.R` en RStudio (File > Open File...).
3. En la línea 20 del script, busca el texto `"AQUI_TU_URL_DE_GOOGLE_SHEETS"`.
4. Reemplaza ese texto con la URL real de tu hoja de Google Sheets (donde están las respuestas). Asegúrate de mantener las comillas, por ejemplo: `"https://docs.google.com/spreadsheets/d/1abc123..."`.
   - **⚠️ NOTA IMPORTANTE:** Asegúrate de que tu archivo en Google Drive sea un "Google Sheet" nativo y no un archivo de Excel (`.xlsx`). Si al abrirlo en Drive dice ".XLSX" junto al nombre, ve a "Archivo" > "Guardar como hoja de cálculo de Google". Usa la URL de este nuevo archivo generado. Si no lo haces, R te dará un error indicando que "el documento no debe ser un archivo de Office" (FAILED_PRECONDITION).

## Paso 4: Ejecutar el Script
1. En RStudio, puedes ejecutar todo el script haciendo clic en el botón **"Source"** (arriba a la derecha del editor de código) o seleccionando todo el texto y presionando `Ctrl + Enter`.
2. **IMPORTANTE: Autenticación con Google.**
   - La primera vez que el código intente descargar los datos (línea 25), la consola de R te preguntará si quieres usar tu navegador para autenticarte. Escribe `1` o `Yes` en la consola de R y presiona Enter.
   - Se abrirá una ventana en tu navegador web.
   - Inicia sesión con la cuenta de Google que tiene acceso a la hoja de Sheets.
   - Concede los permisos que solicita "Tidyverse API Packages" (esto permite a R leer tus hojas).
   - Regresa a RStudio. La descarga continuará automáticamente.

## Resultados Esperados
Si todo sale bien, verás en la consola de R el mensaje `¡Fase 1 completada con éxito!...` y se generarán dos nuevos archivos en tu carpeta:
- `datos_limpios.rds`: Tu base de datos lista para analizar.
- `matriz_dimensiones.rds`: Tu matriz lista para integrar.

¡Una vez lograda esta fase, estás listo para generar el reporte!