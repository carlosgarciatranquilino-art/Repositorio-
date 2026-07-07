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
      // Configurar encabezados si es nueva
      registrosSheet.appendRow(["Marca temporal", "Nombre del capturista y CCT", "V. Región Micro", "VI. Región Macro", "VII. Escuelas"]);
    }

    // Preparar el string consolidado para las tablas
    const consolidadoMicro = consolidarTablaMicro(formData.regionMicro);
    const consolidadoEscuelas = consolidarTablaEscuelas(formData.escuelas);

    registrosSheet.appendRow([
      timestamp,
      capturista,
      consolidadoMicro,
      formData.regionMacro || "",
      consolidadoEscuelas
    ]);

    // 2. Crear una nueva hoja individual desglosada
    // Limpiar el nombre de la hoja para que sea válido
    const safeName = "Estudio - " + capturista.substring(0, 20) + " - " + timestamp.getTime().toString().slice(-4);
    const nuevaHoja = spreadsheet.insertSheet(safeName);

    // Escribir datos generales
    nuevaHoja.appendRow(["ESTUDIO DE FACTIBILIDAD"]);
    nuevaHoja.appendRow(["Fecha de captura:", timestamp]);
    nuevaHoja.appendRow(["Nombre de quien captura y CCT:", capturista]);
    nuevaHoja.appendRow(["VI. Región de influencia (macro):", formData.regionMacro || ""]);
    nuevaHoja.appendRow([""]);

    // Desglosar Tabla V
    nuevaHoja.appendRow(["V. Región o regiones de influencia micro"]);
    nuevaHoja.appendRow(["Municipio", "Entidad"]);
    if (formData.regionMicro && formData.regionMicro.length > 0) {
      formData.regionMicro.forEach(row => {
        nuevaHoja.appendRow([row.municipio || "", row.entidad || ""]);
      });
    } else {
      nuevaHoja.appendRow(["Sin datos"]);
    }
    nuevaHoja.appendRow([""]);

    // Desglosar Tabla VII
    nuevaHoja.appendRow(["VII. Escuelas atendidas"]);
    nuevaHoja.appendRow(["Entidad", "Subsistema", "Nombre de la Escuela", "CCT"]);
    if (formData.escuelas && formData.escuelas.length > 0) {
      formData.escuelas.forEach(row => {
        nuevaHoja.appendRow([row.entidad || "", row.subsistema || "", row.nombre || "", row.cct || ""]);
      });
    } else {
      nuevaHoja.appendRow(["Sin datos"]);
    }

    // Dar formato básico a la nueva hoja
    nuevaHoja.getRange("A1:D1").setFontWeight("bold").setBackground("#56212F").setFontColor("white");
    nuevaHoja.autoResizeColumns(1, 4);

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
