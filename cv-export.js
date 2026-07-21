/* cv-export.js — Export modal: builds checkbox tree, requests DOCX from Apps Script */
'use strict';

const CVExport = (() => {

  const TREE = [
    { id:'section_a',  label:'A. Date Prepared', subs:[] },
    { id:'section_b',  label:'B. Biographical Information', subs:[] },
    { id:'education',  label:'1. Education', subs:[
      { id:'education_degrees',        label:'Degrees' },
      { id:'education_postgrad',       label:'Postgraduate Training' },
      { id:'education_qualifications', label:'Qualifications & Licenses' },
    ]},
    { id:'employment', label:'2. Employment', subs:[
      { id:'employment_current',  label:'Current Appointments' },
      { id:'employment_previous', label:'Previous Appointments' },
    ]},
    { id:'honours', label:'3. Honours & Career Awards', subs:[
      { id:'honours_distinctions', label:'Distinctions & Research Awards' },
      { id:'honours_teaching',     label:'Teaching Awards' },
      { id:'honours_student',      label:'Student/Trainee Awards' },
    ]},
    { id:'affiliations', label:'4. Professional Affiliations', subs:[
      { id:'affiliations_associations', label:'Professional Associations' },
      { id:'affiliations_admin',        label:'Administrative Activities' },
      { id:'affiliations_peer_review',  label:'Peer Review Activities' },
      { id:'affiliations_research',     label:'Research Projects' },
    ]},
    { id:'academic_profile', label:'C. Academic Profile', subs:[
      { id:'academic_research_statement',  label:'C1. Research Statement' },
      { id:'academic_teaching_philosophy', label:'C2. Teaching Philosophy' },
      { id:'academic_cpa',                 label:'C3. CPA Statement' },
    ]},
    { id:'funding', label:'D. Research Funding', subs:[
      { id:'funding_grants', label:'Peer-Reviewed Grants' },
      { id:'funding_salary', label:'Salary Support & Other Funding' },
    ]},
    { id:'publications', label:'E. Publications', subs:[
      { id:'publications_significant', label:'Most Significant Publications' },
      { id:'publications_peer',        label:'Peer-Reviewed Journal Articles' },
      { id:'publications_case',        label:'Case Reports' },
      { id:'publications_abstracts',   label:'Abstracts' },
      { id:'publications_chapters',    label:'Book Chapters' },
      { id:'publications_submitted',   label:'Submitted Publications' },
    ]},
    { id:'patents', label:'F. Patents & Copyrights', subs:[] },
    { id:'presentations', label:'G. Presentations', subs:[
      { id:'presentations_abstracts', label:'Abstracts & Papers' },
      { id:'presentations_invited',   label:'Invited Lectures' },
    ]},
    { id:'teaching_design', label:'H. Teaching & Design', subs:[
      { id:'teaching_innovations', label:'Innovations in Teaching' },
    ]},
    { id:'supervision', label:'I. Research Supervision', subs:[] },
  ];

  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // ── RENDER TREE ────────────────────────────────────────────────────────────

  function renderTree() {
    const container = document.getElementById('exportCheckboxTree');
    let h = '<div class="export-tree">';
    TREE.forEach(sec => {
      h += `<div class="chk-sec-wrap">
        <label class="chk-sec-label">
          <input type="checkbox" checked class="chk-sec" data-id="${sec.id}" />
          ${esc(sec.label)}
        </label>`;
      if (sec.subs.length) {
        h += '<div class="chk-subs">';
        sec.subs.forEach(sub => {
          h += `<label class="chk-sub-label">
            <input type="checkbox" checked class="chk-sub" data-id="${sub.id}" data-parent="${sec.id}" />
            ${esc(sub.label)}
          </label>`;
        });
        h += '</div>';
      }
      h += '</div>';
    });
    h += '</div>';
    container.innerHTML = h;

    container.querySelectorAll('.chk-sec').forEach(chk => {
      chk.addEventListener('change', () => {
        container.querySelectorAll(`.chk-sub[data-parent="${chk.dataset.id}"]`)
          .forEach(c => { c.checked = chk.checked; });
      });
    });
    container.querySelectorAll('.chk-sub').forEach(chk => {
      chk.addEventListener('change', () => {
        const parent = container.querySelector(`.chk-sec[data-id="${chk.dataset.parent}"]`);
        if (!parent) return;
        const sibs = [...container.querySelectorAll(`.chk-sub[data-parent="${chk.dataset.parent}"]`)];
        parent.checked = sibs.some(c => c.checked);
        parent.indeterminate = sibs.some(c => c.checked) && !sibs.every(c => c.checked);
      });
    });
  }

  function getSelectedIds() {
    const selected = [];
    document.querySelectorAll('#exportCheckboxTree input[type=checkbox]').forEach(chk => {
      if (chk.checked && !chk.indeterminate) selected.push(chk.dataset.id);
    });
    return selected;
  }

  function setAll(checked) {
    document.querySelectorAll('#exportCheckboxTree input[type=checkbox]').forEach(c => {
      c.checked = checked; c.indeterminate = false;
    });
  }

  // ── DOWNLOAD DOCX via Netlify Function ───────────────────────────────────

  async function downloadDocx(selectedIds) {
    const btn = document.getElementById('exportDownload');
    const orig = btn.textContent;
    btn.textContent = '⏳ Building document…';
    btn.disabled = true;

    try {
      const resp = await fetch('/.netlify/functions/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: { meta: window.CV_DATA.meta, sections: window.CV_DATA.sections },
          included: selectedIds,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'HTTP ' + resp.status }));
        throw new Error(err.error || 'Export failed');
      }

      const blob = await resp.blob();
      const date = new Date().toISOString().slice(0,10);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'CV_Jennia_Michaeli_' + date + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      CVDrive.showToast('DOCX downloaded successfully', 'success');

    } catch(err) {
      console.error('Export error:', err);
      CVDrive.showToast('Export failed: ' + err.message, 'error');
    } finally {
      btn.textContent = orig;
      btn.disabled = false;
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  function init() {
    const modal     = document.getElementById('exportModal');
    const btnOpen   = document.getElementById('btnExport');
    const btnClose  = document.getElementById('exportModalClose');
    const btnCancel = document.getElementById('exportCancel');
    const btnAll    = document.getElementById('exportSelectAll');
    const btnNone   = document.getElementById('exportDeselectAll');

    btnOpen.addEventListener('click', () => { renderTree(); modal.classList.add('open'); });
    [btnClose, btnCancel].forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
    modal.addEventListener('click', ev => { if (ev.target === modal) modal.classList.remove('open'); });
    btnAll.addEventListener('click',  () => setAll(true));
    btnNone.addEventListener('click', () => setAll(false));

    document.getElementById('exportDownload').addEventListener('click', () => {
      const selected = getSelectedIds();
      if (!selected.length) { alert('Please select at least one section.'); return; }
      modal.classList.remove('open');
      downloadDocx(selected);
    });
  }

  return { init };
})();
