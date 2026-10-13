# Instrucciones - Fase 3: Dashboard Interactivo (Shiny)

Esta fase proporciona un tablero web interactivo que permite visualizar los datos limpios mediante filtros dinámicos. Esto es ideal para reuniones de toma de decisiones donde necesites mostrar datos en tiempo real.

## Requisitos Previos
1. Haber completado la **Fase 1** (debes tener el archivo `datos_limpios.rds`).
2. Instalar los paquetes necesarios para Shiny. Ejecuta esto en la consola de R:
   ```R
   install.packages(c("shiny", "shinydashboard"))
   ```

## Paso 1: Configurar el Dashboard
1. El código del dashboard se encuentra dentro de la carpeta `dashboard_shiny` en el archivo `app.R`.
2. Como se mencionó en la Fase 2, la estructura exacta de las gráficas (especialmente en la pestaña "Análisis por Dimensión") dependerá de los nombres exactos que tomaron las columnas de tu Excel en la Fase 1.
3. Puedes editar el archivo `app.R` para agregar más gráficas o cambiar los colores institucionales (actualmente configurados en tonos Vino y Ocre del Estado de México).

## Paso 2: Ejecutar la Aplicación
1. En RStudio, abre el archivo `dashboard_shiny/app.R`.
2. En la parte superior derecha del editor de código, verás un botón verde que dice **"Run App"**.
3. Haz clic en ese botón.
4. RStudio abrirá una nueva ventana (o una pestaña en tu navegador web, dependiendo de tu configuración) mostrando el dashboard interactivo.

## Uso del Dashboard
- **Menú Lateral:** Puedes navegar entre el "Resumen General" y el "Análisis Específico".
- **Filtros:** En la parte inferior del menú lateral, selecciona distintas Subdirecciones o Tipos de Formación. Verás cómo las gráficas y los números del centro (Value Boxes) se actualizan instantáneamente.

¡Con esto tienes un producto altamente profesional para presentar los resultados!