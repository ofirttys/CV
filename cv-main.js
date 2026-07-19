/* cv-main.js — Bootstrap: Drive → render → wire UI */
'use strict';

// Expose a global handle so cv-edit.js can call markDirty()
window.CVMain = (() => {

  let _dirty = false;

  // ── STATUS BAR UPDATE ─────────────────────────────────────────────────────
  function setStatus(state, label) {
    const dot   = document.getElementById('authDot');
    const lbl   = document.getElementById('authLabel');
    const btnAuth = document.getElementById('btnAuth');
    const btnSave = document.getElementById('btnSave');

    if (dot)  dot.className = 'auth-dot ' + (state || '');
    if (lbl)  lbl.textContent = label || '';

    const connected = state === 'connected' || state === 'connecting';
    if (btnAuth) btnAuth.textContent = connected ? 'Disconnect' : 'Connect Google Drive';
    if (btnSave) btnSave.disabled = !connected || state === 'connecting';
  }

  // ── DIRTY FLAG (unsaved changes) ───────────────────────────────────────────
  function markDirty() {
    _dirty = true;
    const btn = document.getElementById('btnSave');
    if (btn) {
      btn.textContent = '💾 Save*';
      btn.style.outline = '2px solid #ffc107';
    }
  }

  function clearDirty() {
    _dirty = false;
    const btn = document.getElementById('btnSave');
    if (btn) {
      btn.textContent = '💾 Save';
      btn.style.outline = '';
    }
  }

  // ── DRIVE CALLBACK: data loaded ───────────────────────────────────────────
  function onDriveLoaded(driveData) {
    if (driveData) {
      // Merge Drive data into window.CV_DATA (Drive is source of truth)
      try {
        // Deep-replace sections and meta from Drive
        if (driveData.meta)     window.CV_DATA.meta     = driveData.meta;
        if (driveData.sections) window.CV_DATA.sections = driveData.sections;
      } catch (e) {
        console.error('Failed to apply Drive data:', e);
      }
    }
    CVRender.render();
    CVEdit.init();
    CVExport.init();
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  async function save() {
    if (!CVDrive.isConnected()) {
      CVDrive.showToast('Connect to Google Drive first', 'error');
      return;
    }
    // Serialize current data (strip the window.CV_DATA wrapper for JSON storage)
    const payload = {
      meta:     window.CV_DATA.meta,
      sections: window.CV_DATA.sections,
    };
    const ok = await CVDrive.saveFile(payload);
    if (ok) clearDirty();
  }

  // ── WARN ON UNLOAD ────────────────────────────────────────────────────────
  window.addEventListener('beforeunload', e => {
    if (_dirty) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Save to Google Drive before leaving?';
    }
  });

  // ── INIT ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {

    // Auth button
    document.getElementById('btnAuth').addEventListener('click', () => {
      if (CVDrive.isConnected()) {
        CVDrive.disconnect();
        setStatus('', 'Not connected');
      } else {
        CVDrive.startLogin();
      }
    });

    // Save button
    document.getElementById('btnSave').addEventListener('click', save);

    // Keyboard shortcut: Ctrl+S / Cmd+S
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    });

    // Init Drive (handles OAuth callback or reconnect)
    CVDrive.init(onDriveLoaded, setStatus);
  });

  return { markDirty, clearDirty };

})();
