/* cv-edit.js — Section-specific edit/add/delete/reorder modals */
'use strict';

const CVEdit = (() => {

  // ── SCHEMA REGISTRY ────────────────────────────────────────────────────────
  // Each entry: array of field descriptors
  // { key, label, type: 'text'|'textarea'|'date', size: 'normal'|'tall'|'very-tall', ph }

  const SCHEMAS = {

    // Section A — date only
    section_a: [
      { key:'preparedDate', label:'Date Prepared', type:'text', ph:'e.g. May 1st, 2026' },
    ],

    // Section B — free-text type + free-text details
    section_b: [
      { key:'type',    label:'Type',    type:'text',     ph:'e.g. Primary Office, Telephone, Email…' },
      { key:'details', label:'Details', type:'textarea', ph:'Value or content for this row' },
    ],

    // Standard year + title + notes (most sections)
    standard: [
      { key:'years', label:'Year(s) / Period', type:'text',     ph:'e.g. 2021 – present' },
      { key:'title', label:'Description',      type:'text',     ph:'Full description' },
      { key:'notes', label:'Notes (optional)', type:'textarea', ph:'Additional details, supervisors, amounts…' },
    ],

    // Publications — no number (auto), citation + annotation
    publication: [
      { key:'citation',   label:'Full Citation',                    type:'textarea',           ph:'Authors. "Title." Journal. Year;Vol(Issue):Pages. doi:… PMID:… Role.' },
      { key:'annotation', label:'Significance / Annotation (optional)', type:'textarea', ph:'Brief description and impact factor…' },
    ],

    // Presentations — date + full text
    presentation: [
      { key:'date', label:'Date',      type:'text',     ph:'e.g. November 2025' },
      { key:'text', label:'Full Text', type:'textarea', ph:'Role. Title. Conference. Location. Authors.' },
    ],

    // Narrative statement (C subsections — no C prefix, just numbered)
    narrative: [
      { key:'content', label:'Statement Text', type:'textarea', size:'very-tall',
        ph:'Enter statement paragraphs…\n\nSeparate paragraphs with a blank line.' },
    ],

    // Patents/simple
    simple: [
      { key:'content', label:'Content', type:'textarea', ph:'' },
    ],

    // Supervision — broken into structured fields
    supervision: [
      { key:'years',  label:'Year(s) / Period',  type:'text', ph:'e.g. 09/2024 – present' },
      { key:'role',   label:'Role',               type:'text', ph:'e.g. Supervisor / Co-Supervisor' },
      { key:'name',   label:'Student Name',       type:'text', ph:'e.g. Dalia Karol' },
      { key:'position',label:'Current Position',  type:'text', ph:'e.g. ObGyn Resident' },
      { key:'institution',label:'Institution',    type:'text', ph:'e.g. University of Toronto' },
      { key:'project',label:'Project Title',      type:'textarea', ph:'Project or thesis title' },
      { key:'collaborators',label:'Collaborators (optional)', type:'text', ph:'e.g. Kimberly Liu' },
    ],

    // Funding — structured grant fields
    funding: [
      { key:'years', label:'Year',         type:'text', ph:'e.g. 2025' },
      { key:'role',  label:'Role',         type:'text', ph:'e.g. Principal Investigator / Co-Investigator' },
      { key:'title', label:'Grant / Award Name', type:'text', ph:'e.g. CFAS SMART Grant Award' },
      { key:'funder',label:'Funder / Organization', type:'text', ph:'e.g. Canadian Fertility & Andrology Society' },
      { key:'amount',label:'Amount',       type:'text', ph:'e.g. 10,000 CAD' },
      { key:'notes', label:'Additional Details (optional)', type:'textarea',
        ph:'Collaborators, project title, duration…' },
    ],
  };

  // ── SCHEMA LOOKUP ──────────────────────────────────────────────────────────

  function getSchema(section, sub) {
    if (section === 'meta' && sub === 'preparedDate') return 'section_a';
    if (section === 'meta' && sub === 'contact')      return 'section_b';
    if (section === 'academic_profile')               return 'narrative';
    if (section === 'patents')                        return 'simple';
    if (section === 'publications')                   return 'publication';
    if (section === 'presentations')                  return 'presentation';
    if (section === 'supervision')                    return 'supervision';
    if (section === 'funding')                        return 'funding';
    return 'standard';
  }

  // ── DATA ACCESS ────────────────────────────────────────────────────────────

  function getItem(section, sub, itemId) {
    const s = window.CV_DATA.sections;
    try {
      if (section === 'meta') {
        if (sub === 'preparedDate') return { preparedDate: window.CV_DATA.meta.preparedDate };
        if (sub === 'contact') {
          // Find the contact row by its "type" which maps to the field key
          // We'll pass itemId as the field key (telephone, cellphone, fax, email, office)
          const c = window.CV_DATA.meta.contact;
          const map = { office:'Primary Office', telephone:'Telephone', cellphone:'Cellphone', fax:'Fax', email:'Email' };
          return { type: map[itemId] || itemId, details: c[itemId] || '' };
        }
      }
      if (section === 'academic_profile') return { content: s.academic_profile.subsections[sub].content };
      if (section === 'patents')          return { content: s.patents.content };
      if (section === 'supervision') {
        const item = s.supervision.items.find(i => i.id === itemId) || null;
        if (!item) return null;
        // If already has structured fields, return as-is
        if (item.name) return item;
        // Parse old format: "Supervisor, Jane Doe, Student's Current Position: X, Student's Current Institution: Y."
        const parsed = { years: item.years || '', role: '', name: '', position: '', institution: '', project: '', collaborators: '' };
        const title = item.title || '';
        // Extract role (first word/phrase before first comma if it's Supervisor/Co-Supervisor)
        const roleMatch = title.match(/^((?:Co-)?Supervisor),\s*/i);
        if (roleMatch) {
          parsed.role = roleMatch[1];
          const rest = title.slice(roleMatch[0].length);
          // Extract name (before next comma or "Student's")
          const nameMatch = rest.match(/^([^,]+?)(?:,\s*Student|$)/);
          parsed.name = nameMatch ? nameMatch[1].trim() : rest.split(',')[0].trim();
          // Extract position
          const posMatch = title.match(/Student's Current Position:\s*([^,\.]+)/i);
          parsed.position = posMatch ? posMatch[1].trim() : '';
          // Extract institution
          const instMatch = title.match(/Student's Current Institution:\s*([^\.]+)/i);
          parsed.institution = instMatch ? instMatch[1].trim() : '';
        } else {
          parsed.name = title;
        }
        // Parse notes
        const notes = item.notes || '';
        const collabMatch = notes.match(/\nCollaborators:\s*(.+)/i);
        if (collabMatch) {
          parsed.collaborators = collabMatch[1].replace(/\.$/, '').trim();
          parsed.project = notes.slice(0, notes.indexOf('\nCollaborators:')).trim();
        } else {
          parsed.project = notes.trim();
        }
        return parsed;
      }

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
    } catch(err) { console.warn(err); }
    return null;
  }

  function putItem(section, sub, itemId, values, action) {
    const s = window.CV_DATA.sections;

    // Meta fields
    if (section === 'meta') {
      if (sub === 'preparedDate') {
        window.CV_DATA.meta.preparedDate = values.preparedDate || '';
        return;
      }
      if (sub === 'contact') {
        // Map display type back to field key
        const map = { 'Primary Office':'office','Telephone':'telephone','Cellphone':'cellphone','Fax':'fax','Email':'email' };
        const key = map[values.type] || values.type.toLowerCase().replace(/\s+/g,'');
        if (action === 'edit') {
          // Update the field that was being edited (by original itemId)
          window.CV_DATA.meta.contact[itemId] = values.details || '';
          // If type changed, we'd need to rename the key — for now just update details
        } else {
          window.CV_DATA.meta.contact[key] = values.details || '';
        }
        return;
      }
    }

    // Narratives
    if (section === 'academic_profile') { s.academic_profile.subsections[sub].content = values.content || ''; return; }
    if (section === 'patents')          { s.patents.content = values.content || ''; return; }

    // Supervision structured fields → convert back to title/notes format for storage
    if (section === 'supervision') {
      if (action === 'add') values.id = 'sup_' + Date.now();
      // Build title string matching original format
      const rolePart = values.role ? values.role + ', ' : '';
      const posPart  = values.position ? ', Student\'s Current Position: ' + values.position : '';
      const instPart = values.institution ? ', Student\'s Current Institution: ' + values.institution + '.' : '';
      values.title = rolePart + (values.name || '') + posPart + instPart;
      // Build notes string
      const collabPart = values.collaborators ? '\nCollaborators: ' + values.collaborators + '.' : '';
      values.notes = (values.project || '') + collabPart;
      if (action === 'add') {
        s.supervision.items.unshift(values);
      } else {
        const idx = s.supervision.items.findIndex(i => i.id === itemId);
        if (idx >= 0) Object.assign(s.supervision.items[idx], values);
      }
      return;
    }

    // Funding structured fields → build title/notes
    if (section === 'funding') {
      if (action === 'add') values.id = 'fund_' + Date.now();
      const roleStr  = values.role   ? values.role + '. '   : '';
      const funderPart = values.funder ? '. ' + values.funder + '.' : '';
      values.title = roleStr + (values.title || '') + funderPart;
      values.notes = (values.amount ? values.amount + '.\n' : '') + (values.notes || '');
      // Fall through to generic save below
    }

    if (action === 'add' && !values.id) values.id = section + '_' + (sub||'item') + '_' + Date.now();

    const secObj = s[section];
    if (!secObj) return;

    if (secObj.subsections?.[sub]) {
      const subObj = secObj.subsections[sub];
      if (subObj.items) {
        if (action === 'add') subObj.items.unshift(values);
        else { const idx = subObj.items.findIndex(i => i.id === itemId); if (idx >= 0) Object.assign(subObj.items[idx], values); }
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
      else { const idx = secObj.items.findIndex(i => i.id === itemId); if (idx >= 0) Object.assign(secObj.items[idx], values); }
    }
  }

  function removeItem(section, sub, itemId) {
    const s = window.CV_DATA.sections;
    const drop = arr => { const i = arr.findIndex(x => x.id === itemId); if (i >= 0) arr.splice(i,1); };
    if (section === 'supervision') { drop(s.supervision.items); return; }
    const secObj = s[section];
    if (!secObj) return;
    if (secObj.subsections?.[sub]) {
      const subObj = secObj.subsections[sub];
      if (subObj.items) { drop(subObj.items); return; }
      if (subObj.subgroups) { subObj.subgroups.forEach(sg => drop(sg.items)); return; }
    }
    if (secObj.items) drop(secObj.items);
  }

  function moveItem(section, sub, itemId, direction) {
    const s = window.CV_DATA.sections;
    const move = arr => {
      const idx = arr.findIndex(x => x.id === itemId);
      if (idx < 0) return;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
    };
    if (section === 'supervision') { move(s.supervision.items); return; }
    const secObj = s[section];
    if (!secObj) return;
    if (secObj.subsections?.[sub]) {
      const subObj = secObj.subsections[sub];
      if (subObj.items) { move(subObj.items); return; }
      if (subObj.subgroups) { subObj.subgroups.forEach(sg => move(sg.items)); return; }
    }
    if (secObj.items) move(secObj.items);
  }

  // ── FORM BUILD ─────────────────────────────────────────────────────────────

  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function buildForm(schemaType, data) {
    const schema = SCHEMAS[schemaType] || SCHEMAS.standard;
    return '<div class="edit-form">' + schema.map(f => {
      const val = esc(data?.[f.key] || '');
      const ph  = esc(f.ph || '');
      const sizeCls = f.size === 'very-tall' ? 'very-tall' : f.size === 'tall' ? 'tall' : '';
      if (f.type === 'textarea') {
        return `<div class="edit-field">
          <label for="ef_${f.key}">${f.label}</label>
          <textarea id="ef_${f.key}" name="${f.key}" class="${sizeCls}" placeholder="${ph}">${val}</textarea>
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

  // ── MODAL ──────────────────────────────────────────────────────────────────

  function closeEdit() { document.getElementById('editModal').classList.remove('open'); }

  function openEdit(action, section, sub, itemId) {
    const schemaType = getSchema(section, sub);
    const isNarrative = schemaType === 'narrative' || schemaType === 'simple' || schemaType === 'section_a';
    const data = action === 'edit' ? getItem(section, sub, itemId) : null;

    // Modal title
    const titleMap = {
      section_a: 'Edit Date',
      section_b: action === 'add' ? 'Add Contact Row' : 'Edit Contact Row',
      narrative: 'Edit Statement',
      simple: 'Edit Content',
      publication: action === 'add' ? 'Add Publication' : 'Edit Publication',
      presentation: action === 'add' ? 'Add Presentation' : 'Edit Presentation',
      supervision: action === 'add' ? 'Add Supervisee' : 'Edit Supervisee',
      funding: action === 'add' ? 'Add Grant / Funding' : 'Edit Grant / Funding',
      standard: action === 'add' ? 'Add Entry' : 'Edit Entry',
    };
    document.getElementById('editModalTitle').textContent = titleMap[schemaType] || 'Edit';

    document.getElementById('editModalBody').innerHTML = buildForm(schemaType, data);

    // Footer
    const canDelete = action === 'edit' && !isNarrative;
    const footer = document.getElementById('editModalFooter');
    footer.innerHTML = `
      ${canDelete ? '<button class="btn-danger" id="editDelete">🗑 Delete</button>' : ''}
      <div style="flex:1"></div>
      <button class="btn-secondary" id="editCancel">Cancel</button>
      <button class="btn-primary" id="editSave">Save</button>`;

    document.getElementById('editCancel').addEventListener('click', closeEdit);
    document.getElementById('editSave').addEventListener('click', () => {
      const vals = readForm(schemaType);
      putItem(section, sub, itemId, vals, action);
      closeEdit();
      CVRender.render();
      if (window.CVMain) window.CVMain.markDirty();
    });

    if (canDelete) {
      document.getElementById('editDelete').addEventListener('click', () => {
        openConfirm('Delete this entry?', 'This cannot be undone.', () => {
          removeItem(section, sub, itemId);
          closeEdit();
          CVRender.render();
          if (window.CVMain) window.CVMain.markDirty();
        });
      });
    }

    document.getElementById('editModal').classList.add('open');
    setTimeout(() => {
      const first = document.getElementById('editModalBody').querySelector('input,textarea');
      if (first) first.focus();
    }, 80);
  }

  // ── CONFIRM ────────────────────────────────────────────────────────────────

  function openConfirm(title, msg, onYes) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    const modal = document.getElementById('confirmModal');
    modal.classList.add('open');
    const yes = document.getElementById('confirmYes');
    const no  = document.getElementById('confirmNo');
    const fresh = b => { const c = b.cloneNode(true); b.replaceWith(c); return c; };
    const yBtn = fresh(yes); const nBtn = fresh(no);
    const close = () => modal.classList.remove('open');
    yBtn.addEventListener('click', () => { close(); onYes(); });
    nBtn.addEventListener('click', close);
    modal.addEventListener('click', ev => { if (ev.target===modal) close(); }, { once:true });
  }

  // ── BUTTON DELEGATION ──────────────────────────────────────────────────────

  function init() {
    const doc = document.getElementById('cvDoc');

    doc.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const { action, section, sub, id } = btn.dataset;

      if (action === 'edit') openEdit('edit', section, sub, id);
      if (action === 'add')  openEdit('add',  section, sub, null);
      if (action === 'del')  openConfirm('Delete this entry?', 'This cannot be undone.', () => {
        removeItem(section, sub, id);
        CVRender.render();
        if (window.CVMain) window.CVMain.markDirty();
      });
      if (action === 'up' || action === 'down') {
        moveItem(section, sub, id, action);
        CVRender.render();
        if (window.CVMain) window.CVMain.markDirty();
      }
    });

    document.getElementById('editModal').addEventListener('click', ev => {
      if (ev.target === document.getElementById('editModal')) closeEdit();
    });
    document.getElementById('editModalClose').addEventListener('click', closeEdit);
  }

  return { init };
})();
