# ==============================================================================
# Fase 3: Dashboard Interactivo de Necesidades de Formación
# Subsecretaría de Educación Media Superior del Estado de México
# ==============================================================================

library(shiny)
library(shinydashboard)
library(tidyverse)
library(ggplot2)
library(igraph)
library(ggraph)
library(networkD3)

# 1. Cargar Datos
# El Dashboard asume que se ejecuta desde la carpeta principal o que
# los datos están en la misma carpeta.
if(file.exists("../datos_limpios.rds")){
  datos <- readRDS("../datos_limpios.rds")
  matriz <- readRDS("../matriz_dimensiones.rds")
  if(file.exists("../matriz_transversal.csv")) {
    matriz_trans <- readr::read_csv("../matriz_transversal.csv", locale = readr::locale(encoding = "latin1"), show_col_types = FALSE)
    matriz_trans <- as.data.frame(matriz_trans)
    matriz_trans$Categoria <- enc2utf8(as.character(matriz_trans$Categoria))
    matriz_trans$Valor_Transversal <- enc2utf8(as.character(matriz_trans$Valor_Transversal))
  } else {
    matriz_trans <- data.frame(Pregunta_ID = character(), Categoria = character(), Valor_Transversal = character())
  }
} else if (file.exists("datos_limpios.rds")) {
  datos <- readRDS("datos_limpios.rds")
  matriz <- readRDS("matriz_dimensiones.rds")
  if(file.exists("matriz_transversal.csv")) {
    matriz_trans <- readr::read_csv("matriz_transversal.csv", locale = readr::locale(encoding = "latin1"), show_col_types = FALSE)
    matriz_trans <- as.data.frame(matriz_trans)
    matriz_trans$Categoria <- enc2utf8(as.character(matriz_trans$Categoria))
    matriz_trans$Valor_Transversal <- enc2utf8(as.character(matriz_trans$Valor_Transversal))
  } else {
    matriz_trans <- data.frame(Pregunta_ID = character(), Categoria = character(), Valor_Transversal = character())
  }
} else {
  stop("No se encontraron los datos. Ejecuta la Fase 1 primero.")
}

# Agregar un identificador único a la base de datos principal para cruces posteriores
datos <- datos %>% mutate(id_docente = row_number())

# Preparar datos cruzados de una vez
matriz_limpia <- matriz %>% mutate(pregunta_id = tolower(pregunta_id))
datos_largos <- datos %>%
  select(id_docente, subdireccion_regional, sistema_educativo, naturaleza_formacion, situacion_laboral, anos_de_experiencia, matches("^p[0-9]+$")) %>%
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
      menuItem("Análisis por Dominio/Línea", tabName = "dimensiones", icon = icon("chart-bar")),
      menuItem("Prioridad Ejecutiva", tabName = "ejecutivo", icon = icon("bullseye")),
      menuItem("Desglose por Pregunta", tabName = "preguntas", icon = icon("list-ol")),
      menuItem("Análisis Transversal", tabName = "transversal", icon = icon("project-diagram"))
    ),
    # Filtros dinámicos
    hr(),
    h4("Filtros Interactivos", style = "margin-left: 15px; color: #DDC8A4;"),
    selectInput("filtro_sistema", "Sistema Educativo:",
                choices = c("Todos", unique(as.character(datos$sistema_educativo)))),
    selectInput("filtro_subdireccion", "Subdirección Regional:",
                choices = c("Todas", unique(as.character(datos$subdireccion_regional)))),
    selectInput("filtro_formacion", "Naturaleza de Formación:",
                choices = c("Todas", unique(as.character(datos$naturaleza_formacion)))),
    selectInput("filtro_laboral", "Situación Laboral:",
                choices = c("Todas", unique(as.character(datos$situacion_laboral)))),
    numericInput("filtro_experiencia", "Años de Experiencia (Máximo):",
                value = 50, min = 0, max = 100)
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
                box(width = 12, title = "Promedio de Necesidad por Indicador Operativo (USICAMM)", status = "warning", solidHeader = TRUE,
                    plotOutput("plot_indicadores", height = "500px"))
              ),
              fluidRow(
                box(width = 12, title = "Matriz Estratégica de Cruce: Indicadores (USICAMM) vs Líneas (COSAC)", status = "primary", solidHeader = TRUE,
                    plotOutput("plot_cruce_inteligente", height = "600px"))
              )
      ),
      # Nueva Pestaña 3: Inteligencia Ejecutiva
      tabItem(tabName = "ejecutivo",
              h2("Top 1: Foco Estratégico de Formación"),
              p("Prioridad absoluta calculada de acuerdo a los filtros actuales:"),
              fluidRow(
                valueBoxOutput("top_dominio", width = 12),
                valueBoxOutput("top_indicador", width = 12),
                valueBoxOutput("top_linea", width = 12),
                valueBoxOutput("top_atributo", width = 12)
              )
      ),
      # Nueva Pestaña 4: Desglose Quirúrgico por Reactivo
      tabItem(tabName = "preguntas",
              h2("Desglose Quirúrgico por Pregunta"),
              p("Análisis detallado de cada reactivo (P1 a P22) según los filtros aplicados."),
              fluidRow(
                box(width = 12, status = "danger", solidHeader = TRUE, title = "Seleccione la pregunta a analizar:",
                    selectInput("filtro_pregunta", "", choices = unique(toupper(matriz_limpia$pregunta_id)))
                )
              ),
              fluidRow(
                box(width = 12, title = "Detalle del Reactivo", status = "primary", solidHeader = TRUE,
                    h4(textOutput("texto_pregunta_actual"), style = "color: #56212F; font-weight: bold;"),
                    hr(),
                    plotOutput("plot_pregunta_individual")
                )
              )
      ),
      # Nueva Pestaña 5: Análisis Transversal
      tabItem(tabName = "transversal",
              h2("Modelo de Formación Transversal"),
              p("Este análisis interactivo evalúa tanto las áreas de oportunidad más críticas (Top 2 Prioridades) como las competencias mejor evaluadas (Bottom 2 Fortalezas Estatales) con base en los filtros laterales. El objetivo es estructurar un diseño instruccional que relacione los indicadores con sus atributos y líneas transversales."),
              fluidRow(
                box(width = 12, status = "danger", solidHeader = FALSE,
                    uiOutput("prosa_transversal")
                )
              ),
              fluidRow(
                box(width = 12, title = "Ecosistema de Red", status = "primary", solidHeader = TRUE,
                    plotOutput("plot_red_transversal", height = "800px"))
              ),
              fluidRow(
                box(width = 12, title = "Ruta de Implementación Instruccional (Sankey)", status = "warning", solidHeader = TRUE,
                    sankeyNetworkOutput("plot_sankey_transversal", height = "800px"))
              )
      )
    )
  )
)

# 3. Lógica del Servidor (Server)
server <- function(input, output) {

  # Datos reactivos basados en los filtros (para métricas generales)
  datos_filtrados <- reactive({
    df <- datos %>% filter(as.numeric(anos_de_experiencia) <= input$filtro_experiencia)
    if(input$filtro_sistema != "Todos") {
      df <- df %>% filter(sistema_educativo == input$filtro_sistema)
    }
    if(input$filtro_subdireccion != "Todas"){
      df <- df %>% filter(subdireccion_regional == input$filtro_subdireccion)
    }
    if(input$filtro_formacion != "Todas"){
      df <- df %>% filter(naturaleza_formacion == input$filtro_formacion)
    }
    if(input$filtro_laboral != "Todas"){
      df <- df %>% filter(situacion_laboral == input$filtro_laboral)
    }
    return(df)
  })

  # Datos reactivos cruzados con matriz (para Likert)
  datos_largos_filtrados <- reactive({
    # Usamos la misma lógica en los datos largos (uniéndolos al filtro base)
    docentes_validos <- datos_filtrados()$id_docente
    df <- datos_largos %>% filter(id_docente %in% docentes_validos)
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

  # Gráficas Contexto (Con Etiquetas y Porcentajes)
  output$plot_subdireccion <- renderPlot({
    req(nrow(datos_filtrados()) > 0)
    datos_filtrados() %>%
      filter(!is.na(subdireccion_regional)) %>%
      count(subdireccion_regional) %>%
      mutate(pct = round(n / sum(n) * 100, 1),
             etiqueta = paste0(n, " (", pct, "%)")) %>%
      ggplot(aes(x = reorder(stringr::str_wrap(subdireccion_regional, 30), n), y = n)) +
      geom_col(fill = "#56212F") +
      geom_text(aes(label = etiqueta), hjust = -0.1, color = "black", size = 4) +
      coord_flip(clip = "off") +
      theme_minimal(base_size = 14) +
      scale_y_continuous(expand = expansion(mult = c(0, 0.2))) +
      labs(x = "", y = "Docentes") +
      theme(plot.margin = margin(10, 40, 10, 10))
  })

  output$plot_formacion <- renderPlot({
    req(nrow(datos_filtrados()) > 0)
    datos_filtrados() %>%
      filter(!is.na(naturaleza_formacion)) %>%
      count(naturaleza_formacion) %>%
      mutate(pct = round(n / sum(n) * 100, 1),
             etiqueta = paste0(n, "\n(", pct, "%)")) %>%
      ggplot(aes(x = naturaleza_formacion, y = n, fill = naturaleza_formacion)) +
      geom_col() +
      geom_text(aes(label = etiqueta), vjust = -0.2, color = "black", size = 5) +
      scale_fill_manual(values = c("#9F2241", "#BC955B", "#D6D1CA", "#56212F", "#977E5B")) +
      theme_minimal(base_size = 14) +
      scale_y_continuous(expand = expansion(mult = c(0, 0.2))) +
      theme(legend.position = "none", plot.margin = margin(20, 10, 10, 10)) +
      labs(x = "", y = "Docentes")
  })

  # Gráficas de Análisis de Necesidades (Ajuste para títulos extremadamente largos)
  output$plot_dominios <- renderPlot({
    datos_largos_filtrados() %>%
      filter(!is.na(dominio_marco_excelencia)) %>%
      group_by(dominio_marco_excelencia) %>%
      summarise(promedio = mean(respuesta, na.rm = TRUE)) %>%
      ggplot(aes(x = reorder(stringr::str_wrap(dominio_marco_excelencia, 35), promedio), y = promedio)) +
      geom_col(fill = "#9F2241") +
      geom_text(aes(label = round(promedio, 2)), hjust = -0.2, size = 5, fontface = "bold") +
      coord_flip(clip = "off") +
      theme_minimal(base_size = 14) +
      labs(x = "", y = "Nivel Promedio de Necesidad (1-5)") +
      scale_y_continuous(limits = c(0, 5)) +
      theme(plot.margin = margin(10, 30, 10, 10))
  })

  output$plot_indicadores <- renderPlot({
    datos_resumen <- datos_largos_filtrados() %>%
      filter(!is.na(indicador_dominio_marco_excelencia)) %>%
      group_by(indicador_dominio_marco_excelencia) %>%
      summarise(promedio = mean(respuesta, na.rm = TRUE), .groups = "drop") %>%
      arrange(desc(promedio))

    if(nrow(datos_resumen) > 5) {
      top_3 <- head(datos_resumen, 3) %>% mutate(tipo = "Área Crítica (Top 3)")
      bottom_2 <- tail(datos_resumen, 2) %>% mutate(tipo = "Fortaleza Operativa (Bottom 2)")
      datos_plot <- bind_rows(top_3, bottom_2)
    } else {
      datos_plot <- datos_resumen %>% mutate(tipo = "Área Crítica (Top 3)")
    }

    datos_plot %>%
      ggplot(aes(x = reorder(stringr::str_wrap(indicador_dominio_marco_excelencia, 45), promedio), y = promedio, fill = tipo)) +
      geom_col() +
      geom_text(aes(label = round(promedio, 2)), hjust = -0.2, size = 5, fontface = "bold") +
      coord_flip(clip = "off") +
      theme_minimal(base_size = 13) +
      scale_fill_manual(values = c("Área Crítica (Top 3)" = "#9F2241", "Fortaleza Operativa (Bottom 2)" = "#977E5B")) +
      labs(x = "", y = "Nivel Promedio de Necesidad (1-5)", fill = "Prioridad") +
      scale_y_continuous(limits = c(0, 5)) +
      theme(plot.margin = margin(10, 30, 10, 10), legend.position = "bottom")
  })

  output$plot_cruce_inteligente <- renderPlot({
    req(nrow(datos_largos_filtrados()) > 0)

    # Preparamos datos para la matriz de calor (Burbujas)
    datos_burbujas_completos <- datos_largos_filtrados() %>%
      filter(!is.na(indicador_dominio_marco_excelencia) & !is.na(lineas_tematicas_orientaciones_cosac)) %>%
      group_by(indicador_dominio_marco_excelencia, lineas_tematicas_orientaciones_cosac) %>%
      summarise(promedio = mean(respuesta, na.rm = TRUE), .groups = "drop") %>%
      arrange(desc(promedio))

    # Extracción de extremos estratégicos: Top 3 (Críticos) y Bottom 2 (Fortalezas)
    # Se añade un control para evitar errores si hay muy pocas cruzas posibles
    if(nrow(datos_burbujas_completos) > 5) {
      top_3 <- head(datos_burbujas_completos, 3)
      bottom_2 <- tail(datos_burbujas_completos, 2)
      datos_burbujas <- bind_rows(top_3, bottom_2)
    } else {
      datos_burbujas <- datos_burbujas_completos
    }

    # Creamos el Bubble Chart Ejecutivo
    ggplot(datos_burbujas, aes(x = stringr::str_wrap(lineas_tematicas_orientaciones_cosac, 30),
                               y = stringr::str_wrap(indicador_dominio_marco_excelencia, 50))) +
      geom_point(aes(size = promedio, color = promedio), alpha = 0.9) +
      geom_text(aes(label = round(promedio, 2)), color = "white", size = 5, fontface = "bold") +
      scale_color_gradient(low = "#DDC8A4", high = "#56212F") +
      scale_size(range = c(15, 30), guide = "none") + # Burbujas más grandes para texto legible
      theme_minimal(base_size = 16) + # Letra base más grande
      theme(
        axis.text.x = element_text(angle = 15, hjust = 0.5, size = 13, face = "bold", color = "#56212F"),
        axis.text.y = element_text(size = 14, color = "#333333", face = "bold"),
        panel.grid.major = element_line(color = "#e0e0e0", linetype = "dashed"),
        legend.position = "right",
        plot.margin = margin(20, 20, 20, 20)
      ) +
      labs(
        x = "\nLínea Temática (COSAC)",
        y = "Indicador Crítico (USICAMM)\n",
        color = "Urgencia\n(1-5)"
      )
  })

  # Cajas de Inteligencia Ejecutiva (Top 1)
  output$top_dominio <- renderValueBox({
    res <- datos_largos_filtrados() %>% filter(!is.na(dominio_marco_excelencia)) %>% group_by(dominio_marco_excelencia) %>% summarise(p=mean(respuesta, na.rm=T)) %>% arrange(desc(p))
    val <- if(nrow(res)>0) enc2utf8(as.character(res[[1]][1])) else "N/D"
    valueBox(val, "Dominio Crítico", icon = icon("exclamation-triangle"), color = "red")
  })

  output$top_indicador <- renderValueBox({
    res <- datos_largos_filtrados() %>% filter(!is.na(indicador_dominio_marco_excelencia)) %>% group_by(indicador_dominio_marco_excelencia) %>% summarise(p=mean(respuesta, na.rm=T)) %>% arrange(desc(p))
    val <- if(nrow(res)>0) enc2utf8(as.character(res[[1]][1])) else "N/D"
    valueBox(val, "Indicador Estratégico a Atender", icon = icon("tasks"), color = "orange")
  })

  output$top_linea <- renderValueBox({
    res <- datos_largos_filtrados() %>% filter(!is.na(lineas_tematicas_orientaciones_cosac)) %>% group_by(lineas_tematicas_orientaciones_cosac) %>% summarise(p=mean(respuesta, na.rm=T)) %>% arrange(desc(p))
    val <- if(nrow(res)>0) enc2utf8(as.character(res[[1]][1])) else "N/D"
    valueBox(val, "Línea Temática Prioritaria", icon = icon("book"), color = "yellow")
  })

  output$top_atributo <- renderValueBox({
    res <- datos_largos_filtrados() %>% filter(!is.na(atributos_docencia_orientaciones_cosac)) %>% group_by(atributos_docencia_orientaciones_cosac) %>% summarise(p=mean(respuesta, na.rm=T)) %>% arrange(desc(p))
    val <- if(nrow(res)>0) enc2utf8(as.character(res[[1]][1])) else "N/D"
    valueBox(val, "Atributo de Docencia Crítico", icon = icon("chalkboard-teacher"), color = "maroon")
  })

  # Desglose Quirúrgico por Pregunta
  output$texto_pregunta_actual <- renderText({
    preg_id <- tolower(input$filtro_pregunta)
    texto <- matriz_limpia %>% filter(pregunta_id == preg_id) %>% pull(texto_pregunta)
    if(length(texto) > 0) enc2utf8(as.character(texto[1])) else "Pregunta no encontrada."
  })

  output$plot_pregunta_individual <- renderPlot({
    req(nrow(datos_largos_filtrados()) > 0)
    preg_id <- tolower(input$filtro_pregunta)

    datos_largos_filtrados() %>%
      filter(pregunta_id == preg_id) %>%
      count(respuesta) %>%
      mutate(pct = round(n / sum(n) * 100, 1),
             etiqueta = paste0(n, " (", pct, "%)"),
             respuesta_cat = factor(respuesta, levels = 1:5, labels = c("1 (Nada)", "2 (Poco)", "3 (Regular)", "4 (Bastante)", "5 (Mucho)"))) %>%
      ggplot(aes(x = respuesta_cat, y = n, fill = respuesta_cat)) +
      geom_col() +
      geom_text(aes(label = etiqueta), vjust = -0.5, size = 5, fontface = "bold", color = "black") +
      scale_fill_manual(values = c("#D6D1CA", "#BC955B", "#977E5B", "#9F2241", "#56212F")) +
      theme_minimal(base_size = 14) +
      scale_y_continuous(expand = expansion(mult = c(0, 0.2))) +
      labs(x = "Nivel de Necesidad Reportada", y = "Número de Docentes") +
      theme(legend.position = "none")
  })

  # --- NUEVO: Lógica del Análisis Transversal ---

  extremos_indicadores <- reactive({
    req(nrow(datos_largos_filtrados()) > 0)
    df_resumen <- datos_largos_filtrados() %>%
      filter(!is.na(indicador_dominio_marco_excelencia)) %>%
      group_by(indicador_dominio_marco_excelencia, dominio_marco_excelencia, pregunta_id) %>%
      summarise(promedio = mean(respuesta, na.rm = TRUE), .groups = "drop") %>%
      arrange(desc(promedio))

    if(nrow(df_resumen) > 4) {
      top_2 <- head(df_resumen, 2) %>% mutate(categoria_extremo = "Prioridad Crítica", index = row_number())
      bottom_2 <- tail(df_resumen, 2) %>% mutate(categoria_extremo = "Fortaleza Estatal", index = row_number())
      bind_rows(top_2, bottom_2)
    } else {
      df_resumen %>% mutate(categoria_extremo = "Prioridad Crítica", index = row_number())
    }
  })

  output$prosa_transversal <- renderUI({
    req(nrow(matriz_trans) > 0)
    datos_extremos <- extremos_indicadores()
    req(nrow(datos_extremos) > 0)

    html_out <- ""

    for(i in 1:nrow(datos_extremos)) {
      indicador <- datos_extremos$indicador_dominio_marco_excelencia[i]
      dominio <- datos_extremos$dominio_marco_excelencia[i]
      pregunta <- datos_extremos$pregunta_id[i]
      promedio <- round(datos_extremos$promedio[i], 2)
      cat_extremo <- datos_extremos$categoria_extremo[i]
      idx <- datos_extremos$index[i]

      relaciones <- matriz_trans %>% filter(tolower(Pregunta_ID) == tolower(pregunta))
      lineas <- relaciones %>% filter(tolower(Categoria) %in% c("linea", "línea", "linea tematica", "línea temática")) %>% pull(Valor_Transversal)
      atributos <- relaciones %>% filter(tolower(Categoria) %in% c("atributo")) %>% pull(Valor_Transversal)

      # Estilos por tipo
      if(cat_extremo == "Prioridad Crítica") {
        b_color <- "#fcf8e3"
        b_border <- "#9F2241"
        h_color <- "#9F2241"
        texto_intro <- paste0("Para resolver esta <strong>necesidad crítica</strong>, la formación deberá enmarcarse en el eje central de <strong>", dominio, "</strong>. El objetivo de aprendizaje específico deberá centrarse de lleno en <strong>", indicador, "</strong>.")
        texto_trans <- "Sin embargo, para garantizar un impacto integral, el programa formativo debe tejer de manera transversal los siguientes componentes complementarios: "
      } else {
        b_color <- "#f0fdf4"
        b_border <- "#977E5B"
        h_color <- "#977E5B"
        texto_intro <- paste0("Esta área representa una <strong>fortaleza estatal consolidada</strong>. La práctica docente ya domina el eje de <strong>", dominio, "</strong> con alta solvencia en <strong>", indicador, "</strong>.")
        texto_trans <- "Para capitalizar esta fortaleza, se sugiere utilizar a estos docentes como tutores (mentoría inversa) para transferir a otros colegas los siguientes elementos transversales: "
      }

      prosa <- paste0(
        "<div style='background-color: ", b_color, "; padding: 15px; border-left: 5px solid ", b_border, "; margin-bottom: 15px;'>",
        "<h4 style='color: ", h_color, "; margin-top: 0;'>", cat_extremo, " #", idx, ": ", indicador, "</h4>",
        "<p><strong>Puntaje Promedio:</strong> ", promedio, " / 5.0</p>",
        "<p style='text-align: justify;'>", texto_intro, " "
      )

      if(length(lineas) > 0 || length(atributos) > 0) {
        prosa <- paste0(prosa, texto_trans)
        if(length(lineas) > 0) {
          prosa <- paste0(prosa, "alineándose estratégicamente con las líneas de <em>", paste(lineas, collapse = ", "), "</em>")
          if(length(atributos) > 0) prosa <- paste0(prosa, "; y ") else prosa <- paste0(prosa, ".")
        }
        if(length(atributos) > 0) {
          prosa <- paste0(prosa, "fomentando directamente atributos docentes como el <em>", paste(atributos, collapse = ", "), "</em>.")
        }
      } else {
        prosa <- paste0(prosa, "No se registraron cruces transversales adicionales en la matriz para este rubro.")
      }

      prosa <- paste0(prosa, "</p></div>")
      html_out <- paste0(html_out, prosa)
    }

    HTML(html_out)
  })

  output$plot_red_transversal <- renderPlot({
    req(nrow(matriz_trans) > 0)
    datos_extremos <- extremos_indicadores()
    req(nrow(datos_extremos) > 0)

    enlaces <- data.frame(origen = character(), destino = character(), tipo = character(), stringsAsFactors = FALSE)

    for(i in 1:nrow(datos_extremos)) {
      indicador <- as.character(datos_extremos$indicador_dominio_marco_excelencia[i])
      pregunta <- as.character(datos_extremos$pregunta_id[i])
      promedio <- round(datos_extremos$promedio[i], 2)
      cat_extremo <- datos_extremos$categoria_extremo[i]
      idx <- datos_extremos$index[i]

      tipo_nodo <- if(cat_extremo == "Prioridad Crítica") "Indicador Crítico" else "Fortaleza Estatal"
      ind_corto <- paste0(tipo_nodo, " #", idx, "\n", stringr::str_sub(indicador, 1, 30), "...\n(Promedio: ", promedio, ")")

      relaciones <- matriz_trans %>% filter(tolower(Pregunta_ID) == tolower(pregunta))

      if(nrow(relaciones) > 0) {
        for(j in 1:nrow(relaciones)) {
          enlaces <- rbind(enlaces, data.frame(origen = ind_corto, destino = relaciones$Valor_Transversal[j], tipo = relaciones$Categoria[j], tipo_origen = tipo_nodo))
        }
      }
    }

    req(nrow(enlaces) > 0)
    grafo <- graph_from_data_frame(d = enlaces, directed = FALSE)

    # Asignar tipos a los nodos para el coloreo
    V(grafo)$tipo <- "Transversal"
    # Filtrar nodos origen que son críticos o fortalezas
    nodos_criticos <- enlaces %>% filter(tipo_origen == "Indicador Crítico") %>% pull(origen) %>% unique()
    nodos_fortalezas <- enlaces %>% filter(tipo_origen == "Fortaleza Estatal") %>% pull(origen) %>% unique()

    V(grafo)$tipo[V(grafo)$name %in% nodos_criticos] <- "Indicador Crítico"
    V(grafo)$tipo[V(grafo)$name %in% nodos_fortalezas] <- "Fortaleza Estatal"

    set.seed(42)
    ggraph(grafo, layout = "fr") +
      geom_edge_link(aes(edge_alpha = 0.5), edge_width = 1, color = "#DDC8A4") +
      geom_node_point(aes(color = tipo, size = tipo)) +
      geom_node_text(aes(label = name), repel = TRUE, size = 4.5, fontface = "bold") +
      scale_color_manual(values = c("Indicador Crítico" = "#9F2241", "Fortaleza Estatal" = "#977E5B", "Transversal" = "#56212F")) +
      scale_size_manual(values = c("Indicador Crítico" = 12, "Fortaleza Estatal" = 12, "Transversal" = 6)) +
      theme_void() +
      theme(legend.position = "bottom", legend.title = element_blank(), legend.text = element_text(size=12))
  })

  output$plot_sankey_transversal <- renderSankeyNetwork({
    req(nrow(matriz_trans) > 0)
    datos_extremos <- extremos_indicadores()
    req(nrow(datos_extremos) > 0)

    enlaces_sankey <- data.frame(origen = character(), destino = character(), valor = numeric(), stringsAsFactors = FALSE)

    for(i in 1:nrow(datos_extremos)) {
      dominio <- as.character(datos_extremos$dominio_marco_excelencia[i])
      indicador <- as.character(datos_extremos$indicador_dominio_marco_excelencia[i])
      pregunta <- as.character(datos_extremos$pregunta_id[i])
      promedio <- round(datos_extremos$promedio[i], 2)
      cat_extremo <- datos_extremos$categoria_extremo[i]
      idx <- datos_extremos$index[i]

      prefijo <- if(cat_extremo == "Prioridad Crítica") "Crit." else "Fort."
      ind_formateado <- paste0(prefijo, " ", idx, ": ", stringr::str_sub(indicador, 1, 40), "... (", promedio, ")")
      dom_formateado <- stringr::str_sub(dominio, 1, 40)

      # Enlace Dominio -> Indicador
      enlaces_sankey <- rbind(enlaces_sankey, data.frame(origen = dom_formateado, destino = ind_formateado, valor = 3))

      relaciones <- matriz_trans %>% filter(tolower(Pregunta_ID) == tolower(pregunta))
      if(nrow(relaciones) > 0) {
        for(j in 1:nrow(relaciones)) {
          enlaces_sankey <- rbind(enlaces_sankey, data.frame(origen = ind_formateado, destino = relaciones$Valor_Transversal[j], valor = 1))
        }
      }
    }

    req(nrow(enlaces_sankey) > 0)
    nodos <- data.frame(name = unique(c(enlaces_sankey$origen, enlaces_sankey$destino)))
    enlaces_sankey$IDorigen <- match(enlaces_sankey$origen, nodos$name) - 1
    enlaces_sankey$IDdestino <- match(enlaces_sankey$destino, nodos$name) - 1

    color_scale <- 'd3.scaleOrdinal().range(["#56212F", "#9F2241", "#BC955B", "#977E5B", "#DDC8A4"])'

    sankeyNetwork(Links = enlaces_sankey, Nodes = nodos,
                  Source = "IDorigen", Target = "IDdestino",
                  Value = "valor", NodeID = "name",
                  fontSize = 13, nodeWidth = 30, colourScale = color_scale,
                  margin = list(top = 20, right = 10, bottom = 10, left = 10))
  })
}

# 4. Ejecutar la Aplicación
shinyApp(ui = ui, server = server)
