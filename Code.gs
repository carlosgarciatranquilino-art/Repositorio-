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
