function doGet(e) {
  // Simple router to serve different pages based on URL parameters
  let page = e.parameter.p || 'login';

  if (page === 'dashboard') {
    let template = HtmlService.createTemplateFromFile('Dashboard');
    template.url = getScriptUrl();
    return template.evaluate()
        .setTitle('SIPAEMS - Tablero Ejecutivo')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } else if (page === 'eje3') {
    let template = HtmlService.createTemplateFromFile('Eje3');
    template.url = getScriptUrl();
    return template.evaluate()
        .setTitle('SIPAEMS - Desarrollo Profesional Docente')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Default to Login
  let template = HtmlService.createTemplateFromFile('Login');
  template.url = getScriptUrl();
  return template.evaluate()
      .setTitle('SIPAEMS - Iniciar Sesión')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}
