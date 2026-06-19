# App de Apuestas de Fútbol (Google Apps Script)

Esta aplicación web te ayuda a encontrar buenas apuestas (Value Bets) y te recomienda cuánto apostar usando el **Criterio de Kelly**, partiendo de tu capital de **200 pesos**. Está diseñada para correr dentro de Google Apps Script.

## Ligas Soportadas
- Liga MX
- Premier League (Inglaterra)
- Ligue 1 (Francia)
- La Liga (España)
- Preparada para el Mundial FIFA 2026

## Instrucciones de Instalación

### 1. Obtener una API Key Gratuita
Para obtener datos de partidos y cuotas (momios) en tiempo real, usaremos **The-Odds-API**.
1. Ve a [The-Odds-API](https://the-odds-api.com/).
2. Haz clic en "Get a free API key".
3. Ingresa tu correo electrónico y te enviarán tu API Key. Guárdala, la necesitarás en el paso 2.

### 2. Configurar Google Apps Script
1. Abre [Google Apps Script](https://script.google.com/) e inicia sesión con tu cuenta de Google.
2. Haz clic en **"Nuevo proyecto"**.
3. Cambia el nombre del proyecto en la parte superior izquierda a "App Apuestas Futbol" (o el nombre que prefieras).
4. Verás un archivo llamado `Código.gs` (o `Code.gs`). Borra lo que tiene adentro, y copia todo el texto de nuestro archivo `Code.gs` ahí.
5. Reemplaza el texto `TU_API_KEY_AQUI` en el archivo `Code.gs` con la clave que obtuviste en el Paso 1.
6. Haz clic en el ícono de `+` al lado de "Archivos" y selecciona **"HTML"**.
7. Nombra este archivo `index` (Google automáticamente le pondrá la extensión `.html`).
8. Borra el contenido por defecto del archivo `index.html` y copia ahí todo el texto de nuestro archivo `index.html`.
9. Haz clic en el ícono de guardar (el disquete).

### 3. Publicar la Aplicación
Para que puedas ver la app en tu celular o computadora:
1. En la parte superior derecha de Google Apps Script, haz clic en **"Implementar"** y luego en **"Nueva implementación"**.
2. Haz clic en el ícono del engranaje ⚙️ junto a "Seleccionar tipo" y elige **"Aplicación web"**.
3. Completa los campos:
   - **Descripción:** (Puedes dejarlo en blanco o poner "Versión 1")
   - **Ejecutar como:** "Yo"
   - **Quién tiene acceso:** "Solo yo" (o "Cualquier usuario" si quieres poder abrirlo sin iniciar sesión, pero te recomiendo "Solo yo" por seguridad de tu bankroll).
4. Haz clic en **"Implementar"**.
5. *Google puede pedirte que des permisos ("Revisar permisos"). Si sale una advertencia, haz clic en "Avanzado" y luego en "Ir a [Nombre de tu proyecto] (no seguro)".*
6. Te dará una **URL de la aplicación web**. Cópiala.
7. ¡Abre esa URL en el navegador de tu celular o computadora y listo! Tu app de apuestas está lista para usar.


---

# Dashboard Educativo Institucional (Nuevo Proyecto)

Si deseas instalar el **Dashboard Educativo Institucional** en Google Apps Script, debes crear un **NUEVO PROYECTO** separado del de las apuestas de fútbol para que no haya conflictos (ambos usan la función `doGet`).

## Instrucciones de Instalación del Dashboard

1. Abre [Google Apps Script](https://script.google.com/) e inicia sesión.
2. Haz clic en **"Nuevo proyecto"**.
3. Cambia el nombre a "Dashboard Institucional" (o el nombre que prefieras).
4. En el archivo por defecto `Código.gs` (o `Code.gs`), pega todo el contenido del archivo **`EduDashboard.gs`**.
   - **IMPORTANTE:** Cambia el valor de `SPREADSHEET_ID` en el código por el ID de tu hoja de Google Sheets.
5. Haz clic en el ícono de `+` al lado de "Archivos" y selecciona **"HTML"**.
6. **Nombra este archivo exactamente como:** `EduDashboard` (sin la extensión `.html` porque Google se la agrega).
7. Pega en ese nuevo archivo todo el contenido de **`EduDashboard.html`**.
8. Guarda el proyecto (ícono de disquete).
9. Implementa la aplicación web siguiendo los mismos pasos de la sección "3. Publicar la Aplicación" descritos arriba. En la ventana de permisos, asegúrate de autorizar el script para que pueda leer tu hoja de cálculo (`SpreadsheetApp`).
