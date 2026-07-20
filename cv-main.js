/* cv-main.js */
'use strict';

window.CVMain = (() => {

  let _dirty = false;

  function setStatus(state, label) {
    const dot   = document.getElementById('authDot');
    const lbl   = document.getElementById('authLabel');
    const btnSave = document.getElementById('btnSave');
    if (dot) dot.className = 'auth-dot ' + (state || '');
    if (lbl) lbl.textContent = label || '';
    if (btnSave) btnSave.disabled = (state === 'connecting' || state === 'error' || !state);
  }

  function markDirty() {
    _dirty = true;
    const btn = document.getElementById('btnSave');
    if (btn) { btn.textContent = '💾 Save*'; btn.style.outline = '2px solid #ffc107'; }
  }

  function clearDirty() {
    _dirty = false;
    const btn = document.getElementById('btnSave');
    if (btn) { btn.textContent = '💾 Save'; btn.style.outline = ''; }
  }

  function onDriveLoaded(driveData) {
    if (driveData) {
      try {
        if (driveData.meta)     window.CV_DATA.meta     = driveData.meta;
        if (driveData.sections) window.CV_DATA.sections = driveData.sections;
      } catch(e) { console.error('Failed to apply Drive data:', e); }
    }
    CVRender.render();
    CVEdit.init();
    CVExport.init();
  }

  async function save() {
    const payload = { meta: window.CV_DATA.meta, sections: window.CV_DATA.sections };
    const ok = await CVDrive.saveFile(payload);
    if (ok) clearDirty();
  }

  window.addEventListener('beforeunload', e => {
    if (_dirty) { e.preventDefault(); e.returnValue = 'You have unsaved changes.'; }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnSave').addEventListener('click', save);
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    });
    CVDrive.init(onDriveLoaded, setStatus);
  });

  return { markDirty, clearDirty };

})();
