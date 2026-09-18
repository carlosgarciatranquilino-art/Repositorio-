# Instrucciones - Fase 2: Reporte Automatizado

Esta fase toma los datos limpios de la Fase 1 y genera un reporte estadístico en formato HTML (o PDF si tienes LaTeX instalado en tu sistema), incluyendo análisis descriptivos, inferenciales y minería de texto.

## Requisitos Previos
1. Haber ejecutado exitosamente la **Fase 1**. Deben existir los archivos `datos_limpios.rds` y `matriz_dimensiones.rds` en tu carpeta de trabajo.
2. Instalar paquetes adicionales de R para la generación de reportes. En la consola de R, copia, pega y ejecuta esta línea:
   ```R
   install.packages(c("rmarkdown", "tidytext", "stopwords", "wordcloud2", "kableExtra", "broom"))
   ```

## Paso 1: Configurar el Reporte (Opcional, pero Recomendado)
1. Abre el archivo `02_reporte_necesidades.Rmd` en RStudio.
2. Este archivo es una plantilla (Markdown). Contiene bloques de texto y bloques grises que son código de R (los llamados *chunks*).
3. **Importante:** El script contiene ejemplos comentados (con un `#` al inicio) de cómo hacer los análisis. Dependiendo de cómo se llamen las columnas en tu Excel original (después de ser limpiadas en la Fase 1), tendrás que "descomentar" (quitar el `#`) y ajustar los nombres de las columnas en el código.
   - Ejemplo: si tu columna de respuestas abiertas se llama `que_tema_necesita`, debes poner ese nombre en la sección de *Minería de Texto*.

## Paso 2: Generar el Reporte ("Knit")
1. En RStudio, con el archivo `02_reporte_necesidades.Rmd` abierto, busca un botón en la barra superior del editor que dice **"Knit"** (tiene un ícono de una bola de estambre).
2. Haz clic en "Knit" (o "Knit to HTML").
3. RStudio comenzará a procesar el código, leerá los datos, generará las gráficas, los análisis estadísticos y las nubes de palabras.

## Resultados Esperados
- Se abrirá una nueva ventana mostrándote el reporte final en formato web (HTML).
- Se creará un archivo llamado `02_reporte_necesidades.html` en tu carpeta. Este archivo lo puedes abrir con cualquier navegador web (Chrome, Edge, Safari) y compartirlo con otras personas para la toma de decisiones.

¡Si el reporte se genera correctamente, estamos listos para la Fase 3 (Dashboard interactivo)!