/* cv-render.js — Renders window.CV_DATA into #cvDoc */
'use strict';

const CVRender = (() => {

  // ── UTILS ──────────────────────────────────────────────────────────────────

  const e = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const nl = s => e(s).replace(/\n/g,'<br>');

  function btn(type, title, section, sub, id) {
    const cls = type === 'edit' ? 'btn-icon btn-edit' : type === 'add' ? 'btn-icon btn-add' : 'btn-icon btn-del';
    const glyph = type === 'edit' ? '✎' : type === 'add' ? '+' : '🗑';
    return `<button class="${cls} no-print" title="${title}"
      data-action="${type}" data-section="${section}" data-sub="${sub||''}" data-id="${id||''}">${glyph}</button>`;
  }

  function actions(section, sub, itemId) {
    return `<span class="entry-actions no-print">
      ${btn('edit','Edit',section,sub,itemId)}
      ${btn('del','Delete',section,sub,itemId)}
    </span>`;
  }

  function addRow(section, sub, label) {
    return `<div class="no-print" style="margin:3pt 0 5pt">
      ${btn('add', label||'Add item', section, sub, '')}
      <span style="font-family:Arial,sans-serif;font-size:11px;color:#888;margin-left:5px">${label||'Add item'}</span>
    </div>`;
  }

  function secHeader(label, section, sub, showAdd, addLabel) {
    return `<div class="cv-sec-hdr">
      <h2>${e(label)}</h2>
      <div class="no-print">${showAdd ? btn('add', addLabel||'Add item', section, sub, '') : ''}</div>
    </div>`;
  }

  function subHeader(label, section, sub, showAdd, addLabel) {
    if (!label) return showAdd ? addRow(section, sub, addLabel) : '';
    return `<div class="cv-sub-hdr">
      <h3>${e(label)}</h3>
      <div class="no-print">${showAdd ? btn('add', addLabel||'Add item', section, sub, '') : ''}</div>
    </div>`;
  }

  // ── ENTRY TYPES ─────────────────────────────────────────────────────────────

  function entry(sec, sub, item) {
    const notes = item.notes ? `<div class="entry-notes">${nl(item.notes)}</div>` : '';
    return `<div class="cv-entry" data-id="${e(item.id)}">
      <div class="entry-year">${e(item.years||'')}</div>
      <div class="entry-body">${e(item.title||'')}${notes}</div>
      ${actions(sec, sub, item.id)}
    </div>`;
  }

  function pub(sec, sub, item) {
    const ann = item.annotation ? `<div class="pub-annotation">${nl(item.annotation)}</div>` : '';
    return `<div class="pub-entry" data-id="${e(item.id)}">
      <div class="pub-num">${e(item.number||'')}</div>
      <div class="pub-body">${e(item.citation||'')}</div>
      ${actions(sec, sub, item.id)}
    </div>${ann}`;
  }

  function pres(sec, sub, item) {
    return `<div class="pres-entry" data-id="${e(item.id)}">
      <div class="pres-date">${e(item.date||'')}</div>
      <div class="pres-body">${e(item.text||'')}</div>
      ${actions(sec, sub, item.id)}
    </div>`;
  }

  // ── PAGE CONTINUATION HEADER ──────────────────────────────────────────────

  function pageCont() {
    const m = window.CV_DATA.meta;
    return `<div class="page-cont-hdr">
      <div><span class="pch-name">${e(m.name)}</span></div>
      <div class="pch-right">
        <div>Page <span class="page-num"></span></div>
        <div>${e(m.preparedDate)}</div>
        <div class="confidential">CONFIDENTIAL DOCUMENT</div>
      </div>
    </div>`;
  }

  // ── NARRATIVE (multi-paragraph) ───────────────────────────────────────────

  function narrative(sec, sub, content) {
    const paras = (content || '').split(/\n\n+/).filter(Boolean);
    const paragHtml = paras.map(p => `<p>${e(p.trim())}</p>`).join('');
    return `<div class="cv-narrative" data-narrative-key="${sub}">${paragHtml}</div>`;
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  function render() {
    const d = window.CV_DATA;
    const s = d.sections;
    let h = '';

    // ── COVER ──────────────────────────────────────────────────────────────
    h += `<div id="section-top">
      <div class="cv-hdr">
        <h1>${e(d.meta.name)}</h1>
        <div class="cv-subtitle">${e(d.meta.title)}</div>
        <div class="cv-prepared">A. Date Curriculum Vitae is Prepared: ${e(d.meta.preparedDate)}</div>
      </div>
      <div class="bio-section" id="section-bio">
        <h2>B. Biographical Information</h2>
        <table class="bio-table">
          <tr><td>Primary Office</td><td style="white-space:pre-line">${e(d.meta.contact.office)}</td></tr>
          <tr><td>Telephone</td><td>${e(d.meta.contact.telephone)}</td></tr>
          <tr><td>Cellphone</td><td>${e(d.meta.contact.cellphone)}</td></tr>
          <tr><td>Fax</td><td>${e(d.meta.contact.fax)}</td></tr>
          <tr><td>Email</td><td>${e(d.meta.contact.email)}</td></tr>
        </table>
      </div>
    </div>`;

    // ── 1. EDUCATION ──────────────────────────────────────────────────────
    const edu = s.education;
    h += `<div class="cv-sec" id="section-education">
      ${secHeader(edu.label,'education','',false)}`;

    ['degrees','postgrad','qualifications'].forEach(k => {
      const sub = edu.subsections[k];
      h += `<div class="cv-sub" id="sub-education-${k}">
        ${subHeader(sub.label,'education',k,true,'Add entry')}`;
      sub.items.forEach(i => { h += entry('education',k,i); });
      h += `</div>`;
    });
    h += `</div>`;

    // ── 2. EMPLOYMENT ─────────────────────────────────────────────────────
    h += `${pageCont()}<div class="cv-sec" id="section-employment">
      ${secHeader(s.employment.label,'employment','',false)}`;
    const empC = s.employment.subsections.current;
    h += `<div class="cv-sub" id="sub-employment-current">
      ${subHeader(empC.label,'employment','current',true,'Add appointment')}`;
    empC.items.forEach(i => { h += entry('employment','current',i); });
    h += `</div>`;
    const empP = s.employment.subsections.previous;
    h += `<div class="cv-sub" id="sub-employment-previous">
      ${subHeader(empP.label,'employment','previous',true,'Add appointment')}
      <div class="sub-heading">${e(empP.subheading)}</div>`;
    empP.items.forEach(i => { h += entry('employment','previous',i); });
    h += `</div></div>`;

    // ── 3. HONOURS ────────────────────────────────────────────────────────
    const hon = s.honours;
    h += `<div class="cv-sec" id="section-honours">
      ${secHeader(hon.label,'honours','',false)}`;

    const dist = hon.subsections.distinctions;
    h += `<div class="cv-sub" id="sub-honours-distinctions">
      ${subHeader(dist.label,'honours','distinctions',true,'Add award')}
      <div class="sub-heading">${e(dist.subheading)}</div>`;
    dist.items.forEach(i => { h += entry('honours','distinctions',i); });
    h += `</div>`;

    const distN = hon.subsections.distinguished_nominated;
    h += `<div class="cv-sub" id="sub-honours-distinguished_nominated">
      <div class="sub-heading">Nominated</div>
      ${addRow('honours','distinguished_nominated','Add nominated award')}`;
    distN.items.forEach(i => { h += entry('honours','distinguished_nominated',i); });
    h += `</div>`;

    const taw = hon.subsections.teaching_awards;
    h += `<div class="cv-sub" id="sub-honours-teaching_awards">
      ${subHeader(taw.label,'honours','teaching_awards',true,'Add award')}
      <div class="sub-heading">${e(taw.subheading)}</div>`;
    taw.items.forEach(i => { h += entry('honours','teaching_awards',i); });
    h += `</div>`;

    const tawN = hon.subsections.teaching_nominated;
    h += `<div class="cv-sub" id="sub-honours-teaching_nominated">
      <div class="sub-heading">Nominated</div>
      ${addRow('honours','teaching_nominated','Add nominated teaching award')}`;
    tawN.items.forEach(i => { h += entry('honours','teaching_nominated',i); });
    h += `</div>`;

    const staw = hon.subsections.student_awards;
    h += `<div class="cv-sub" id="sub-honours-student_awards">
      ${subHeader(staw.label,'honours','student_awards',true,'Add student award')}
      <div class="sub-heading">${e(staw.subheading)}</div>`;
    staw.items.forEach(i => { h += entry('honours','student_awards',i); });
    h += `</div></div>`;

    // ── 4. AFFILIATIONS ───────────────────────────────────────────────────
    h += `${pageCont()}<div class="cv-sec" id="section-affiliations">
      ${secHeader(s.affiliations.label,'affiliations','',false)}`;

    const assoc = s.affiliations.subsections.associations;
    h += `<div class="cv-sub" id="sub-affiliations-associations">
      ${subHeader(assoc.label,'affiliations','associations',true,'Add association')}`;
    assoc.items.forEach(i => { h += entry('affiliations','associations',i); });
    h += `</div>`;

    // Admin subsections with subgroups
    [
      { key:'admin_local', heading:'Local' },
      { key:'admin_national', heading:'National' },
      { key:'admin_international', heading:'International' },
    ].forEach(({ key, heading }) => {
      const sub = s.affiliations.subsections[key];
      h += `<div class="cv-sub" id="sub-affiliations-${key}">
        ${sub.label ? subHeader(sub.label,'affiliations',key,false,'') : ''}
        <div class="sub-heading">${heading}</div>`;
      sub.subgroups.forEach(sg => {
        h += `<div class="group-label">${e(sg.groupLabel)}</div>`;
        sg.items.forEach(i => { h += entry('affiliations',key,i); });
      });
      h += `</div>`;
    });

    const pr = s.affiliations.subsections.peer_review;
    h += `<div class="cv-sub" id="sub-affiliations-peer_review">
      ${subHeader(pr.label,'affiliations','peer_review',true,'Add review')}
      <div class="sub-heading">${e(pr.subheading)}</div>`;
    pr.items.forEach(i => { h += entry('affiliations','peer_review',i); });
    h += `</div>`;

    const rp = s.affiliations.subsections.research_projects;
    h += `<div class="cv-sub" id="sub-affiliations-research_projects">
      ${subHeader(rp.label,'affiliations','research_projects',true,'Add project')}
      <div class="sub-heading">${e(rp.subheading)}</div>`;
    rp.items.forEach(i => { h += entry('affiliations','research_projects',i); });
    h += `</div></div>`;

    // ── C. ACADEMIC PROFILE ───────────────────────────────────────────────
    const ap = s.academic_profile;
    h += `${pageCont()}<div class="cv-sec" id="section-academic_profile">
      ${secHeader(ap.label,'academic_profile','',false)}`;
    ['research_statement','teaching_philosophy','cpa_statement'].forEach(k => {
      const sub = ap.subsections[k];
      h += `<div class="cv-sub" id="sub-academic_profile-${k}">
        <div class="cv-sub-hdr">
          <h3>${e(sub.label)}</h3>
          <div class="no-print">${btn('edit','Edit statement','academic_profile',k,'content')}</div>
        </div>
        ${narrative('academic_profile',k,sub.content)}
      </div>`;
    });
    h += `</div>`;

    // ── D. FUNDING ────────────────────────────────────────────────────────
    const fund = s.funding;
    h += `${pageCont()}<div class="cv-sec" id="section-funding">
      ${secHeader(fund.label,'funding','',false)}`;
    const gr = fund.subsections.peer_reviewed_grants;
    h += `<div class="cv-sub" id="sub-funding-peer_reviewed_grants">
      ${subHeader(gr.label,'funding','peer_reviewed_grants',true,'Add grant')}
      <div class="sub-heading">${e(gr.subheading)}</div>`;
    gr.items.forEach(i => { h += entry('funding','peer_reviewed_grants',i); });
    h += `</div>`;
    const sal = fund.subsections.salary_support;
    h += `<div class="cv-sub" id="sub-funding-salary_support">
      ${subHeader(sal.label,'funding','salary_support',true,'Add funding')}`;
    sal.items.forEach(i => { h += entry('funding','salary_support',i); });
    h += `</div></div>`;

    // ── E. PUBLICATIONS ───────────────────────────────────────────────────
    const pubs = s.publications;
    h += `${pageCont()}<div class="cv-sec" id="section-publications">
      ${secHeader(pubs.label,'publications','',false)}`;

    const ms = pubs.subsections.most_significant;
    h += `<div class="cv-sub" id="sub-publications-most_significant">
      ${subHeader(ms.label,'publications','most_significant',true,'Add significant publication')}`;
    ms.items.forEach(i => { h += pub('publications','most_significant',i); });
    h += `</div>`;

    const peer = pubs.subsections.peer_reviewed;
    h += `<div class="cv-sub" id="sub-publications-peer_reviewed">
      ${subHeader(peer.label,'publications','peer_reviewed',true,'Add journal article')}
      <div class="sub-heading">${e(peer.subheading)}</div>`;
    peer.items.forEach(i => { h += pub('publications','peer_reviewed',i); });
    h += `</div>`;

    [
      { key:'case_reports',  heading:'Case Reports' },
      { key:'abstracts',     heading:'Abstracts' },
      { key:'book_chapters', heading:'Book Chapters' },
    ].forEach(({ key, heading }) => {
      const sub = pubs.subsections[key];
      h += `<div class="cv-sub" id="sub-publications-${key}">
        <div class="sub-heading">${heading}</div>
        ${addRow('publications',key,'Add ' + heading.toLowerCase().replace(/s$/,''))}`;
      sub.items.forEach(i => { h += pub('publications',key,i); });
      h += `</div>`;
    });

    const subm = pubs.subsections.submitted;
    h += `<div class="cv-sub" id="sub-publications-submitted">
      ${subHeader(subm.label,'publications','submitted',true,'Add submitted publication')}
      <div class="sub-heading">${e(subm.subheading)}</div>`;
    subm.items.forEach(i => { h += pub('publications','submitted',i); });
    h += `</div></div>`;

    // ── F. PATENTS ────────────────────────────────────────────────────────
    h += `<div class="cv-sec" id="section-patents">
      <div class="cv-sec-hdr">
        <h2>${e(s.patents.label)}</h2>
        <div class="no-print">${btn('edit','Edit','patents','','content')}</div>
      </div>
      <div class="cv-simple" id="patents-content">${e(s.patents.content)}</div>
    </div>`;

    // ── G. PRESENTATIONS ──────────────────────────────────────────────────
    h += `${pageCont()}<div class="cv-sec" id="section-presentations">
      ${secHeader(s.presentations.label,'presentations','',false)}`;

    const ap2 = s.presentations.subsections.abstracts_papers;
    h += `<div class="cv-sub" id="sub-presentations-abstracts_papers">
      ${subHeader(ap2.label,'presentations','abstracts_papers',true,'Add presentation')}`;
    ap2.items.forEach(i => { h += pres('presentations','abstracts_papers',i); });
    h += `</div>`;

    const inv = s.presentations.subsections.invited_lectures;
    h += `<div class="cv-sub" id="sub-presentations-invited_lectures">
      ${subHeader(inv.label,'presentations','invited_lectures',true,'Add lecture')}`;
    inv.items.forEach(i => { h += pres('presentations','invited_lectures',i); });
    h += `</div></div>`;

    // ── H. TEACHING ───────────────────────────────────────────────────────
    const td = s.teaching_design;
    h += `${pageCont()}<div class="cv-sec" id="section-teaching_design">
      ${secHeader(td.label,'teaching_design','',false)}`;
    const innov = td.subsections.innovations;
    h += `<div class="cv-sub" id="sub-teaching_design-innovations">
      ${subHeader(innov.label,'teaching_design','innovations',true,'Add entry')}`;
    innov.items.forEach(i => { h += entry('teaching_design','innovations',i); });
    h += `</div></div>`;

    // ── I. SUPERVISION ────────────────────────────────────────────────────
    const sup = s.supervision;
    h += `${pageCont()}<div class="cv-sec" id="section-supervision">
      ${secHeader(sup.label,'supervision','',true,'Add supervisee')}`;
    sup.items.forEach(i => { h += entry('supervision','',i); });
    h += `</div>`;

    // Inject
    const doc = document.getElementById('cvDoc');
    doc.innerHTML = h;

    buildSidenav();
  }

  // ── SIDENAV ──────────────────────────────────────────────────────────────

  function buildSidenav() {
    const items = [
      { id:'section-top',             label:'Header & Bio' },
      { id:'section-education',       label:'1. Education' },
      { id:'section-employment',      label:'2. Employment' },
      { id:'section-honours',         label:'3. Honours & Awards' },
      { id:'section-affiliations',    label:'4. Affiliations' },
      { id:'section-academic_profile',label:'C. Academic Profile' },
      { id:'section-funding',         label:'D. Research Funding' },
      { id:'section-publications',    label:'E. Publications' },
      { id:'section-patents',         label:'F. Patents' },
      { id:'section-presentations',   label:'G. Presentations' },
      { id:'section-teaching_design', label:'H. Teaching' },
      { id:'section-supervision',     label:'I. Supervision' },
    ];
    const ul = document.getElementById('sidenavList');
    if (!ul) return;
    ul.innerHTML = items.map(n =>
      `<li><a href="#${n.id}">${n.label}</a></li>`
    ).join('');

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          ul.querySelectorAll('li').forEach(li => li.classList.remove('active'));
          const a = ul.querySelector(`a[href="#${e.target.id}"]`);
          if (a) a.closest('li').classList.add('active');
        }
      });
    }, { rootMargin:'-15% 0px -65% 0px' });

    items.forEach(n => {
      const el = document.getElementById(n.id);
      if (el) obs.observe(el);
    });
  }

  return { render };
})();
