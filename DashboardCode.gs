// ==========================================
// CONFIGURACIÓN PRINCIPAL
// ==========================================
// Ve a https://aistudio.google.com/app/apikey para obtener tu API Key de Gemini
const GEMINI_API_KEY = 'TU_API_KEY_DE_GEMINI_AQUI';

// Puedes poner el ID de tu Google Sheet aquí, o si creas este script
// directamente "vinculado" a tu Google Sheet (Extensiones > Apps Script),
// puedes dejarlo vacío y el script detectará la hoja automáticamente.
const SPREADSHEET_ID = '';
const SHEET_NAME = 'Respuestas de formulario 1'; // Nombre de la pestaña inferior

// ==========================================
// FUNCIÓN PRINCIPAL DE INTERFAZ WEB
// ==========================================
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
      .setTitle('Dashboard Educativo y Análisis de Encuestas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// FUNCIONES PARA OBTENER Y ANALIZAR DATOS
// ==========================================

/**
 * Obtiene los datos crudos desde Google Sheets.
 */
function getSurveyData() {
  let sheet;
  if (SPREADSHEET_ID === '') {
    try {
      // Si el script está asociado al Sheets
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME) || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    } catch (e) {
      return { error: 'No se pudo acceder a la hoja activa. Si tu script no está creado desde el Google Sheet, por favor configura el SPREADSHEET_ID.' };
    }
  } else {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    } catch (e) {
      return { error: 'No se pudo encontrar el Google Sheet. Verifica que el ID sea correcto y tengas permisos.' };
    }
  }

  if (!sheet) {
    return { error: 'No se encontró la pestaña con los datos. Verifica el nombre (SHEET_NAME).' };
  }

  const data = sheet.getDataRange().getDisplayValues(); // getDisplayValues trae como texto lo que se ve en la celda
  if (data.length < 2) {
    return { error: 'La hoja de cálculo no tiene suficientes datos (se requieren al menos encabezados y una fila de respuesta).' };
  }

  const headers = data[0];
  const rows = data.slice(1);

  return {
    headers: headers,
    rows: rows
  };
}

/**
 * Llama a la API de Google Gemini para analizar un conjunto de respuestas de una pregunta abierta.
 * Extrae: Palabras Clave, Sentimiento y Categorización.
 */
function analyzeTextWithGemini(texts, questionHeader) {
  if (GEMINI_API_KEY === 'TU_API_KEY_DE_GEMINI_AQUI' || GEMINI_API_KEY === '') {
    return { error: 'Por favor, configura tu API Key de Gemini (GEMINI_API_KEY) en el archivo DashboardCode.gs.' };
  }

  // Filtramos textos vacíos y tomamos una muestra de hasta 50 respuestas para evitar
  // usar demasiados tokens de una sola vez y mantener la llamada rápida.
  const validTexts = texts.filter(t => t && t.toString().trim() !== '');
  const sampleTexts = validTexts.slice(0, 50);

  if (sampleTexts.length === 0) {
     return { error: 'No hay respuestas de texto válidas para analizar en esta columna.' };
  }

  const joinedTexts = sampleTexts.map((t, i) => `Respuesta ${i+1}: ${t}`).join('\n');

  const prompt = `
Eres un analista de datos experto que responde única y exclusivamente en formato JSON. A continuación te presento una serie de respuestas recopiladas de un formulario.
La pregunta que respondieron es: "${questionHeader}".

Respuestas:
${joinedTexts}

Analiza estas respuestas y devuelve la información solicitada estrictamente en formato JSON válido. No incluyas backticks (\`\`\`) ni texto adicional, solo el objeto JSON puro.
Estructura del JSON esperada:
{
  "keywords": ["palabra1", "frase 2", "palabra 3", "frase 4", "palabra 5"],
  "sentiment": {
    "positivo": 40,
    "neutral": 30,
    "negativo": 30
  },
  "categories": [
    {
      "name": "Nombre Categoría",
      "description": "Breve descripción de lo que trata esta categoría."
    }
  ]
}
`;

  // Usando el modelo gemini-1.5-flash para rapidez y buen manejo de JSON
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json" // Obliga a Gemini a devolver JSON válido
    }
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);

    if (response.getResponseCode() !== 200) {
      return { error: `Error de Gemini: ${json.error?.message || response.getResponseCode()}` };
    }

    // Extraer el texto generado por Gemini
    const aiContent = json.candidates[0].content.parts[0].text;
    return { result: JSON.parse(aiContent) };

  } catch (e) {
    return { error: 'Error al procesar el análisis con Gemini. Revisa tu API Key o conexión: ' + e.toString() };
  }
}
