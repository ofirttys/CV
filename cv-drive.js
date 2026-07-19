/* cv-drive.js
   Google Drive OAuth 2.0 PKCE flow + file read/write.
   Fully client-side — no backend server required.

   Flow:
     1. User clicks "Connect Google Drive"
     2. PKCE code_verifier generated, stored in sessionStorage
     3. Browser redirects to Google auth page
     4. Google redirects back with ?code=...
     5. We exchange code for access_token (PKCE — no client_secret needed)
     6. Token stored in localStorage
     7. Load/save cv-data.json in Drive root
*/

'use strict';

const CVDrive = (() => {

  const TOKEN_KEY   = 'cv_drive_token';
  const EXPIRY_KEY  = 'cv_drive_expiry';
  const FILE_ID_KEY = 'cv_drive_file_id';
  const VERIFIER_KEY= 'cv_pkce_verifier';

  const AUTH_ENDPOINT  = 'https://accounts.google.com/o/oauth2/v2/auth';
  const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  const FILES_API      = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD_API     = 'https://www.googleapis.com/upload/drive/v3/files';

  let _token    = null;
  let _fileId   = null;
  let _onLoaded = null;   // callback(data) when cv-data.json is loaded
  let _onStatus = null;   // callback(status, label) for UI updates

  // ── PKCE HELPERS ──────────────────────────────────────────────────────────

  function randomBase64url(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function sha256Base64url(str) {
    const enc = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // ── TOKEN MANAGEMENT ──────────────────────────────────────────────────────

  function saveToken(tokenData) {
    _token = tokenData.access_token;
    const expiry = Date.now() + (tokenData.expires_in - 60) * 1000;
    localStorage.setItem(TOKEN_KEY,  _token);
    localStorage.setItem(EXPIRY_KEY, String(expiry));
  }

  function loadSavedToken() {
    const token  = localStorage.getItem(TOKEN_KEY);
    const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
    if (token && Date.now() < expiry) {
      _token  = token;
      _fileId = localStorage.getItem(FILE_ID_KEY) || null;
      return true;
    }
    return false;
  }

  function clearToken() {
    _token = null; _fileId = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(FILE_ID_KEY);
  }

  function isConnected() { return !!_token; }

  // ── AUTH FLOW ─────────────────────────────────────────────────────────────

  async function startLogin() {
    const cfg = window.CV_CONFIG;
    if (!cfg.GOOGLE_CLIENT_ID || cfg.GOOGLE_CLIENT_ID === 'PASTE_YOUR_CLIENT_ID_HERE') {
      alert('Please open cv-config.js and paste your Google OAuth Client ID first.\n\nSee the setup guide in the README.');
      return;
    }

    const verifier  = randomBase64url(64);
    const challenge = await sha256Base64url(verifier);
    sessionStorage.setItem(VERIFIER_KEY, verifier);

    const redirectUri = window.location.origin + window.location.pathname;

    const params = new URLSearchParams({
      client_id:             cfg.GOOGLE_CLIENT_ID,
      redirect_uri:          redirectUri,
      response_type:         'code',
      scope:                 cfg.SCOPES,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      access_type:           'offline',
      prompt:                'consent',
    });

    window.location.href = AUTH_ENDPOINT + '?' + params.toString();
  }

  async function handleCallback(code) {
    const cfg       = window.CV_CONFIG;
    const verifier  = sessionStorage.getItem(VERIFIER_KEY);
    const redirectUri = window.location.origin + window.location.pathname;

    if (!verifier) {
      setStatus('error', 'Auth error — try again');
      return false;
    }

    setStatus('connecting', 'Connecting…');

    try {
      const resp = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id:     cfg.GOOGLE_CLIENT_ID,
          redirect_uri:  redirectUri,
          grant_type:    'authorization_code',
          code_verifier: verifier,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error_description || 'Token exchange failed');
      }

      const data = await resp.json();
      saveToken(data);
      sessionStorage.removeItem(VERIFIER_KEY);

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return true;

    } catch (e) {
      console.error('Auth error:', e);
      setStatus('error', 'Auth failed');
      return false;
    }
  }

  // ── DRIVE FILE OPERATIONS ─────────────────────────────────────────────────

  async function findOrCreateFile() {
    const filename = window.CV_CONFIG.DRIVE_FILENAME;

    // Search for existing file
    const searchResp = await apiFetch(
      `${FILES_API}?q=name='${filename}'+and+trashed=false&spaces=drive&fields=files(id,name)`,
    );
    const searchData = await searchResp.json();

    if (searchData.files && searchData.files.length > 0) {
      _fileId = searchData.files[0].id;
      localStorage.setItem(FILE_ID_KEY, _fileId);
      return _fileId;
    }

    // File not found — will be created on first save
    return null;
  }

  async function loadFile() {
    setStatus('connecting', 'Loading from Drive…');
    try {
      _fileId = _fileId || await findOrCreateFile();

      if (!_fileId) {
        // No file yet — use bundled default data
        setStatus('connected', 'Connected — using default data');
        return null;
      }

      const resp = await apiFetch(`${FILES_API}/${_fileId}?alt=media`);
      if (!resp.ok) throw new Error('Failed to load file: ' + resp.status);
      const data = await resp.json();
      setStatus('connected', 'Connected to Drive');
      return data;

    } catch (e) {
      console.error('Load error:', e);
      setStatus('error', 'Load failed — using local data');
      return null;
    }
  }

  async function saveFile(data) {
    if (!_token) {
      showToast('Not connected to Google Drive', 'error');
      return false;
    }

    setStatus('connecting', 'Saving…');
    try {
      const body = JSON.stringify(data, null, 2);
      const filename = window.CV_CONFIG.DRIVE_FILENAME;

      if (!_fileId) {
        // Create new file
        const meta = JSON.stringify({ name: filename, mimeType: 'application/json' });
        const form = new FormData();
        form.append('metadata', new Blob([meta], { type: 'application/json' }));
        form.append('media',    new Blob([body], { type: 'application/json' }));

        const resp = await apiFetch(
          `${UPLOAD_API}?uploadType=multipart&fields=id`,
          { method: 'POST', body: form },
        );
        const result = await resp.json();
        _fileId = result.id;
        localStorage.setItem(FILE_ID_KEY, _fileId);

      } else {
        // Update existing file
        const resp = await apiFetch(
          `${UPLOAD_API}/${_fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body,
          },
        );
        if (!resp.ok) throw new Error('Save failed: ' + resp.status);
      }

      setStatus('connected', 'Saved to Drive ✓');
      showToast('Saved to Google Drive', 'success');
      return true;

    } catch (e) {
      console.error('Save error:', e);
      setStatus('error', 'Save failed');
      showToast('Save failed — ' + e.message, 'error');
      return false;
    }
  }

  // ── API FETCH HELPER ──────────────────────────────────────────────────────

  async function apiFetch(url, options = {}) {
    const headers = {
      'Authorization': 'Bearer ' + _token,
      ...(options.headers || {}),
    };
    // Don't set Content-Type if body is FormData (browser sets multipart boundary)
    if (options.body instanceof FormData) delete headers['Content-Type'];
    return fetch(url, { ...options, headers });
  }

  // ── STATUS / TOAST HELPERS ────────────────────────────────────────────────

  function setStatus(state, label) {
    if (_onStatus) _onStatus(state, label);
  }

  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast no-print ' + (type || '');
    // Force reflow
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // ── DISCONNECT ────────────────────────────────────────────────────────────

  function disconnect() {
    clearToken();
    setStatus('', 'Not connected');
  }

  // ── INIT ─────────────────────────────────────────────────────────────────

  async function init(onLoaded, onStatus) {
    _onLoaded = onLoaded;
    _onStatus = onStatus;

    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const error  = params.get('error');

    if (error) {
      window.history.replaceState({}, '', window.location.pathname);
      setStatus('error', 'Auth cancelled');
      onLoaded(null);
      return;
    }

    if (code) {
      const ok = await handleCallback(code);
      if (ok) {
        const data = await loadFile();
        onLoaded(data);
        return;
      }
      onLoaded(null);
      return;
    }

    // Check for saved token
    if (loadSavedToken()) {
      setStatus('connecting', 'Reconnecting…');
      const data = await loadFile();
      onLoaded(data);
      return;
    }

    // Not connected
    setStatus('', 'Not connected');
    onLoaded(null);
  }

  return {
    init,
    startLogin,
    saveFile,
    disconnect,
    isConnected,
    showToast,
  };

})();
