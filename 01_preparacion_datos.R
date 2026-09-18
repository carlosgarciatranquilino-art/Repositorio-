# ==============================================================================
# Fase 1: Preparación de Datos y Conexión a Google Sheets
# Este script descarga, limpia y prepara los datos de la encuesta de necesidades
# de formación para su análisis posterior.
# ==============================================================================

# 1. Instalar paquetes necesarios (si no están instalados)
paquetes <- c("tidyverse", "googlesheets4", "janitor", "stringr")
nuevos_paquetes <- paquetes[!(paquetes %in% installed.packages()[,"Package"])]
if(length(nuevos_paquetes)) install.packages(nuevos_paquetes)

# 2. Cargar librerías
library(tidyverse)
library(googlesheets4)
library(janitor)
library(stringr)

# ------------------------------------------------------------------------------
# 3. Autenticación y Descarga de Datos de Google Sheets
# ------------------------------------------------------------------------------
# IMPORTANTE: Reemplaza la URL a continuación con la URL real de tu Google Sheet.
url_hoja <- "AQUI_TU_URL_DE_GOOGLE_SHEETS"

# Al ejecutar la siguiente línea por primera vez, R te abrirá el navegador
# para que inicies sesión en Google y des permisos.
cat("Conectando a Google Sheets...\n")
datos_crudos <- read_sheet(url_hoja)

# ------------------------------------------------------------------------------
# 4. Limpieza de Nombres de Columnas
# ------------------------------------------------------------------------------
# janitor::clean_names() convierte todos los nombres de columnas a formato 'snake_case'
# (minúsculas, sin espacios, sin acentos) para facilitar la programación.
datos_limpios <- datos_crudos %>%
  clean_names()

# ------------------------------------------------------------------------------
# 5. Carga e Integración de la Matriz de Dimensiones
# ------------------------------------------------------------------------------
# Lee la matriz de dimensiones (asegúrate de haber llenado matriz_dimensiones.csv)
cat("Cargando matriz de dimensiones...\n")
matriz <- read_csv("matriz_dimensiones.csv") %>%
  clean_names()

# Nota: En esta fase, asumimos que las columnas de las 22 preguntas de la escala Likert
# tienen nombres específicos. Para el análisis automatizado, será útil tener
# un identificador común.

# ------------------------------------------------------------------------------
# 6. Transformaciones Básicas y Tipos de Datos
# ------------------------------------------------------------------------------
# Aquí nos aseguramos de que las variables de contexto sean factores (categorías)
# para facilitar el análisis agrupado.
# (Ajusta los nombres de las columnas según cómo quedaron después de clean_names)

# Ajuste automático de tipos de datos según los nombres reales
datos_limpios <- datos_limpios %>%
  mutate(
    plantel = as.factor(plantel),
    c_c_t = as.factor(c_c_t),
    zona_escolar = as.factor(zona_escolar),
    subdireccion_regional = as.factor(subdireccion_regional),
    naturaleza_formacion = as.factor(naturaleza_formacion),
    situacion_laboral = as.factor(situacion_laboral),
    curriculum = as.factor(curriculum),
    frec_entornos_virtuales = as.factor(frec_entornos_virtuales)
  )

# ------------------------------------------------------------------------------
# 7. Guardar Datos Preparados para Fases Posteriores
# ------------------------------------------------------------------------------
cat("Guardando datos limpios...\n")
saveRDS(datos_limpios, "datos_limpios.rds")
saveRDS(matriz, "matriz_dimensiones.rds")

cat("\n¡Fase 1 completada con éxito! Los datos han sido preparados y guardados en 'datos_limpios.rds'.\n")
