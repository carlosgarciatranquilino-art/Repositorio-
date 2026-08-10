/**
 * ARCHIVO: PlantillaFormularioCode.gs
 *
 * INSTRUCCIONES DE USO (PARA EL ADMINISTRADOR):
 * 1. Cree un nuevo archivo de Google Sheets.
 * 2. Vaya a Extensiones -> Apps Script.
 * 3. Cree dos archivos en el editor:
 *    - "Codigo.gs" (pegue este contenido allí).
 *    - "PlantillaFormulario.html" (pegue el contenido HTML allí).
 * 4. Haga clic en Implementar -> Nueva implementación -> Tipo: Aplicación Web.
 *    - Ejecutar como: "Yo" (importante por seguridad, oculta la hoja a los usuarios).
 *    - Quién tiene acceso: "Cualquier persona".
 */

// Nombre de la hoja de cálculo donde se guardarán los datos.
// Se creará automáticamente si no existe.
const NOMBRE_HOJA_DATOS = "Respuestas_Docentes";

/**
 * Función principal que atiende las solicitudes GET (cuando el usuario entra al link).
 * Retorna la interfaz HTML.
 */
function doGet(e) {
  // Se crea a partir del archivo PlantillaFormulario.html
  var html = HtmlService.createHtmlOutputFromFile('PlantillaFormulario')
      .setTitle('Cuestionario Docente - Evaluación')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // Permite embeber si es necesario
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  return html;
}

/**
 * Función llamada asíncronamente desde el frontend (JS)
 * para guardar los datos en Google Sheets.
 *
 * Implementa LockService para soportar alta concurrencia (ej. 40,000 docentes)
 * evitando sobreescritura de filas.
 */
function guardarRespuestas(datos) {
  // Solicita un bloqueo exclusivo a nivel de script.
  // Espera hasta 30,000 milisegundos (30 segundos) si hay muchos usuarios guardando al mismo tiempo.
  var lock = LockService.getScriptLock();

  try {
    // Intentar obtener el bloqueo
    var bloqueoExitoso = lock.tryLock(30000);

    if (!bloqueoExitoso) {
      throw new Error("El sistema está muy concurrido en este momento. Por favor, intente enviar de nuevo en unos segundos.");
    }

    // El bloqueo fue exitoso, procedemos a escribir de forma segura
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(NOMBRE_HOJA_DATOS);

    // Si la hoja no existe, crearla y poner encabezados
    if (!sheet) {
      sheet = ss.insertSheet(NOMBRE_HOJA_DATOS);
      configurarEncabezados(sheet);
    }

    // Preparar la fila de datos
    // Columnas base actualizadas según nuevos requerimientos
    var fila = [
      new Date(), // Timestamp automático
      datos.plantel || "N/A",
      datos.cct || "N/A",
      datos.zona_escolar || "N/A",
      datos.subdireccion_regional || "N/A",
      datos.experiencia || "N/A",
      datos.formacion || "N/A",
      datos.situacion || "N/A",
      datos.curriculum || "N/A",
      datos.frecuencia_virtual || "N/A"
    ];

    // Añadir las 22 preguntas (q1 a q22)
    for (var i = 1; i <= 22; i++) {
      var respuestaQ = datos["q" + i] || "";
      fila.push(respuestaQ);
    }

    // Añadir comentarios finales
    fila.push(datos.comentarios_finales || "");

    // Insertar la fila al final
    sheet.appendRow(fila);

    // Retornar éxito al frontend
    return { success: true, message: "Datos guardados correctamente." };

  } catch (error) {
    // Registrar el error en Apps Script (visibles para el dev/admin en Ejecuciones)
    console.error("Error al guardar: " + error.message);
    throw error; // Lanzar el error para que withFailureHandler lo capture en el frontend

  } finally {
    // SIEMPRE liberar el bloqueo al terminar, haya éxito o error
    lock.releaseLock();
  }
}

/**
 * Función auxiliar para configurar los encabezados la primera vez que se ejecuta
 */
function configurarEncabezados(sheet) {
  var encabezados = [
    "Marca temporal",
    "Plantel",
    "C.C.T.",
    "Zona Escolar",
    "Subdirección Regional",
    "Años de Experiencia",
    "Naturaleza Formación",
    "Situación Laboral",
    "Currículum",
    "Frec. Entornos Virtuales"
  ];

  // Agregar encabezados de preguntas
  for (var i = 1; i <= 22; i++) {
    encabezados.push("P" + i);
  }

  encabezados.push("Comentarios Finales");

  sheet.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);

  // Darle un poco de estilo al encabezado
  sheet.getRange(1, 1, 1, encabezados.length)
       .setFontWeight("bold")
       .setBackground("#D6D1CA") // Color Beige cálido de la paleta
       .setFontColor("#56212F"); // Color Vino

  // Congelar la primera fila
  sheet.setFrozenRows(1);
}
