// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================
// Función principal para mostrar la interfaz web
function doGet() {
  return HtmlService.createHtmlOutputFromFile('FactibilidadIndex')
      .setTitle('Estudio de Factibilidad')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// PROCESAMIENTO DEL FORMULARIO
// ==========================================
/**
 * Función llamada desde el frontend para procesar los datos del formulario.
 * @param {Object} formData - Los datos del formulario.
 */
function submitForm(formData) {
  const lock = LockService.getScriptLock();
  // Wait for up to 30 seconds for other processes to finish.
  lock.waitLock(30000);

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // Obtener información base
    const timestamp = new Date();
    const capturista = formData.capturista || "Sin Nombre";

    // 1. Guardar en la hoja principal "Registros" (consolidado)
    let registrosSheet = spreadsheet.getSheetByName("Registros");
    if (!registrosSheet) {
      registrosSheet = spreadsheet.insertSheet("Registros");
    }

    // Forzar siempre los encabezados correctos en la primera fila para evitar desorden de versiones previas
    const encabezadosRegistros = [
      "Marca temporal",
      "Nombre del capturista y CCT",
      "I. Subsistema",
      "II. Programa de Estudios",
      "III. Modalidad educativa",
      "IV. Opción educativa",
      "V. Región Micro",
      "VI. Región Macro",
      "VII. Escuelas",
      "VIII. Planta Académica JSON",
      "IX. Infraestructura General JSON",
      "IX. Laboratorios JSON"
    ];
    registrosSheet.getRange(1, 1, 1, encabezadosRegistros.length)
      .setValues([encabezadosRegistros])
      .setFontWeight("bold")
      .setBackground("#56212F")
      .setFontColor("white");

    // Preparar el string consolidado para las tablas
    const consolidadoMicro = consolidarTablaMicro(formData.regionMicro);
    const consolidadoEscuelas = consolidarTablaEscuelas(formData.escuelas);
    const consolidadoPlantaAcademica = JSON.stringify(formData.plantaAcademica || []);
    const consolidadoInfraestructura = JSON.stringify(formData.infraestructura || []);
    const consolidadoLaboratorios = JSON.stringify(formData.laboratorios || []);

    registrosSheet.appendRow([
      timestamp,
      capturista,
      formData.subsistema || "",
      formData.programaEstudios || "",
      formData.modalidad || "",
      formData.opcionEducativa || "",
      consolidadoMicro,
      formData.regionMacro || "",
      consolidadoEscuelas,
      consolidadoPlantaAcademica,
      consolidadoInfraestructura,
      consolidadoLaboratorios
    ]);

    // 2. Crear una nueva hoja individual desglosada
    // Limpiar el nombre de la hoja para que sea válido
    const safeName = "Estudio - " + capturista.substring(0, 20) + " - " + timestamp.getTime().toString().slice(-4);
    const nuevaHoja = spreadsheet.insertSheet(safeName);

    // --- FORMATO DE LA HOJA INDIVIDUAL CON COLORES INSTITUCIONALES ---

    // ESTUDIO DE FACTIBILIDAD (Título principal)
    nuevaHoja.getRange(1, 1).setValue("ESTUDIO DE FACTIBILIDAD")
             .setFontWeight("bold").setFontSize(14).setBackground("#56212F").setFontColor("white")
             .setHorizontalAlignment("center");
    nuevaHoja.getRange(1, 1, 1, 4).merge();

    // Información General (Preguntas I a IV)
    let rowIdx = 3;
    const datosGenerales = [
      ["Fecha de captura:", timestamp],
      ["Nombre de quien captura y CCT:", capturista],
      ["I. Subsistema:", formData.subsistema || ""],
      ["II. Programa de Estudios:", formData.programaEstudios || ""],
      ["III. Modalidad educativa:", formData.modalidad || ""],
      ["IV. Opción educativa:", formData.opcionEducativa || ""]
    ];

    nuevaHoja.getRange(rowIdx, 1, datosGenerales.length, 2).setValues(datosGenerales);
    nuevaHoja.getRange(rowIdx, 1, datosGenerales.length, 1).setFontWeight("bold").setBackground("#f8f6f4");
    rowIdx += datosGenerales.length + 1;

    // V. Región o regiones de influencia micro (Tabla Dinámica 1)
    const datosMicro = formData.regionMicro && formData.regionMicro.length > 0
      ? formData.regionMicro.map(r => [r.municipio || "", r.entidad || ""])
      : [["Sin datos", ""]];
    drawDynamicTable(nuevaHoja, "V. Región o regiones de influencia micro", datosMicro, ["Municipio", "Entidad"], rowIdx);
    rowIdx = nuevaHoja.getLastRow() + 2;

    // VI. Región de influencia (macro)
    nuevaHoja.getRange(rowIdx, 1).setValue("VI. Región de influencia (macro):").setFontWeight("bold").setBackground("#977E5B").setFontColor("white");
    nuevaHoja.getRange(rowIdx, 2).setValue(formData.regionMacro || "");
    rowIdx += 2;

    // VII. Escuelas atendidas (Tabla Dinámica 2)
    const datosEscuelas = formData.escuelas && formData.escuelas.length > 0
      ? formData.escuelas.map(r => [r.entidad || "", r.subsistema || "", r.nombre || "", r.cct || ""])
      : [["Sin datos", "", "", ""]];
    drawDynamicTable(nuevaHoja, "VII. Escuelas atendidas", datosEscuelas, ["Entidad", "Subsistema", "Nombre de la Escuela", "CCT"], rowIdx);
    rowIdx = nuevaHoja.getLastRow() + 2;

    // VIII. Planta Académica (Tabla Compleja)
    drawPlantaAcademicaTable(nuevaHoja, formData.plantaAcademica, rowIdx);
    rowIdx = nuevaHoja.getLastRow() + 2;

    // IX. Infraestructura Física
    nuevaHoja.getRange(rowIdx, 1).setValue("IX. Infraestructura Física").setFontWeight("bold").setBackground("#977E5B").setFontColor("white");
    nuevaHoja.getRange(rowIdx, 1, 1, 6).mergeAcross();
    rowIdx++;
    nuevaHoja.getRange(rowIdx, 1).setValue("Coloque por cada CCT la Infraestructura física con la que se cuenta para atender los requerimientos de aplicación del Programa.")
             .setFontStyle("italic").setBackground("#f8f6f4");
    nuevaHoja.getRange(rowIdx, 1, 1, 6).mergeAcross();
    rowIdx++;

    // Infraestructura general (Tabla Dinámica 3)
    const datosInfra = formData.infraestructura && formData.infraestructura.length > 0
      ? formData.infraestructura.map(r => [r.cct || "", r.poblacionP || "", r.gruposG || "", r.aulasA || "", r.indice || "", r.uso || ""])
      : [["Sin datos", "", "", "", "", ""]];
    drawDynamicTable(nuevaHoja, "Infraestructura general", datosInfra, ["CCT", "Población Escolar P", "Total de grupos G", "Total de Aulas A", "Índice de balance de Atención (%)", "Uso de aulas"], rowIdx);
    rowIdx = nuevaHoja.getLastRow() + 2;

    // Laboratorios (Tabla Dinámica 4)
    const datosLabs = formData.laboratorios && formData.laboratorios.length > 0
      ? formData.laboratorios.map(r => [r.cct || "", r.nombre || "", r.capacidad || ""])
      : [["Sin datos", "", ""]];
    drawDynamicTable(nuevaHoja, "Laboratorios", datosLabs, ["CCT", "Nombre del Laboratorio o taller", "Capacidad de Estudiantes"], rowIdx);
    rowIdx = nuevaHoja.getLastRow() + 2;

    // Ajustar anchos de columnas para mejor visualización
    nuevaHoja.setColumnWidth(1, 250);
    nuevaHoja.setColumnWidth(2, 200);
    nuevaHoja.setColumnWidth(3, 200);
    nuevaHoja.setColumnWidth(4, 200);

    return { success: true, message: "Datos guardados correctamente." };

  } catch (error) {
    return { success: false, message: "Error al guardar: " + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function consolidarTablaMicro(datos) {
  if (!datos || datos.length === 0) return "Sin datos";
  return datos.map(row => `${row.municipio || 'N/A'} - ${row.entidad || 'N/A'}`).join("\n");
}

function consolidarTablaEscuelas(datos) {
  if (!datos || datos.length === 0) return "Sin datos";
  return datos.map(row => `${row.entidad || 'N/A'} | ${row.subsistema || 'N/A'} | ${row.nombre || 'N/A'} | ${row.cct || 'N/A'}`).join("\n");
}

/**
 * Helper to draw simple dynamic tables (V, VII, IX) with institutional colors
 */
function drawDynamicTable(sheet, title, dataRows, headers, startRow) {
  const numCols = headers.length;

  // Título
  sheet.getRange(startRow, 1).setValue(title).setFontWeight("bold").setBackground("#977E5B").setFontColor("white");
  sheet.getRange(startRow, 1, 1, numCols).mergeAcross();
  startRow++;

  // Encabezados
  sheet.getRange(startRow, 1, 1, numCols).setValues([headers])
       .setFontWeight("bold").setBackground("#56212F").setFontColor("white").setHorizontalAlignment("center");
  startRow++;

  // Datos
  sheet.getRange(startRow, 1, dataRows.length, numCols).setValues(dataRows).setHorizontalAlignment("center");

  // Bordes
  sheet.getRange(startRow - 2, 1, dataRows.length + 2, numCols).setBorder(true, true, true, true, true, true, "#D6D1CA", SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Helper to draw Planta Académica table (VIII) with complex headers
 */
function drawPlantaAcademicaTable(sheet, tableData, startRow) {
  // Título
  sheet.getRange(startRow, 1).setValue("VIII. Planta académica").setFontWeight("bold").setBackground("#977E5B").setFontColor("white");
  sheet.getRange(startRow, 1, 1, 8).merge();
  startRow++;

  // Encabezados Fila 1 (con rowspan y colspan simulado)
  const headerRange1 = sheet.getRange(startRow, 1, 1, 8);
  headerRange1.setBackground("#56212F").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

  sheet.getRange(startRow, 1).setValue("CCT");
  sheet.getRange(startRow, 2).setValue("Módulo");
  sheet.getRange(startRow, 3).setValue("Submódulo");
  sheet.getRange(startRow, 4).setValue("Perfil académico");
  sheet.getRange(startRow, 5).setValue("Tipo de contratación");
  sheet.getRange(startRow, 5, 1, 3).mergeAcross(); // Merge "Tipo de contratación" across 3 columns
  sheet.getRange(startRow, 8).setValue("Total");
  startRow++;

  // Encabezados Fila 2 (Sub-encabezados para Tipo de Contratación)
  const headerRange2 = sheet.getRange(startRow, 1, 1, 8);
  headerRange2.setBackground("#9F2241").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Combinar celdas hacia arriba visualmente
  sheet.getRange(startRow-1, 1, 2, 1).mergeVertically();
  sheet.getRange(startRow-1, 2, 2, 1).mergeVertically();
  sheet.getRange(startRow-1, 3, 2, 1).mergeVertically();
  sheet.getRange(startRow-1, 4, 2, 1).mergeVertically();
  sheet.getRange(startRow-1, 8, 2, 1).mergeVertically();

  sheet.getRange(startRow, 5).setValue("Tiempo completo");
  sheet.getRange(startRow, 6).setValue("Medio tiempo");
  sheet.getRange(startRow, 7).setValue("Otra situación");

  startRow++;

  // Datos
  if (!tableData || tableData.length === 0) {
    sheet.getRange(startRow, 1, 1, 8).mergeAcross().setValue("Sin datos registrados.");
    sheet.getRange(startRow - 2, 1, 3, 8).setBorder(true, true, true, true, true, true, "#D6D1CA", SpreadsheetApp.BorderStyle.SOLID);
  } else {
    const dataRows = tableData.map(item => [
      item.cct || "",
      item.modulo || "",
      item.submodulo || "",
      item.perfil || "",
      item.tiempoCompleto || 0,
      item.medioTiempo || 0,
      item.otraSituacion || 0,
      item.total || 0
    ]);
    sheet.getRange(startRow, 1, dataRows.length, 8).setValues(dataRows).setHorizontalAlignment("center");

    // Bordes
    sheet.getRange(startRow - 2, 1, dataRows.length + 2, 8).setBorder(true, true, true, true, true, true, "#D6D1CA", SpreadsheetApp.BorderStyle.SOLID);
  }
}
