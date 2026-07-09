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

    function flattenPersonal(nombres, funciones, perfiles, asignaturas) {
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
      dataObj.id_subsistema, epoName, dataObj.id_modalidad, dataObj.id_region, dataObj.id_zona, dataObj.id_turno, dataObj.id_cct, dataObj.id_asignatura,
      dataObj.loc_domicilio, dataObj.mat_actual_estudiantes, dataObj.mat_actual_grupos, dataObj.mat_actual_promedio,
      "Ver detalle en hoja ind.", "Ver detalle en hoja ind.", // Simplifying dense matrix tables for master sheet
      `${dataObj.aulas_pob}/${dataObj.aulas_gpos}/${dataObj.aulas_total}/${dataObj.aulas_deficit}/${dataObj.aulas_superavit}/${dataObj.aulas_necesidad}`,
      flattenDynamic(dataObj.lab_nombre, dataObj.lab_capacidad, "Cap"),
      flattenDynamic(dataObj.esp_nombre, dataObj.esp_capacidad, "Cap"),
      `${dataObj.comp_pob}/${dataObj.comp_horas_req}/${dataObj.comp_equipos}/${dataObj.comp_horas_disp}/${dataObj.comp_horas_falt}/${dataObj.comp_equipo_falt}`,
      "Ver detalle en hoja ind.",
      dataObj.desc_admin, dataObj.desc_servicios, dataObj.desc_deportivos, dataObj.desc_demas,
      flattenPersonal(dataObj.pers_nombre, dataObj.pers_funcion, dataObj.pers_perfil, dataObj.pers_asignatura),
      dataObj.municipios_procedencia, dataObj.objetivos_mejora, dataObj.area_influencia, dataObj.campo_laboral,
      dataObj.conclusion_epo, dataObj.dictamen_ddc,
      fileUrls.join(" | ")
    ];

    // Primero agregamos la fila de datos. appendRow() automáticamente expande el número
    // de columnas en la hoja si no hay suficientes, previniendo el error "Out of bounds".
    masterSheet.appendRow(rowData);

    // Ahora que la hoja tiene aseguradas las columnas necesarias, forzamos la reescritura
    // de los encabezados en la fila 1 para actualizar hojas creadas en versiones anteriores.
    const headers = [[
      "Fecha Envío", "Nombre Responsable", "Correo Responsable", "Teléfono Responsable",
      "Subsistema", "Nombre EPO", "Modalidad", "Región", "Zona", "Turnos", "CCT", "Asignatura FOB",
      "Domicilio", "Tot. Estudiantes", "Tot. Grupos", "Promedio Grupo",
      "Histórico Matrícula (23-26)", "Proyección Matrícula (26-29)",
      "Aulas: Pob/Gpos/Total/Def/Sup/Nec", "Laboratorios", "Espacios Aprendizaje",
      "Aula Cómputo (Pob/Req/Eq/Disp/Falt/EqFalt)", "Fondo Bibliográfico",
      "Desc. Admin", "Desc. Servicios", "Desc. Deportivos", "Desc. Demás",
      "Plantilla Personal", "Municipios Procedencia", "Objetivos Mejora", "Área Influencia",
      "Campo Laboral", "Conclusión EPO", "Dictamen DDC", "Evidencias URL"
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
    addRowData("Subsistema", dataObj.id_subsistema);
    addRowData("Nombre de la EPO", epoName);
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
