/* cv-config.js — Edit this file to configure your app */

window.CV_CONFIG = {
  // ── GOOGLE DRIVE OAUTH ───────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: '383622687958-iqv3cbabbvi3jjru7fikhlph2h1nd3g9.apps.googleusercontent.com',

  // The filename that will be created/read in the root of your Google Drive
  DRIVE_FILENAME: 'cv-data.json',

  // OAuth scopes needed (Drive file access only — not full Drive)
  SCOPES: 'https://www.googleapis.com/auth/drive.file',

  // The origin your app is hosted at
  AUTHORIZED_ORIGIN: 'https://cv.michaeli.ca',

  // Must match EXACTLY what is registered in Google Cloud Console → Authorized redirect URIs
  // Make sure both https://cv.michaeli.ca and https://cv.michaeli.ca/ are in the console
  REDIRECT_URI: 'https://cv.michaeli.ca/',
};
