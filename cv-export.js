/* cv-export.js — Export/Print modal */
'use strict';

const CVExport = (() => {

  const TREE = [
    { id:'section-top',              label:'Header & Biographical Information', subs:[] },
    { id:'section-education',        label:'1. Education', subs:[
      { id:'sub-education-degrees',        label:'Degrees' },
      { id:'sub-education-postgrad',       label:'Postgraduate Training' },
      { id:'sub-education-qualifications', label:'Qualifications & Licenses' },
    ]},
    { id:'section-employment',       label:'2. Employment', subs:[
      { id:'sub-employment-current',  label:'Current Appointments' },
      { id:'sub-employment-previous', label:'Previous Appointments' },
    ]},
    { id:'section-honours',          label:'3. Honours & Awards', subs:[
      { id:'sub-honours-distinctions',             label:'Distinctions – Received' },
      { id:'sub-honours-distinguished_nominated',  label:'Distinctions – Nominated' },
      { id:'sub-honours-teaching_awards',          label:'Teaching Awards – Received' },
      { id:'sub-honours-teaching_nominated',       label:'Teaching Awards – Nominated' },
      { id:'sub-honours-student_awards',           label:'Student/Trainee Awards' },
    ]},
    { id:'section-affiliations',     label:'4. Professional Affiliations', subs:[
      { id:'sub-affiliations-associations',        label:'Professional Associations' },
      { id:'sub-affiliations-admin_local',         label:'Administrative – Local' },
      { id:'sub-affiliations-admin_national',      label:'Administrative – National' },
      { id:'sub-affiliations-admin_international', label:'Administrative – International' },
      { id:'sub-affiliations-peer_review',         label:'Peer Review Activities' },
      { id:'sub-affiliations-research_projects',   label:'Research Projects' },
    ]},
    { id:'section-academic_profile', label:'C. Academic Profile', subs:[
      { id:'sub-academic_profile-research_statement',  label:'C1. Research Statement' },
      { id:'sub-academic_profile-teaching_philosophy', label:'C2. Teaching Philosophy' },
      { id:'sub-academic_profile-cpa_statement',       label:'C3. CPA Statement' },
    ]},
    { id:'section-funding',          label:'D. Research Funding', subs:[
      { id:'sub-funding-peer_reviewed_grants', label:'Peer-Reviewed Grants' },
      { id:'sub-funding-salary_support',       label:'Salary Support' },
    ]},
    { id:'section-publications',     label:'E. Publications', subs:[
      { id:'sub-publications-most_significant', label:'Most Significant Publications' },
      { id:'sub-publications-peer_reviewed',    label:'Peer-Reviewed Journal Articles' },
      { id:'sub-publications-case_reports',     label:'Case Reports' },
      { id:'sub-publications-abstracts',        label:'Abstracts' },
      { id:'sub-publications-book_chapters',    label:'Book Chapters' },
      { id:'sub-publications-submitted',        label:'Submitted Publications' },
    ]},
    { id:'section-patents',          label:'F. Patents & Copyrights', subs:[] },
    { id:'section-presentations',    label:'G. Presentations', subs:[
      { id:'sub-presentations-abstracts_papers',  label:'Abstracts & Papers' },
      { id:'sub-presentations-invited_lectures',  label:'Invited Lectures' },
    ]},
    { id:'section-teaching_design',  label:'H. Teaching & Design', subs:[
      { id:'sub-teaching_design-innovations', label:'Innovations in Teaching' },
    ]},
    { id:'section-supervision',      label:'I. Research Supervision', subs:[] },
  ];

  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

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

    // Parent → children
    container.querySelectorAll('.chk-sec').forEach(chk => {
      chk.addEventListener('change', () => {
        container.querySelectorAll(`.chk-sub[data-parent="${chk.dataset.id}"]`)
          .forEach(c => { c.checked = chk.checked; });
      });
    });
    // Child → update parent
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

  function applyForPrint() {
    document.querySelectorAll('.print-hidden').forEach(el => el.classList.remove('print-hidden'));
    const container = document.getElementById('exportCheckboxTree');
    container.querySelectorAll('.chk-sec').forEach(chk => {
      if (!chk.checked && !chk.indeterminate) {
        const el = document.getElementById(chk.dataset.id);
        if (el) el.classList.add('print-hidden');
      }
    });
    container.querySelectorAll('.chk-sub').forEach(chk => {
      if (!chk.checked) {
        const el = document.getElementById(chk.dataset.id);
        if (el) el.classList.add('print-hidden');
      }
    });
  }

  function restoreAfterPrint() {
    document.querySelectorAll('.print-hidden').forEach(el => el.classList.remove('print-hidden'));
  }

  function setAll(checked) {
    document.querySelectorAll('#exportCheckboxTree input[type=checkbox]').forEach(c => {
      c.checked = checked; c.indeterminate = false;
    });
  }

  function init() {
    const modal   = document.getElementById('exportModal');
    const btnOpen = document.getElementById('btnExport');
    const btnClose= document.getElementById('exportModalClose');
    const btnCancel=document.getElementById('exportCancel');
    const btnPrint= document.getElementById('exportPrint');
    const btnAll  = document.getElementById('exportSelectAll');
    const btnNone = document.getElementById('exportDeselectAll');

    btnOpen.addEventListener('click', () => {
      renderTree();
      modal.classList.add('open');
    });

    [btnClose, btnCancel].forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
    modal.addEventListener('click', e => { if (e.target===modal) modal.classList.remove('open'); });

    btnAll.addEventListener('click',  () => setAll(true));
    btnNone.addEventListener('click', () => setAll(false));

    btnPrint.addEventListener('click', () => {
      applyForPrint();
      modal.classList.remove('open');
      setTimeout(() => {
        window.print();
        setTimeout(restoreAfterPrint, 2000);
      }, 150);
    });
  }

  return { init };
})();
