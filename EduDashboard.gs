// ==========================================
// CONFIGURACIÓN DEL DASHBOARD EDUCATIVO
// ==========================================

// Reemplaza este valor con el ID de tu Google Sheet
// El ID lo encuentras en la URL de tu hoja de cálculo:
// https://docs.google.com/spreadsheets/d/AQUI_ESTA_EL_ID/edit
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';

// Nombre de la pestaña u hoja específica donde están los datos
const SHEET_NAME = 'Hoja 1'; // Cámbialo si tu pestaña tiene otro nombre

/**
 * Función requerida por Google Apps Script para cargar la página web.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('EduDashboard')
      .setTitle('Dashboard Institucional - Reporte de Estudiantes')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Función llamada desde el frontend para obtener los datos de la Hoja de Cálculo.
 * @returns {string} Datos en formato JSON o mensaje de error.
 */
function getSheetData() {
  if (SPREADSHEET_ID === 'TU_SPREADSHEET_ID_AQUI' || SPREADSHEET_ID === '') {
    return JSON.stringify({
      error: 'Por favor, configura el SPREADSHEET_ID en el archivo EduDashboard.gs.'
    });
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0]; // Usa la primera hoja si SHEET_NAME no se encuentra

    // Obtener todos los datos de la hoja
    // Asume que la primera fila tiene los encabezados
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length <= 1) {
       return JSON.stringify({ error: 'La hoja de cálculo está vacía o solo contiene encabezados.' });
    }

    // Procesar los datos a una lista de objetos
    const headers = values[0].map(h => h.toString().trim());
    const data = [];

    for (let i = 1; i < values.length; i++) {
      let row = values[i];
      let rowObj = {};

      for (let j = 0; j < headers.length; j++) {
        // Guardamos el valor asociado a su encabezado (clave)
        rowObj[headers[j]] = row[j];
      }
      data.push(rowObj);
    }

    // Devolver los datos procesados en JSON para el frontend
    return JSON.stringify({
      success: true,
      headers: headers,
      data: data
    });

  } catch (e) {
    return JSON.stringify({
      error: 'Error al conectar con Google Sheets. Verifica que el ID sea correcto y que tengas permisos de lectura. Detalle: ' + e.toString()
    });
  }
}
