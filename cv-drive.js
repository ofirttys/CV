/* cv-drive.js — Apps Script backend connector
   No OAuth, no tokens, no login required.
   Just calls the deployed Apps Script URL to load/save cv-data.json.
*/
'use strict';

const CVDrive = (() => {

  let _onStatus = null;

  function setStatus(state, label) {
    if (_onStatus) _onStatus(state, label);
  }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast no-print ' + (type || '');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
  }

  // ── LOAD ──────────────────────────────────────────────────────────────────

  async function loadFile() {
    const url = window.CV_CONFIG.APPS_SCRIPT_URL;
    if (!url || url === 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
      console.warn('[CVDrive] No Apps Script URL configured — using bundled data');
      setStatus('', '');
      return null;
    }

    setStatus('connecting', 'Loading…');
    try {
      const resp = await fetch(url, { redirect: 'follow' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      // If the file was just created (empty object {}), treat as no data
      if (!data.meta && !data.sections) {
        console.log('[CVDrive] Drive file is empty — using bundled data');
        setStatus('connected', 'Connected');
        return null;
      }
      console.log('[CVDrive] Data loaded from Drive');
      setStatus('connected', 'Connected');
      return data;
    } catch(e) {
      console.error('[CVDrive] Load error:', e);
      setStatus('error', 'Load failed — using local data');
      return null;
    }
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────

  async function saveFile(data) {
    const url = window.CV_CONFIG.APPS_SCRIPT_URL;
    if (!url || url === 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
      showToast('No Apps Script URL configured', 'error');
      return false;
    }

    setStatus('connecting', 'Saving…');
    try {
      const resp = await fetch(url, {
        method:   'POST',
        redirect: 'follow',
        headers:  { 'Content-Type': 'text/plain' }, // avoid CORS preflight
        body:     JSON.stringify(data, null, 2),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      setStatus('connected', 'Saved ✓');
      showToast('Saved to Google Drive', 'success');
      return true;
    } catch(e) {
      console.error('[CVDrive] Save error:', e);
      setStatus('error', 'Save failed');
      showToast('Save failed — ' + e.message, 'error');
      return false;
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init(onLoaded, onStatus) {
    _onStatus = onStatus;
    const data = await loadFile();
    onLoaded(data);
  }

  // isConnected always true — no auth needed
  function isConnected() { return true; }

  return { init, saveFile, isConnected, showToast };

})();
