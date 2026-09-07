// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================
// Registrate en https://the-odds-api.com/ para obtener tu API Key gratuita
const API_KEY = 'TU_API_KEY_AQUI';

// ==========================================
// FUNCIÓN PRINCIPAL DE INTERFAZ WEB (ENRUTADOR)
// ==========================================
function doGet(e) {
  // Si se envía el parámetro ?app=apuestas, carga la app de apuestas.
  // De lo contrario, carga el formulario de Factibilidad por defecto.
  if (e && e.parameter && e.parameter.app === 'apuestas') {
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Calculadora de Value Bets y Kelly')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else {
    return HtmlService.createHtmlOutputFromFile('FactibilidadIndex')
        .setTitle('Formulario de Pertinencia y Factibilidad')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// ==========================================
// FUNCIONES PARA LA API (LLAMADAS DESDE EL FRONTEND)
// ==========================================

/**
 * Obtiene los partidos de las ligas seleccionadas usando The-Odds-API.
 */
function getMatches(sportKey) {
  if (API_KEY === 'TU_API_KEY_AQUI' || API_KEY === '') {
    return { error: 'Por favor, configura tu API_KEY en Code.gs.' };
  }

  // Si sportKey es "world_cup" (Mundial 2026), The-Odds-API lo maneja como 'soccer_fifa_world_cup'
  const sport = sportKey || 'soccer_mexico_ligamx';

  // URL para obtener cuotas (odds) de H2H (1X2) de casas de apuestas globales
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=eu,us&markets=h2h&oddsFormat=decimal`;

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      return { error: `Error de la API: ${json.message || 'Código ' + response.getResponseCode()}` };
    }

    return processMatchData(json);

  } catch (e) {
    return { error: 'Error al conectar con la API externa: ' + e.toString() };
  }
}

/**
 * Procesa los datos crudos de la API y calcula una "Cuota Real (True Odds)" promediada
 */
function processMatchData(apiData) {
  const matches = [];

  for (let i = 0; i < apiData.length; i++) {
    const match = apiData[i];

    // Extraer equipos y fecha
    const homeTeam = match.home_team;
    const awayTeam = match.away_team;
    const date = new Date(match.commence_time).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

    // Recopilar cuotas de todos los bookmakers disponibles para calcular la probabilidad promedio
    let totalHomeOdds = 0, totalDrawOdds = 0, totalAwayOdds = 0;
    let countHome = 0, countDraw = 0, countAway = 0;

    if (match.bookmakers && match.bookmakers.length > 0) {
      match.bookmakers.forEach(bookmaker => {
        const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
        if (h2hMarket && h2hMarket.outcomes) {
          h2hMarket.outcomes.forEach(outcome => {
            if (outcome.name === homeTeam) {
              totalHomeOdds += outcome.price;
              countHome++;
            } else if (outcome.name === 'Draw') {
              totalDrawOdds += outcome.price;
              countDraw++;
            } else if (outcome.name === awayTeam) {
              totalAwayOdds += outcome.price;
              countAway++;
            }
          });
        }
      });
    }

    // Calcular cuotas promedio (True Odds estimadas según el mercado global)
    const avgHomeOdd = countHome > 0 ? (totalHomeOdds / countHome).toFixed(2) : null;
    const avgDrawOdd = countDraw > 0 ? (totalDrawOdds / countDraw).toFixed(2) : null;
    const avgAwayOdd = countAway > 0 ? (totalAwayOdds / countAway).toFixed(2) : null;

    // Calcular probabilidad implicita promedio (para el criterio de kelly)
    // Probabilidad = 1 / CuotaDecimal
    const probHome = avgHomeOdd ? (1 / avgHomeOdd) : null;
    const probDraw = avgDrawOdd ? (1 / avgDrawOdd) : null;
    const probAway = avgAwayOdd ? (1 / avgAwayOdd) : null;

    // Normalizar probabilidades (para quitar el margen o overround de la casa de apuestas promedio)
    let trueProbHome = null, trueProbDraw = null, trueProbAway = null;
    if (probHome && probDraw && probAway) {
        const totalProb = probHome + probDraw + probAway;
        trueProbHome = probHome / totalProb;
        trueProbDraw = probDraw / totalProb;
        trueProbAway = probAway / totalProb;
    }

    // Solo añadir si tenemos datos de cuotas
    if (avgHomeOdd) {
      matches.push({
        id: match.id,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        date: date,
        trueProb: {
          home: trueProbHome,
          draw: trueProbDraw,
          away: trueProbAway
        },
        avgOdds: {
          home: avgHomeOdd,
          draw: avgDrawOdd,
          away: avgAwayOdd
        }
      });
    }
  }

  return matches;
}

// ==========================================
// CALCULADORAS (SE PUEDEN LLAMAR DESDE FRONTEND)
// ==========================================

/**
 * Calcula la fracción de Kelly.
 * @param {number} probability - Probabilidad real de que ocurra (0.0 a 1.0)
 * @param {number} decimalOdds - Cuota/Momio decimal ofrecido por Playdoit (e.g. 2.10)
 * @returns {number} Fracción del bankroll a apostar (0 a 1). Retorna 0 si no hay valor (Value Bet negativo).
 */
function calculateKelly(probability, decimalOdds) {
  // Fórmula de Kelly: f* = (p * (b + 1) - 1) / b
  // Donde b = decimalOdds - 1 (cuota neta)
  // p = probabilidad de ganar (0 a 1)

  if (!probability || !decimalOdds || decimalOdds <= 1) return 0;

  const b = decimalOdds - 1;
  const p = probability;
  const q = 1 - p;

  const f = (p * b - q) / b;

  // Si f es negativo, la apuesta no tiene valor matemático, no apostar.
  // Es común usar "Kelly Fraccional" (ej. 1/2 o 1/4) para ser conservador y manejar la varianza.
  // Aquí usamos "Half Kelly" (1/2 Kelly) por defecto porque tienes 200 pesos y es mejor no arriesgar mucho rápido.
  const fractionalKelly = 0.5;

  if (f > 0) {
      return f * fractionalKelly;
  }
  return 0;
}
/**
 * Procesar el formulario de Pertinencia y Factibilidad de manera segura
 * @param {Object} dataObj - El objeto JSON con todos los datos del formulario y los archivos en base64
 */
function submitFactibilidadForm(dataObj) {
  // Inicializamos el LockService para evitar colisiones de escritura (concurrencia)
  const lock = LockService.getScriptLock();

  // Intentamos obtener el bloqueo por hasta 30 segundos
  if (!lock.tryLock(30000)) {
    throw new Error("El sistema está muy ocupado procesando otras solicitudes. Por favor, intente enviar de nuevo en unos segundos.");
  }

  try {
    // 0. Validaciones de Seguridad en Backend
    const respName = String(dataObj.contacto_nombre || '').trim();
    const emailStr = String(dataObj.contacto_correo || '').trim();
    const phoneStr = String(dataObj.contacto_telefono || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      throw new Error("Validación de seguridad fallida: Correo electrónico inválido.");
    }
    if (!/^[0-9]{10}$/.test(phoneStr)) {
      throw new Error("Validación de seguridad fallida: Teléfono inválido (debe tener 10 dígitos).");
    }

    const epoName = (dataObj.id_nombre_epo || 'EPO_Desconocida').trim();

    // 1. Manejo de Archivos en Google Drive
    const parentFolderName = "Evidencias_Factibilidad";
    let parentFolder;
    const folders = DriveApp.getFoldersByName(parentFolderName);
    if (folders.hasNext()) {
      parentFolder = folders.next();
    } else {
      parentFolder = DriveApp.createFolder(parentFolderName);
    }

    // Carpeta específica para la EPO actual y la fecha/hora del envío
    const now = new Date();
    // Formatear fecha: YYYY-MM-DD HH:mm
    const dateStr = now.getFullYear() + "-" +
                    ("0" + (now.getMonth()+1)).slice(-2) + "-" +
                    ("0" + now.getDate()).slice(-2) + " " +
                    ("0" + now.getHours()).slice(-2) + ":" +
                    ("0" + now.getMinutes()).slice(-2);

    const folderName = epoName + " - " + dateStr;

    // Siempre creamos una nueva subcarpeta para cada envío para no mezclar archivos
    const epoFolder = parentFolder.createFolder(folderName);

    // Guardar archivos
    let fileUrls = [];
    if (dataObj.files && dataObj.files.length > 0) {
      dataObj.files.forEach(function(f) {
        const blob = Utilities.newBlob(Utilities.base64Decode(f.bytes), f.mimeType, f.tag + "_" + f.filename);
        const savedFile = epoFolder.createFile(blob);
        fileUrls.push(f.tag + ": " + savedFile.getUrl());
      });
    }

    // 2. Manejo de Google Sheets
    const ssName = "Registros_Factibilidad";
    let ss;
    const files = DriveApp.getFilesByName(ssName);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(ssName);
    }

    // --- Helper para aplanar arrays dinámicos ---
    function flattenDynamic(names, details, label) {
      if (!names) return "Sin datos";
      let nArr = Array.isArray(names) ? names : [names];
      let dArr = Array.isArray(details) ? details : [details];
      let res = [];
      for(let i=0; i<nArr.length; i++) {
        res.push(`${nArr[i]} (${label}: ${dArr[i] || 'N/A'})`);
      }
      return res.join(" | ");
    }

    function flattenPersonal(nombres, funciones, perfiles) {
      if (!nombres) return "Sin datos";
      let nArr = Array.isArray(nombres) ? nombres : [nombres];
      let fArr = Array.isArray(funciones) ? funciones : [funciones];
      let pArr = Array.isArray(perfiles) ? perfiles : [perfiles];
      let res = [];
      for(let i=0; i<nArr.length; i++) {
        res.push(`${nArr[i]} [Función: ${fArr[i] || 'N/A'}, Perfil: ${pArr[i] || 'N/A'}]`);
      }
      return res.join(" | ");
    }

    function flattenDocentes(nombres, funciones, perfiles, asignaturas) {
      if (!nombres) return "Sin datos";
      let nArr = Array.isArray(nombres) ? nombres : [nombres];
      let fArr = Array.isArray(funciones) ? funciones : [funciones];
      let pArr = Array.isArray(perfiles) ? perfiles : [perfiles];
      let aArr = Array.isArray(asignaturas) ? asignaturas : [asignaturas];
      let res = [];
      for(let i=0; i<nArr.length; i++) {
        res.push(`${nArr[i]} [Función: ${fArr[i] || 'N/A'}, Perfil: ${pArr[i] || 'N/A'}, Asig: ${aArr[i] || 'N/A'}]`);
      }
      return res.join(" | ");
    }

    // --- Hoja Maestra (Resumen Completo) ---
    let masterSheet = ss.getSheetByName("Registros");
    if (!masterSheet) {
      masterSheet = ss.insertSheet("Registros");
    }

    // Construimos la fila de datos
    const rowData = [
      new Date(),
      respName, emailStr, phoneStr,
      dataObj.id_subsistema, epoName, dataObj.id_modalidad, dataObj.id_opcion, dataObj.id_region, dataObj.id_municipio, dataObj.id_zona, dataObj.id_turno, (Array.isArray(dataObj.id_cct) ? dataObj.id_cct.join(", ") : dataObj.id_cct),
      dataObj.loc_domicilio, (Array.isArray(dataObj.sector_estrategico) ? dataObj.sector_estrategico.join(", ") : dataObj.sector_estrategico || "No especificado"), dataObj.voc_productivo, dataObj.voc_servicios, dataObj.voc_agropecuario, dataObj.voc_industrias, dataObj.voc_fuentes, dataObj.diag_problematicas, dataObj.diag_prog_media, dataObj.diag_prog_sup, dataObj.mat_actual_estudiantes, dataObj.mat_actual_grupos, flattenDynamic(dataObj.municipios_procedencia, dataObj.municipios_cantidad, "Estudiantes").replace(/ \| /g, "\n"),
      "Ver detalle en hoja ind.", "Ver detalle en hoja ind.",
      `${dataObj.aulas_pob}/${dataObj.aulas_gpos}/${dataObj.aulas_total}`,
      `${dataObj.comp_pob}/${dataObj.comp_horas_req}/${dataObj.comp_equipos}/${dataObj.comp_horas_disp}/${dataObj.comp_horas_falt}/${dataObj.comp_equipo_falt}`,
      "Ver detalle en hoja ind.",
      dataObj.desc_admin, dataObj.desc_servicios, dataObj.desc_deportivos, dataObj.desc_demas,
      flattenPersonal(dataObj.pers_nombre, dataObj.pers_funcion, dataObj.pers_perfil),
      flattenDocentes(dataObj.doc_nombre, dataObj.doc_funcion, dataObj.doc_perfil, dataObj.doc_asignatura),
      flattenDocentes(dataObj.docExt_nombre, dataObj.docExt_funcion, dataObj.docExt_perfil, dataObj.docExt_asignatura),
      flattenDocentes(dataObj.docAmp_nombre, dataObj.docAmp_funcion, dataObj.docAmp_perfil, dataObj.docAmp_asignatura),
      flattenDocentes(dataObj.docFOB_nombre, dataObj.docFOB_funcion, dataObj.docFOB_perfil, dataObj.docFOB_asignatura),
      dataObj.objetivos_mejora, dataObj.area_influencia,
      dataObj.campo_laboral, dataObj.conclusion_epo,
      fileUrls.join(" | ")
    ];

    // Primero agregamos la fila de datos. appendRow() automáticamente expande el número
    // de columnas en la hoja si no hay suficientes, previniendo el error "Out of bounds".
    masterSheet.appendRow(rowData);

    // Ahora que la hoja tiene aseguradas las columnas necesarias, forzamos la reescritura
    // de los encabezados en la fila 1 para actualizar hojas creadas en versiones anteriores.
    const headers = [[
      "Fecha Envío", "Nombre Responsable", "Correo Responsable", "Teléfono Responsable",
      "Servicio Educativo", "Nombre EPO", "Modalidad", "Opción Educativa", "Región", "Municipio", "Zona", "Turnos", "CCT",
      "Domicilio", "Sector Estratégico", "Vocaciones: Productivo", "Vocaciones: Servicios", "Vocaciones: Agropecuario", "Vocaciones: Industrias/Clústeres", "Fuentes de Empleo", "Diag: Problemáticas", "Diag: Prog Media Sup", "Diag: Prog Sup", "Tot. Estudiantes", "Tot. Grupos", "Municipios Procedencia",
      "Histórico Matrícula (23-26)", "Proyección Matrícula (27-30)",
      "Espacio de Aprendizaje: Pob/Gpos/Total",
      "Aula Cómputo (Pob/Req/Eq.Funcionales/Disp/Falt/EqFalt)", "Fondo Bibliográfico",
      "Desc. Admin", "Desc. Servicios", "Desc. Deportivos", "Desc. Demás",
      "Plantilla Personal", "Docentes Fundamental", "Docentes Extendido", "Docentes Ampliado", "Docentes FOB TIC", "Objetivos Mejora", "Área Influencia",
      "Campo Laboral", "Conclusión EPO", "Evidencias URL"
    ]];
    masterSheet.getRange(1, 1, 1, headers[0].length).setValues(headers)
      .setBackground("#56212F").setFontColor("#FFFFFF").setFontWeight("bold");

    // --- Hoja Dinámica Específica para la EPO ---
    // Si ya existe una hoja con ese nombre, le agregamos un timestamp
    let sheetName = epoName.substring(0, 31); // Limite de 31 caracteres en Sheets
    if (ss.getSheetByName(sheetName)) {
      sheetName = epoName.substring(0, 26) + "_" + new Date().getTime().toString().slice(-4);
    }
    const epoSheet = ss.insertSheet(sheetName);

    // Paleta Institucional
    const colorVinoOscuro = "#56212F";
    const colorVinoClaro = "#9F2241";
    const colorBeige = "#DDC8A4";
    const colorBlanco = "#FFFFFF";

    let currentRow = 1;

    function addSectionTitle(title) {
      epoSheet.getRange(currentRow, 1, 1, 4).merge().setValue(title)
        .setBackground(colorVinoOscuro).setFontColor(colorBlanco)
        .setFontWeight("bold").setHorizontalAlignment("center");
      currentRow++;
    }

    function addRowData(label, value) {
      epoSheet.getRange(currentRow, 1).setValue(label).setBackground(colorBeige).setFontWeight("bold");
      epoSheet.getRange(currentRow, 2, 1, 3).merge().setValue(value || "");
      currentRow++;
    }

    // Datos del Responsable
    addSectionTitle("Datos del Responsable de la Información");
    addRowData("Nombre completo", respName);
    addRowData("Correo electrónico oficial", emailStr);
    addRowData("Teléfono de contacto", phoneStr);
    currentRow++;

    // A. Datos Generales
    addSectionTitle("I. Datos de identificación de la EPO");
    addRowData("Servicio Educativo", dataObj.id_subsistema);
    addRowData("Nombre de la EPO", epoName);
    addRowData("Modalidad Educativa", dataObj.id_modalidad);
    addRowData("Opción Educativa", dataObj.id_opcion);
    addRowData("Región", dataObj.id_region);
    addRowData("Municipio", dataObj.id_municipio);
    addRowData("Zona Escolar", dataObj.id_zona);
    addRowData("Turno (s)", dataObj.id_turno);
    addRowData("CCT", Array.isArray(dataObj.id_cct) ? dataObj.id_cct.join(", ") : dataObj.id_cct);
    currentRow++;

    // B. Localización
    addSectionTitle("I. Localización");
    addRowData("Domicilio", dataObj.loc_domicilio);
    currentRow++;

    // Sector
    addSectionTitle("II. Sector Estratégico");
    addRowData("Sector seleccionado", (Array.isArray(dataObj.sector_estrategico) ? dataObj.sector_estrategico.join(", ") : dataObj.sector_estrategico || "No especificado"));
    currentRow++;

    // Vocaciones
    addSectionTitle("III. Vocaciones productivas regionales");
    addRowData("Sector productivo", dataObj.voc_productivo);
    addRowData("Sector de servicios", dataObj.voc_servicios);
    addRowData("Sector agropecuario", dataObj.voc_agropecuario);
    addRowData("Industrias clave y clústeres", dataObj.voc_industrias);
    addRowData("Fuentes de empleo", dataObj.voc_fuentes);
    currentRow++;



    // Diagnóstico
    addSectionTitle("IV. Diagnóstico de la región de influencia");
    addRowData("Principales problemáticas", dataObj.diag_problematicas);
    addRowData("Programas afines (Media Superior)", dataObj.diag_prog_media);
    addRowData("Programas afines (Superior)", dataObj.diag_prog_sup);
    currentRow++;

    // Matrícula actual
    addSectionTitle("V. Oferta y demanda educativa de Bachillerato General por plantel.");
    epoSheet.getRange(currentRow, 1, 1, 2).merge().setValue("Matrícula total (2026-2027).").setBackground(colorBeige).setFontWeight("bold").setHorizontalAlignment("center");
    currentRow++;
    epoSheet.getRange(currentRow, 1).setValue("Indicador").setBackground(colorVinoClaro).setFontColor(colorBlanco);
    epoSheet.getRange(currentRow, 2).setValue("Total general").setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1).setValue("Total estudiantes"); epoSheet.getRange(currentRow, 2).setValue(dataObj.mat_actual_estudiantes); currentRow++;
    epoSheet.getRange(currentRow, 1).setValue("Total grupos"); epoSheet.getRange(currentRow, 2).setValue(dataObj.mat_actual_grupos); currentRow++;
    currentRow++;
    addSectionTitle("Área de influencia y cobertura del servicio educativo");
    addRowData("Municipios", flattenDynamic(dataObj.municipios_procedencia, dataObj.municipios_cantidad, "Estudiantes").replace(/ \| /g, "\n"));
    currentRow++;


    // Histórico de matrícula
    addSectionTitle("Histórico de matrícula por grupos y por turno");
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["Ciclo", "Hombres", "Mujeres", "Grupos", "Turno"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["2023-2024", dataObj.h_2324_h, dataObj.h_2324_m, dataObj.h_2324_g, dataObj.h_2324_t]]); currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["2024-2025", dataObj.h_2425_h, dataObj.h_2425_m, dataObj.h_2425_g, dataObj.h_2425_t]]); currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["2025-2026", dataObj.h_2526_h, dataObj.h_2526_m, dataObj.h_2526_g, dataObj.h_2526_t]]); currentRow++;
    currentRow++;

    // Egresados
    addSectionTitle("Egresados por ciclo escolar");
    epoSheet.getRange(currentRow, 1, 1, 3).setValues([["2023-2024", "2024-2025", "2025-2026"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 3).setValues([[dataObj.h_2324_e, dataObj.h_2425_e, dataObj.h_2526_e]]); currentRow++;
    currentRow++;

    // Proyección de matrícula
    addSectionTitle("Proyección de matrícula por grupos y por turnos");
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["Ciclo", "Hombres", "Mujeres", "Grupos", "Turno"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["2027-2028", dataObj.p_2627_h, dataObj.p_2627_m, dataObj.p_2627_g, dataObj.p_2627_t]]); currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["2028-2029", dataObj.p_2728_h, dataObj.p_2728_m, dataObj.p_2728_g, dataObj.p_2728_t]]); currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 5).setValues([["2029-2030", dataObj.p_2829_h, dataObj.p_2829_m, dataObj.p_2829_g, dataObj.p_2829_t]]); currentRow++;
    currentRow++;


    // Instalaciones - Aulas
    addSectionTitle("VI. Instalaciones - Espacio de Aprendizaje");
    let aulasHeaders = ["Población", "Total grupos", "Total aulas"];
    epoSheet.getRange(currentRow, 1, 1, 3).setValues([aulasHeaders]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 3).setValues([[
      dataObj.aulas_pob, dataObj.aulas_gpos, dataObj.aulas_total
    ]]);
    currentRow += 2;


    // Dinámico: Personal
    addSectionTitle("VII. Personal");
    epoSheet.getRange(currentRow, 1, 1, 3).setValues([["Nombre", "Función", "Perfil"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.pers_nombre && dataObj.pers_nombre.length > 0) {
      let nombres = Array.isArray(dataObj.pers_nombre) ? dataObj.pers_nombre : [dataObj.pers_nombre];
      let func = Array.isArray(dataObj.pers_funcion) ? dataObj.pers_funcion : [dataObj.pers_funcion];
      let perfil = Array.isArray(dataObj.pers_perfil) ? dataObj.pers_perfil : [dataObj.pers_perfil];

      for(let i=0; i<nombres.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(nombres[i]);
        epoSheet.getRange(currentRow, 2).setValue(func[i]);
        epoSheet.getRange(currentRow, 3).setValue(perfil[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Dinámico: Docentes
    addSectionTitle("DOCENTES - Currículum Fundamental");
    epoSheet.getRange(currentRow, 1, 1, 4).setValues([["Nombre", "Función", "Perfil académico", "Asignatura que imparte"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.doc_nombre && dataObj.doc_nombre.length > 0) {
      let doc_nombres = Array.isArray(dataObj.doc_nombre) ? dataObj.doc_nombre : [dataObj.doc_nombre];
      let doc_func = Array.isArray(dataObj.doc_funcion) ? dataObj.doc_funcion : [dataObj.doc_funcion];
      let doc_perfil = Array.isArray(dataObj.doc_perfil) ? dataObj.doc_perfil : [dataObj.doc_perfil];
      let doc_asig = Array.isArray(dataObj.doc_asignatura) ? dataObj.doc_asignatura : [dataObj.doc_asignatura];

      for(let i=0; i<doc_nombres.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(doc_nombres[i]);
        epoSheet.getRange(currentRow, 2).setValue(doc_func[i]);
        epoSheet.getRange(currentRow, 3).setValue(doc_perfil[i]);
        epoSheet.getRange(currentRow, 4).setValue(doc_asig[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Dinámico: Docentes Extendido
    addSectionTitle("DOCENTES - Currículum Fundamental Extendido");
    epoSheet.getRange(currentRow, 1, 1, 4).setValues([["Nombre", "Función", "Perfil académico", "Asignatura que imparte"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.docExt_nombre && dataObj.docExt_nombre.length > 0) {
      let doc_nombres = Array.isArray(dataObj.docExt_nombre) ? dataObj.docExt_nombre : [dataObj.docExt_nombre];
      let doc_func = Array.isArray(dataObj.docExt_funcion) ? dataObj.docExt_funcion : [dataObj.docExt_funcion];
      let doc_perfil = Array.isArray(dataObj.docExt_perfil) ? dataObj.docExt_perfil : [dataObj.docExt_perfil];
      let doc_asig = Array.isArray(dataObj.docExt_asignatura) ? dataObj.docExt_asignatura : [dataObj.docExt_asignatura];

      for(let i=0; i<doc_nombres.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(doc_nombres[i]);
        epoSheet.getRange(currentRow, 2).setValue(doc_func[i]);
        epoSheet.getRange(currentRow, 3).setValue(doc_perfil[i]);
        epoSheet.getRange(currentRow, 4).setValue(doc_asig[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Dinámico: Docentes Ampliado
    addSectionTitle("DOCENTES - Currículum Ampliado");
    epoSheet.getRange(currentRow, 1, 1, 4).setValues([["Nombre", "Función", "Perfil académico", "Asignatura que imparte"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.docAmp_nombre && dataObj.docAmp_nombre.length > 0) {
      let doc_nombres = Array.isArray(dataObj.docAmp_nombre) ? dataObj.docAmp_nombre : [dataObj.docAmp_nombre];
      let doc_func = Array.isArray(dataObj.docAmp_funcion) ? dataObj.docAmp_funcion : [dataObj.docAmp_funcion];
      let doc_perfil = Array.isArray(dataObj.docAmp_perfil) ? dataObj.docAmp_perfil : [dataObj.docAmp_perfil];
      let doc_asig = Array.isArray(dataObj.docAmp_asignatura) ? dataObj.docAmp_asignatura : [dataObj.docAmp_asignatura];

      for(let i=0; i<doc_nombres.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(doc_nombres[i]);
        epoSheet.getRange(currentRow, 2).setValue(doc_func[i]);
        epoSheet.getRange(currentRow, 3).setValue(doc_perfil[i]);
        epoSheet.getRange(currentRow, 4).setValue(doc_asig[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Dinámico: Docentes FOB
    addSectionTitle("DOCENTES - Formación Ocupacional Básica TIC");
    epoSheet.getRange(currentRow, 1, 1, 4).setValues([["Nombre", "Función", "Perfil académico", "Asignatura que imparte"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.docFOB_nombre && dataObj.docFOB_nombre.length > 0) {
      let doc_nombres = Array.isArray(dataObj.docFOB_nombre) ? dataObj.docFOB_nombre : [dataObj.docFOB_nombre];
      let doc_func = Array.isArray(dataObj.docFOB_funcion) ? dataObj.docFOB_funcion : [dataObj.docFOB_funcion];
      let doc_perfil = Array.isArray(dataObj.docFOB_perfil) ? dataObj.docFOB_perfil : [dataObj.docFOB_perfil];
      let doc_asig = Array.isArray(dataObj.docFOB_asignatura) ? dataObj.docFOB_asignatura : [dataObj.docFOB_asignatura];

      for(let i=0; i<doc_nombres.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(doc_nombres[i]);
        epoSheet.getRange(currentRow, 2).setValue(doc_func[i]);
        epoSheet.getRange(currentRow, 3).setValue(doc_perfil[i]);
        epoSheet.getRange(currentRow, 4).setValue(doc_asig[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Descripciones varias
    addSectionTitle("Textos y Conclusiones");
    addRowData("Objetivos", dataObj.objetivos_mejora);
    addRowData("Área Influencia", dataObj.area_influencia);
    addRowData("Campo Laboral", dataObj.campo_laboral);
    addRowData("Conclusión EPO", dataObj.conclusion_epo);
    currentRow++;

    // Enlaces a archivos
    addSectionTitle("Evidencias Adjuntas");
    if (fileUrls.length > 0) {
      for(let i=0; i<fileUrls.length; i++) {
        epoSheet.getRange(currentRow, 1, 1, 4).merge().setValue(fileUrls[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("No se adjuntaron archivos.");
    }

    // Formato final de las columnas para evitar expansión excesiva
    epoSheet.setColumnWidth(1, 300);
    epoSheet.setColumnWidth(2, 200);
    epoSheet.setColumnWidth(3, 200);
    epoSheet.setColumnWidth(4, 200);

    // Activar ajuste de texto (Wrap Text) y alineación superior para toda la hoja
    epoSheet.getDataRange().setWrap(true).setVerticalAlignment("top");

    return { success: true, message: "Guardado correctamente en Drive y Sheets." };
  } catch (error) {
    Logger.log("Error en submitFactibilidadForm: " + error.toString());
    throw new Error("Error interno al guardar: " + error.message);
  } finally {
    // Siempre liberar el bloqueo cuando se termine, exitoso o no
    lock.releaseLock();
  }
}
