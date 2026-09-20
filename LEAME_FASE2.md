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

## ⚠️ ¿Cómo guardarlo en PDF?
Dado que este reporte cuenta con **Diseño Web Avanzado** (colores institucionales, cajas de texto dinámicas y nubes de palabras interactivas), no se recomienda intentar usar el botón "Knit to PDF" nativo de RStudio, ya que te marcará errores (falta de LaTeX y widgets HTML incompatibles).

La forma correcta y profesional de generar tu PDF manteniendo la paleta de colores intacta es:
1. Genera el reporte dándole clic normal a **"Knit"** (Knit to HTML).
2. Cuando aparezca la ventana de vista previa en RStudio, da clic en el botón superior que dice **"Open in Browser"** (Abrir en el Navegador).
3. Una vez que tu reporte esté abierto en Chrome, Edge o Safari, presiona **Ctrl + P** (o haz clic derecho y selecciona "Imprimir").
4. En el apartado de Destino/Impresora, selecciona **"Guardar como PDF"**.
5. **Paso Crucial:** En la configuración de impresión, ve a "Más Opciones" y **asegúrate de marcar la casilla "Gráficos de fondo"** (Background graphics). Esto obligará a la impresora a respetar las franjas de color Vino y Ocre. ¡Da clic en Guardar y listo!

¡Si el reporte se genera correctamente, estamos listos para la Fase 3 (Dashboard interactivo)!