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
} else if (file.exists("datos_limpios.rds")) {
  datos <- readRDS("datos_limpios.rds")
} else {
  # Si no hay datos, creamos un dataset falso para que la app no falle al abrir
  datos <- data.frame(
    subdireccion_regional = sample(c("Norte", "Sur", "Valle de Toluca", "Oriente"), 100, replace = T),
    formacion_profesional = sample(c("Pedagógica", "Disciplinar"), 100, replace = T),
    puntaje_necesidad = rnorm(100, mean = 3, sd = 1)
  )
}

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
    selectInput("filtro_formacion", "Formación Profesional:",
                choices = c("Todas", unique(as.character(datos$formacion_profesional))))
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
                box(title = "Formación Profesional", status = "warning", solidHeader = TRUE,
                    plotOutput("plot_formacion"))
              )
      ),
      # Pestaña 2: Dominios y Líneas (Ejemplo)
      tabItem(tabName = "dimensiones",
              h2("Análisis Específico (Ejemplo)"),
              fluidRow(
                box(width = 12, status = "danger",
                    p("Aquí se conectarán los resultados cruzados con la Matriz de Dominios (USICAMM)
                      y Líneas Temáticas (COSAC) una vez que se estructuren los datos reales de la Fase 1."))
              )
      )
    )
  )
)

# 3. Lógica del Servidor (Server)
server <- function(input, output) {

  # Datos reactivos basados en los filtros
  datos_filtrados <- reactive({
    df <- datos
    if(input$filtro_subdireccion != "Todas"){
      df <- df %>% filter(subdireccion_regional == input$filtro_subdireccion)
    }
    if(input$filtro_formacion != "Todas"){
      df <- df %>% filter(formacion_profesional == input$filtro_formacion)
    }
    return(df)
  })

  # Cajas de Valores
  output$total_docentes <- renderValueBox({
    valueBox(nrow(datos_filtrados()), "Docentes Evaluados", icon = icon("users"), color = "red")
  })

  output$promedio_general <- renderValueBox({
    # Simulando el cálculo de un promedio global
    promedio <- round(mean(datos_filtrados()$puntaje_necesidad, na.rm = TRUE), 2)
    valueBox(promedio, "Nivel de Necesidad (1-5)", icon = icon("graduation-cap"), color = "yellow")
  })

  # Gráficas
  output$plot_subdireccion <- renderPlot({
    datos_filtrados() %>%
      count(subdireccion_regional) %>%
      ggplot(aes(x = reorder(subdireccion_regional, n), y = n)) +
      geom_col(fill = "#56212F") +
      coord_flip() +
      theme_minimal() +
      labs(x = "", y = "Docentes")
  })

  output$plot_formacion <- renderPlot({
    datos_filtrados() %>%
      count(formacion_profesional) %>%
      ggplot(aes(x = formacion_profesional, y = n, fill = formacion_profesional)) +
      geom_col() +
      scale_fill_manual(values = c("#9F2241", "#BC955B")) +
      theme_minimal() +
      theme(legend.position = "none") +
      labs(x = "", y = "Docentes")
  })
}

# 4. Ejecutar la Aplicación
shinyApp(ui = ui, server = server)
