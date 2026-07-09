/**
 * Procesar el formulario de Pertinencia y Factibilidad
 * @param {Object} dataObj - El objeto JSON con todos los datos del formulario y los archivos en base64
 */
function submitFactibilidadForm(dataObj) {
  try {
    const epoName = dataObj.id_nombre_epo || 'EPO_Desconocida';

    // 1. Manejo de Archivos en Google Drive
    const parentFolderName = "Evidencias_Factibilidad";
    let parentFolder;
    const folders = DriveApp.getFoldersByName(parentFolderName);
    if (folders.hasNext()) {
      parentFolder = folders.next();
    } else {
      parentFolder = DriveApp.createFolder(parentFolderName);
    }

    // Carpeta específica para la EPO actual
    let epoFolder;
    const epoFolders = parentFolder.getFoldersByName(epoName);
    if (epoFolders.hasNext()) {
      epoFolder = epoFolders.next();
    } else {
      epoFolder = parentFolder.createFolder(epoName);
    }

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

    // --- Hoja Maestra (Resumen) ---
    let masterSheet = ss.getSheetByName("Registros");
    if (!masterSheet) {
      masterSheet = ss.insertSheet("Registros");
      masterSheet.appendRow([
        "Fecha", "Subsistema", "Nombre EPO", "CCT", "Asignatura",
        "Total Estudiantes", "Total Aulas", "Urls Evidencias", "Conclusión"
      ]);
      masterSheet.getRange("A1:I1").setBackground("#56212F").setFontColor("#FFFFFF").setFontWeight("bold");
    }

    masterSheet.appendRow([
      new Date(),
      dataObj.id_subsistema,
      dataObj.id_nombre_epo,
      dataObj.id_cct,
      dataObj.id_asignatura,
      dataObj.mat_actual_estudiantes,
      dataObj.aulas_total,
      fileUrls.join(" | "),
      dataObj.conclusion_epo
    ]);

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

    // A. Datos Generales
    addSectionTitle("I. Datos de identificación de la EPO");
    addRowData("Subsistema", dataObj.id_subsistema);
    addRowData("Nombre de la EPO", dataObj.id_nombre_epo);
    addRowData("Modalidad Educativa", dataObj.id_modalidad);
    addRowData("Región", dataObj.id_region);
    addRowData("Zona Escolar", dataObj.id_zona);
    addRowData("Turno (s)", dataObj.id_turno);
    addRowData("CCT", dataObj.id_cct);
    addRowData("Nombre de la Asignatura", dataObj.id_asignatura);
    currentRow++;

    // B. Localización
    addSectionTitle("I. Localización");
    addRowData("Domicilio", dataObj.loc_domicilio);
    currentRow++;

    // Matrícula actual
    addSectionTitle("II. Matrícula total actual");
    epoSheet.getRange(currentRow, 1).setValue("Indicador").setBackground(colorVinoClaro).setFontColor(colorBlanco);
    epoSheet.getRange(currentRow, 2).setValue("Total general").setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1).setValue("Total estudiantes"); epoSheet.getRange(currentRow, 2).setValue(dataObj.mat_actual_estudiantes); currentRow++;
    epoSheet.getRange(currentRow, 1).setValue("Total grupos"); epoSheet.getRange(currentRow, 2).setValue(dataObj.mat_actual_grupos); currentRow++;
    epoSheet.getRange(currentRow, 1).setValue("Promedio por grupo"); epoSheet.getRange(currentRow, 2).setValue(dataObj.mat_actual_promedio); currentRow++;
    currentRow++;

    // Instalaciones - Aulas
    addSectionTitle("III. Instalaciones - Aulas");
    let aulasHeaders = ["Población", "Total grupos", "Total aulas", "Déficit (%)", "Superávit (%)", "Necesidad"];
    epoSheet.getRange(currentRow, 1, 1, 6).setValues([aulasHeaders]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    epoSheet.getRange(currentRow, 1, 1, 6).setValues([[
      dataObj.aulas_pob, dataObj.aulas_gpos, dataObj.aulas_total,
      dataObj.aulas_deficit, dataObj.aulas_superavit, dataObj.aulas_necesidad
    ]]);
    currentRow += 2;

    // Dinámico: Laboratorios
    addSectionTitle("Laboratorios");
    epoSheet.getRange(currentRow, 1, 1, 2).setValues([["Nombre", "Capacidad"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.lab_nombre && dataObj.lab_nombre.length > 0) {
      // Normalizar array si solo hay 1 elemento
      let names = Array.isArray(dataObj.lab_nombre) ? dataObj.lab_nombre : [dataObj.lab_nombre];
      let caps = Array.isArray(dataObj.lab_capacidad) ? dataObj.lab_capacidad : [dataObj.lab_capacidad];

      for(let i=0; i<names.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(names[i]);
        epoSheet.getRange(currentRow, 2).setValue(caps[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Dinámico: Espacios
    addSectionTitle("Espacios de Aprendizaje");
    epoSheet.getRange(currentRow, 1, 1, 2).setValues([["Nombre", "Capacidad"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.esp_nombre && dataObj.esp_nombre.length > 0) {
      let names = Array.isArray(dataObj.esp_nombre) ? dataObj.esp_nombre : [dataObj.esp_nombre];
      let caps = Array.isArray(dataObj.esp_capacidad) ? dataObj.esp_capacidad : [dataObj.esp_capacidad];

      for(let i=0; i<names.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(names[i]);
        epoSheet.getRange(currentRow, 2).setValue(caps[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Dinámico: Personal
    addSectionTitle("IV. Personal");
    epoSheet.getRange(currentRow, 1, 1, 4).setValues([["Nombre", "Función", "Perfil", "Asignatura"]]).setBackground(colorVinoClaro).setFontColor(colorBlanco);
    currentRow++;
    if (dataObj.pers_nombre && dataObj.pers_nombre.length > 0) {
      let nombres = Array.isArray(dataObj.pers_nombre) ? dataObj.pers_nombre : [dataObj.pers_nombre];
      let func = Array.isArray(dataObj.pers_funcion) ? dataObj.pers_funcion : [dataObj.pers_funcion];
      let perfil = Array.isArray(dataObj.pers_perfil) ? dataObj.pers_perfil : [dataObj.pers_perfil];
      let asig = Array.isArray(dataObj.pers_asignatura) ? dataObj.pers_asignatura : [dataObj.pers_asignatura];

      for(let i=0; i<nombres.length; i++) {
        epoSheet.getRange(currentRow, 1).setValue(nombres[i]);
        epoSheet.getRange(currentRow, 2).setValue(func[i]);
        epoSheet.getRange(currentRow, 3).setValue(perfil[i]);
        epoSheet.getRange(currentRow, 4).setValue(asig[i]);
        currentRow++;
      }
    } else {
      epoSheet.getRange(currentRow, 1).setValue("Sin datos");
      currentRow++;
    }
    currentRow++;

    // Descripciones varias
    addSectionTitle("Textos y Conclusiones");
    addRowData("Municipios", dataObj.municipios_procedencia);
    addRowData("Objetivos", dataObj.objetivos_mejora);
    addRowData("Área Influencia", dataObj.area_influencia);
    addRowData("Campo Laboral", dataObj.campo_laboral);
    addRowData("Conclusión EPO", dataObj.conclusion_epo);
    addRowData("Dictamen DDC", dataObj.dictamen_ddc);
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

    // Auto-ajustar columnas
    epoSheet.autoResizeColumns(1, 4);

    return { success: true, message: "Guardado correctamente en Drive y Sheets." };
  } catch (error) {
    Logger.log("Error en submitFactibilidadForm: " + error.toString());
    throw new Error("Error interno al guardar: " + error.toString());
  }
}
