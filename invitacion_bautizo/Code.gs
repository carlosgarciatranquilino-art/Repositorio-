// ==========================================
// CONFIGURACIÓN DE LA HOJA DE CÁLCULO
// ==========================================
// Sustituye 'URL_DE_TU_GOOGLE_SHEET' con la URL real de tu Google Sheet
const SPREADSHEET_URL = 'URL_DE_TU_GOOGLE_SHEET';
const SHEET_NAME = 'Invitados'; // El nombre de la pestaña dentro del Excel

// ==========================================
// FUNCIÓN PRINCIPAL DE INTERFAZ WEB
// ==========================================
function doGet(e) {
  // Capturamos el parámetro "invitado" de la URL (ej: ?invitado=fam-garcia)
  // Si no existe, lo forzamos a string vacío en lugar de null para evitar errores en HtmlService
  const idInvitado = e.parameter.invitado || "";

  // Creamos la plantilla HTML
  const template = HtmlService.createTemplateFromFile('Index');

  // Pasamos el ID del invitado al HTML para que lo pueda usar
  template.idInvitado = idInvitado;

  return template.evaluate()
      .setTitle('Bautizo de Dante Selig')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// FUNCIONES PARA INTERACTUAR CON GOOGLE SHEETS
// ==========================================

/**
 * Función auxiliar para limpiar cadenas (quita acentos, espacios y pasa a minúsculas)
 */
function limpiarCadena(str) {
  if (!str) return "";
  // Decode por si viene de la URL (ej. %20)
  let dec = decodeURIComponent(str);
  // Elimina acentos y signos diacríticos
  let normalizada = dec.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Quita todos los espacios y pasa a minúsculas
  return normalizada.replace(/\s+/g, "").toLowerCase();
}

/**
 * Busca al invitado por su código único y retorna sus datos.
 */
function obtenerDatosInvitado(idInvitado) {
  if (!idInvitado) {
    return { error: 'No se proporcionó código de invitado.' };
  }

  const idLimpio = limpiarCadena(idInvitado);

  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    // Suponemos que la fila 0 tiene los encabezados:
    // [0]Nombre_Invitado, [1]Boletos_Asignados, [2]Codigo_Unico, [3]Asistencia_Confirmada

    for (let i = 1; i < data.length; i++) {
      const nombreInvitado = data[i][0]; // Columna A
      const codigoUnico = data[i][2]; // Columna C

      // Checamos si coincide con el Código Único
      if (codigoUnico && limpiarCadena(codigoUnico.toString()) === idLimpio) {
        return {
          nombre: data[i][0],
          boletos: data[i][1],
          asistencia: data[i][3],
          fila: i + 1
        };
      }

      // Checamos si coincide con el Nombre del Invitado
      if (nombreInvitado && limpiarCadena(nombreInvitado.toString()) === idLimpio) {
        return {
          nombre: data[i][0],
          boletos: data[i][1],
          asistencia: data[i][3],
          fila: i + 1
        };
      }
    }

    return { error: 'Código de invitado no encontrado.' };
  } catch (e) {
    return { error: 'Error al conectar con la base de datos: ' + e.toString() };
  }
}

/**
 * Guarda la respuesta del invitado (Sí o No)
 */
function registrarConfirmacion(idInvitado, confirmacion, mensaje) {
  const idLimpio = limpiarCadena(idInvitado);
  try {
    const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const nombreInvitado = data[i][0];
      const codigoUnico = data[i][2];

      let matchEncontrado = false;

      if (codigoUnico && limpiarCadena(codigoUnico.toString()) === idLimpio) {
        matchEncontrado = true;
      } else if (nombreInvitado && limpiarCadena(nombreInvitado.toString()) === idLimpio) {
        matchEncontrado = true;
      }

      if (matchEncontrado) {
        const fila = i + 1;

        // Guardamos la confirmación en la columna D (índice 3, columna 4 real)
        sheet.getRange(fila, 4).setValue(confirmacion);

        // Si hay una columna extra para un mensaje o nota, la podemos guardar en la E (columna 5)
        if (mensaje) {
          sheet.getRange(fila, 5).setValue(mensaje);
        }

        return { success: true };
      }
    }

    return { success: false, error: 'Invitado no encontrado.' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
