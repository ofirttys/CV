/* cv-edit.js — Edit/Add/Delete modal, type-aware field schemas */
'use strict';

const CVEdit = (() => {

  // ── SCHEMAS ───────────────────────────────────────────────────────────────
  const SCHEMAS = {
    standard: [
      { key:'years', label:'Year(s) / Period', type:'text', ph:'e.g. 2021 – present' },
      { key:'title', label:'Title / Description', type:'text', ph:'Full description' },
      { key:'notes', label:'Notes (optional)', type:'textarea', ph:'Additional details, supervisors, amounts…' },
    ],
    publication: [
      { key:'number',     label:'Number', type:'text', ph:'e.g. 1.' },
      { key:'citation',   label:'Full Citation', type:'textarea', ph:'Authors. "Title." Journal. Year;Vol(Issue):Pages. doi:… PMID:… Role.' },
      { key:'annotation', label:'Significance / Annotation (optional)', type:'textarea', ph:'Brief description and impact factor…' },
    ],
    presentation: [
      { key:'date', label:'Date', type:'text', ph:'e.g. November 2025' },
      { key:'text', label:'Full Text', type:'textarea', ph:'Role. Title. Conference. Location. Authors.' },
    ],
    narrative: [
      { key:'content', label:'Statement Text', type:'textarea', size:'very-tall', ph:'Enter statement paragraphs…\n\nSeparate paragraphs with a blank line.' },
    ],
    simple: [
      { key:'content', label:'Content', type:'textarea', ph:'' },
    ],
  };

  function getSchema(section, sub) {
    if (section === 'publications')    return 'publication';
    if (section === 'presentations')   return 'presentation';
    if (section === 'academic_profile') return 'narrative';
    if (section === 'patents')         return 'simple';
    return 'standard';
  }

  // ── DATA ACCESS ───────────────────────────────────────────────────────────

  function getItem(section, sub, itemId) {
    const s = window.CV_DATA.sections;
    try {
      if (section === 'academic_profile') return { content: s.academic_profile.subsections[sub].content };
      if (section === 'patents')          return { content: s.patents.content };
      if (section === 'supervision')      return s.supervision.items.find(i => i.id === itemId) || null;
      const secObj = s[section];
      if (secObj?.subsections?.[sub]) {
        const subObj = secObj.subsections[sub];
        if (subObj.items) return subObj.items.find(i => i.id === itemId) || null;
        if (subObj.subgroups) {
          for (const sg of subObj.subgroups) {
            const found = sg.items.find(i => i.id === itemId);
            if (found) return found;
          }
        }
      }
      if (secObj?.items) return secObj.items.find(i => i.id === itemId) || null;
    } catch(e) { console.warn(e); }
    return null;
  }

  function putItem(section, sub, itemId, values, action) {
    const s = window.CV_DATA.sections;

    // Narratives / simple
    if (section === 'academic_profile') {
      s.academic_profile.subsections[sub].content = values.content || '';
      return;
    }
    if (section === 'patents') {
      s.patents.content = values.content || '';
      return;
    }

    if (action === 'add') values.id = section + '_' + (sub||'item') + '_' + Date.now();

    if (section === 'supervision') {
      if (action === 'add') s.supervision.items.unshift(values);
      else {
        const idx = s.supervision.items.findIndex(i => i.id === itemId);
        if (idx >= 0) Object.assign(s.supervision.items[idx], values);
      }
      return;
    }

    const secObj = s[section];
    if (!secObj) return;

    if (secObj.subsections?.[sub]) {
      const subObj = secObj.subsections[sub];
      if (subObj.items) {
        if (action === 'add') subObj.items.unshift(values);
        else {
          const idx = subObj.items.findIndex(i => i.id === itemId);
          if (idx >= 0) Object.assign(subObj.items[idx], values);
        }
        return;
      }
      if (subObj.subgroups) {
        if (action === 'add') { subObj.subgroups[0].items.unshift(values); return; }
        for (const sg of subObj.subgroups) {
          const idx = sg.items.findIndex(i => i.id === itemId);
          if (idx >= 0) { Object.assign(sg.items[idx], values); return; }
        }
      }
    }
    if (secObj.items) {
      if (action === 'add') secObj.items.unshift(values);
      else {
        const idx = secObj.items.findIndex(i => i.id === itemId);
        if (idx >= 0) Object.assign(secObj.items[idx], values);
      }
    }
  }

  function removeItem(section, sub, itemId) {
    const s = window.CV_DATA.sections;
    const drop = arr => { const idx = arr.findIndex(i => i.id === itemId); if (idx >= 0) arr.splice(idx,1); };

    if (section === 'supervision')  { drop(s.supervision.items); return; }
    const secObj = s[section];
    if (!secObj) return;
    if (secObj.subsections?.[sub]) {
      const subObj = secObj.subsections[sub];
      if (subObj.items) { drop(subObj.items); return; }
      if (subObj.subgroups) {
        for (const sg of subObj.subgroups) drop(sg.items);
        return;
      }
    }
    if (secObj.items) drop(secObj.items);
  }

  // ── FORM BUILD / READ ─────────────────────────────────────────────────────

  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function buildForm(schemaType, data) {
    const schema = SCHEMAS[schemaType] || SCHEMAS.standard;
    return '<div class="edit-form">' + schema.map(f => {
      const val = esc(data?.[f.key] || '');
      const ph  = esc(f.ph || '');
      if (f.type === 'textarea') {
        const cls = f.size ? `class="${f.size}"` : '';
        return `<div class="edit-field">
          <label for="ef_${f.key}">${f.label}</label>
          <textarea id="ef_${f.key}" name="${f.key}" ${cls} placeholder="${ph}">${val}</textarea>
        </div>`;
      }
      return `<div class="edit-field">
        <label for="ef_${f.key}">${f.label}</label>
        <input type="text" id="ef_${f.key}" name="${f.key}" value="${val}" placeholder="${ph}" />
      </div>`;
    }).join('') + '</div>';
  }

  function readForm(schemaType) {
    const schema = SCHEMAS[schemaType] || SCHEMAS.standard;
    const vals = {};
    schema.forEach(f => {
      const el = document.getElementById('ef_' + f.key);
      if (el) vals[f.key] = el.value;
    });
    return vals;
  }

  // ── MODAL ─────────────────────────────────────────────────────────────────

  function closeEdit() {
    document.getElementById('editModal').classList.remove('open');
  }

  function openEdit(action, section, sub, itemId) {
    const schemaType = getSchema(section, sub);
    const isNarrative = schemaType === 'narrative' || schemaType === 'simple';
    const data = action === 'edit' ? getItem(section, sub, itemId) : null;

    // Title
    const titles = { add:'Add New Entry', edit:'Edit Entry' };
    if (isNarrative) titles.edit = 'Edit Statement';
    document.getElementById('editModalTitle').textContent = titles[action];

    // Form
    document.getElementById('editModalBody').innerHTML = buildForm(schemaType, data);

    // Footer
    const footer = document.getElementById('editModalFooter');
    const canDelete = action === 'edit' && !isNarrative && itemId !== 'content';
    footer.innerHTML = `
      ${canDelete ? '<button class="btn-danger" id="editDelete">🗑 Delete</button>' : ''}
      <div style="flex:1"></div>
      <button class="btn-secondary" id="editCancel">Cancel</button>
      <button class="btn-primary" id="editSave">Save</button>`;

    // Handlers
    document.getElementById('editCancel').addEventListener('click', closeEdit);
    document.getElementById('editSave').addEventListener('click', () => {
      const vals = readForm(schemaType);
      putItem(section, sub, itemId, vals, action);
      closeEdit();
      CVRender.render();
      reattachButtons();
      // Signal unsaved changes
      if (window.CVMain) window.CVMain.markDirty();
    });

    if (canDelete) {
      document.getElementById('editDelete').addEventListener('click', () => {
        openConfirm('Delete this entry?', 'This cannot be undone.', () => {
          removeItem(section, sub, itemId);
          closeEdit();
          CVRender.render();
          reattachButtons();
          if (window.CVMain) window.CVMain.markDirty();
        });
      });
    }

    const modal = document.getElementById('editModal');
    modal.classList.add('open');
    setTimeout(() => {
      const first = document.getElementById('editModalBody').querySelector('input,textarea');
      if (first) first.focus();
    }, 80);
  }

  // ── CONFIRM ───────────────────────────────────────────────────────────────

  function openConfirm(title, msg, onYes) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    const modal = document.getElementById('confirmModal');
    modal.classList.add('open');

    const yes = document.getElementById('confirmYes');
    const no  = document.getElementById('confirmNo');
    const fresh = btn => { const c = btn.cloneNode(true); btn.replaceWith(c); return c; };
    const yesBtn = fresh(yes); const noBtn = fresh(no);

    const close = () => modal.classList.remove('open');
    yesBtn.addEventListener('click', () => { close(); onYes(); });
    noBtn.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target===modal) close(); }, { once:true });
  }

  // ── BUTTON DELEGATION ─────────────────────────────────────────────────────

  function reattachButtons() {
    const doc = document.getElementById('cvDoc');
    // Remove old listener by replacing with clone — but we use event delegation so nothing to remove
  }

  function init() {
    const doc = document.getElementById('cvDoc');

    // Delegated click on the whole CV document
    doc.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, section, sub, id } = btn.dataset;
      if (action === 'edit') openEdit('edit', section, sub, id);
      if (action === 'add')  openEdit('add',  section, sub, null);
      if (action === 'del')  {
        openConfirm('Delete this entry?','This cannot be undone.', () => {
          removeItem(section, sub, id);
          CVRender.render();
          reattachButtons();
          if (window.CVMain) window.CVMain.markDirty();
        });
      }
    });

    // Modal overlay closes on outside click
    document.getElementById('editModal').addEventListener('click', e => {
      if (e.target === document.getElementById('editModal')) closeEdit();
    });
    document.getElementById('editModalClose').addEventListener('click', closeEdit);
  }

  return { init };
})();
