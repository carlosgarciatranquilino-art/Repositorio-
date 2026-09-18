# ==============================================================================
# Fase 3: Dashboard Interactivo de Necesidades de Formación
# Subsecretaría de Educación Media Superior del Estado de México
# ==============================================================================

library(shiny)
library(shinydashboard)
library(tidyverse)
library(ggplot2)

# 1. Cargar Datos
# El Dashboard asume que se ejecuta desde la carpeta principal o que
# los datos están en la misma carpeta.
if(file.exists("../datos_limpios.rds")){
  datos <- readRDS("../datos_limpios.rds")
  matriz <- readRDS("../matriz_dimensiones.rds")
} else if (file.exists("datos_limpios.rds")) {
  datos <- readRDS("datos_limpios.rds")
  matriz <- readRDS("matriz_dimensiones.rds")
} else {
  stop("No se encontraron los datos. Ejecuta la Fase 1 primero.")
}

# Preparar datos cruzados de una vez
matriz_limpia <- matriz %>% mutate(pregunta_id = tolower(pregunta_id))
datos_largos <- datos %>%
  mutate(id_docente = row_number()) %>%
  select(id_docente, subdireccion_regional, naturaleza_formacion, matches("^p[0-9]+$")) %>%
  pivot_longer(cols = matches("^p[0-9]+$"), names_to = "pregunta_id", values_to = "respuesta") %>%
  mutate(respuesta = as.numeric(respuesta)) %>%
  left_join(matriz_limpia, by = "pregunta_id")

# 2. Interfaz de Usuario (UI)
ui <- dashboardPage(
  skin = "red", # Usando un color similar al institucional
  dashboardHeader(title = "Necesidades de Formación SEMS", titleWidth = 350),
  dashboardSidebar(
    width = 350,
    sidebarMenu(
      menuItem("Resumen General", tabName = "resumen", icon = icon("dashboard")),
      menuItem("Análisis por Dominio/Línea", tabName = "dimensiones", icon = icon("chart-bar"))
    ),
    # Filtros dinámicos
    hr(),
    h4("Filtros", style = "margin-left: 15px;"),
    selectInput("filtro_subdireccion", "Subdirección Regional:",
                choices = c("Todas", unique(as.character(datos$subdireccion_regional)))),
    selectInput("filtro_formacion", "Naturaleza de Formación:",
                choices = c("Todas", unique(as.character(datos$naturaleza_formacion))))
  ),
  dashboardBody(
    # CSS personalizado para colores institucionales (Vino y Ocre)
    tags$head(tags$style(HTML('
      .skin-red .main-header .navbar {background-color: #56212F;}
      .skin-red .main-header .logo {background-color: #9F2241; color: white;}
      .skin-red .main-header .logo:hover {background-color: #56212F;}
    '))),

    tabItems(
      # Pestaña 1: Resumen
      tabItem(tabName = "resumen",
              h2("Contexto General"),
              fluidRow(
                valueBoxOutput("total_docentes", width = 4),
                valueBoxOutput("promedio_general", width = 4)
              ),
              fluidRow(
                box(title = "Participación por Subdirección", status = "primary", solidHeader = TRUE,
                    plotOutput("plot_subdireccion")),
                box(title = "Naturaleza de la Formación", status = "warning", solidHeader = TRUE,
                    plotOutput("plot_formacion"))
              )
      ),
      # Pestaña 2: Dominios y Líneas
      tabItem(tabName = "dimensiones",
              h2("Necesidades de Formación Prioritarias"),
              fluidRow(
                box(width = 12, title = "Promedio de Necesidad por Dominio (USICAMM)", status = "danger", solidHeader = TRUE,
                    plotOutput("plot_dominios"))
              ),
              fluidRow(
                box(width = 12, title = "Promedio de Necesidad por Línea Temática (COSAC)", status = "warning", solidHeader = TRUE,
                    plotOutput("plot_lineas"))
              )
      )
    )
  )
)

# 3. Lógica del Servidor (Server)
server <- function(input, output) {

  # Datos reactivos basados en los filtros (para métricas generales)
  datos_filtrados <- reactive({
    df <- datos
    if(input$filtro_subdireccion != "Todas"){
      df <- df %>% filter(subdireccion_regional == input$filtro_subdireccion)
    }
    if(input$filtro_formacion != "Todas"){
      df <- df %>% filter(naturaleza_formacion == input$filtro_formacion)
    }
    return(df)
  })

  # Datos reactivos cruzados con matriz (para Likert)
  datos_largos_filtrados <- reactive({
    df <- datos_largos
    if(input$filtro_subdireccion != "Todas"){
      df <- df %>% filter(subdireccion_regional == input$filtro_subdireccion)
    }
    if(input$filtro_formacion != "Todas"){
      df <- df %>% filter(naturaleza_formacion == input$filtro_formacion)
    }
    return(df)
  })

  # Cajas de Valores
  output$total_docentes <- renderValueBox({
    valueBox(nrow(datos_filtrados()), "Docentes Evaluados", icon = icon("users"), color = "red")
  })

  output$promedio_general <- renderValueBox({
    promedio <- round(mean(datos_largos_filtrados()$respuesta, na.rm = TRUE), 2)
    valueBox(promedio, "Nivel de Necesidad (1-5)", icon = icon("graduation-cap"), color = "yellow")
  })

  # Gráficas Contexto
  output$plot_subdireccion <- renderPlot({
    datos_filtrados() %>%
      ggplot(aes(y = forcats::fct_infreq(as.character(subdireccion_regional)))) +
      geom_bar(fill = "#56212F") +
      theme_minimal() +
      labs(x = "Docentes", y = "")
  })

  output$plot_formacion <- renderPlot({
    datos_filtrados() %>%
      ggplot(aes(x = naturaleza_formacion, fill = naturaleza_formacion)) +
      geom_bar() +
      scale_fill_manual(values = c("#9F2241", "#BC955B", "#D6D1CA")) +
      theme_minimal() +
      theme(legend.position = "none") +
      labs(x = "", y = "Docentes")
  })

  # Gráficas de Análisis de Necesidades
  output$plot_dominios <- renderPlot({
    datos_largos_filtrados() %>%
      filter(!is.na(dominio_marco_excelencia)) %>%
      group_by(dominio_marco_excelencia) %>%
      summarise(promedio = mean(respuesta, na.rm = TRUE)) %>%
      ggplot(aes(x = reorder(dominio_marco_excelencia, promedio), y = promedio)) +
      geom_col(fill = "#9F2241") +
      coord_flip() +
      theme_minimal() +
      labs(x = "Dominio", y = "Nivel Promedio de Necesidad") +
      ylim(0, 5)
  })

  output$plot_lineas <- renderPlot({
    datos_largos_filtrados() %>%
      filter(!is.na(lineas_tematicas_orientaciones_cosac)) %>%
      group_by(lineas_tematicas_orientaciones_cosac) %>%
      summarise(promedio = mean(respuesta, na.rm = TRUE)) %>%
      ggplot(aes(x = reorder(lineas_tematicas_orientaciones_cosac, promedio), y = promedio)) +
      geom_col(fill = "#BC955B") +
      coord_flip() +
      theme_minimal() +
      labs(x = "Línea Temática", y = "Nivel Promedio de Necesidad") +
      ylim(0, 5)
  })
}

# 4. Ejecutar la Aplicación
shinyApp(ui = ui, server = server)
