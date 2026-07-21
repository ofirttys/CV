/* cv-render.js — Renders window.CV_DATA into #cvDoc (web view only, no page headers) */
'use strict';

const CVRender = (() => {

  const e = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const nl = s => e(s).replace(/\n/g,'<br>');

  function btn(type, title, section, sub, id) {
    const cls = { edit:'btn-icon btn-edit', add:'btn-icon btn-add', del:'btn-icon btn-del' }[type];
    const glyph = { edit:'✎', add:'+', del:'🗑' }[type];
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
    return `<div class="no-print add-row">
      ${btn('add', label||'Add item', section, sub, '')}
      <span class="add-row-label">${label||'Add item'}</span>
    </div>`;
  }

  function secHdr(label, section, showAdd, addLabel) {
    return `<div class="cv-sec-hdr">
      <h2>${e(label)}</h2>
      <div class="no-print">${showAdd ? btn('add', addLabel||'Add item', section, '', '') : ''}</div>
    </div>`;
  }

  function subHdr(label, section, sub, showAdd, addLabel) {
    return `<div class="cv-sub-hdr">
      ${label ? `<h3>${e(label)}</h3>` : '<span></span>'}
      <div class="no-print">${showAdd ? btn('add', addLabel||'Add item', section, sub, '') : ''}</div>
    </div>`;
  }

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

  function narrative(sec, sub, content) {
    const paras = (content||'').split(/\n\n+/).filter(Boolean);
    return `<div class="cv-narrative" data-narrative-key="${sub}">
      ${paras.map(p => `<p>${e(p.trim())}</p>`).join('')}
    </div>`;
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────

  function render() {
    const d = window.CV_DATA;
    const s = d.sections;
    let h = '';

    // ── A. Date prepared ──
    h += `<div class="cv-sec" id="section-section_a">
      <div class="cv-sec-hdr">
        <h2>A. Date Curriculum Vitae is Prepared: ${e(d.meta.preparedDate)}</h2>
        <div class="no-print">${btn('edit','Edit date','meta','preparedDate','preparedDate')}</div>
      </div>
    </div>`;

    // ── B. Biographical ──
    h += `<div class="cv-hdr"><h1>${e(d.meta.name)}</h1><div class="cv-subtitle">${e(d.meta.title)}</div></div>
    <div class="cv-sec" id="section-section_b">
      ${secHdr('B. Biographical Information','meta',false)}
      <table class="bio-table">
        <tr><td>Primary Office</td><td style="white-space:pre-line">${e(d.meta.contact.office)}</td></tr>
        <tr><td>Telephone</td><td>${e(d.meta.contact.telephone)}</td></tr>
        <tr><td>Cellphone</td><td>${e(d.meta.contact.cellphone)}</td></tr>
        <tr><td>Fax</td><td>${e(d.meta.contact.fax)}</td></tr>
        <tr><td>Email</td><td>${e(d.meta.contact.email)}</td></tr>
      </table>
      <div class="no-print" style="margin-top:6px">${btn('edit','Edit contact info','meta','contact','contact')}</div>
    </div>`;

    // ── 1. EDUCATION ──
    const edu = s.education;
    h += `<div class="cv-sec" id="section-education">
      ${secHdr(edu.label,'education',false)}`;
    ['degrees','postgrad','qualifications'].forEach(k => {
      const sub = edu.subsections[k];
      h += `<div class="cv-sub" id="sub-education-${k}">
        ${subHdr(sub.label,'education',k,true,'Add entry')}`;
      sub.items.forEach(i => { h += entry('education',k,i); });
      h += `</div>`;
    });
    h += `</div>`;

    // ── 2. EMPLOYMENT ──
    h += `<div class="cv-sec" id="section-employment">
      ${secHdr(s.employment.label,'employment',false)}`;
    const empC = s.employment.subsections.current;
    h += `<div class="cv-sub" id="sub-employment-current">
      ${subHdr(empC.label,'employment','current',true,'Add appointment')}`;
    empC.items.forEach(i => { h += entry('employment','current',i); });
    h += `</div>`;
    const empP = s.employment.subsections.previous;
    h += `<div class="cv-sub" id="sub-employment-previous">
      ${subHdr(empP.label,'employment','previous',true,'Add appointment')}
      <div class="sub-heading">${e(empP.subheading)}</div>`;
    empP.items.forEach(i => { h += entry('employment','previous',i); });
    h += `</div></div>`;

    // ── 3. HONOURS ──
    const hon = s.honours;
    h += `<div class="cv-sec" id="section-honours">
      ${secHdr(hon.label,'honours',false)}`;
    const dist = hon.subsections.distinctions;
    h += `<div class="cv-sub" id="sub-honours-distinctions">
      ${subHdr(dist.label,'honours','distinctions',true,'Add award')}
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
      ${subHdr(taw.label,'honours','teaching_awards',true,'Add award')}
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
      ${subHdr(staw.label,'honours','student_awards',true,'Add student award')}
      <div class="sub-heading">${e(staw.subheading)}</div>`;
    staw.items.forEach(i => { h += entry('honours','student_awards',i); });
    h += `</div></div>`;

    // ── 4. AFFILIATIONS ──
    h += `<div class="cv-sec" id="section-affiliations">
      ${secHdr(s.affiliations.label,'affiliations',false)}`;
    const assoc = s.affiliations.subsections.associations;
    h += `<div class="cv-sub" id="sub-affiliations-associations">
      ${subHdr(assoc.label,'affiliations','associations',true,'Add association')}`;
    assoc.items.forEach(i => { h += entry('affiliations','associations',i); });
    h += `</div>`;
    [
      { key:'admin_local', heading:'Local' },
      { key:'admin_national', heading:'National' },
      { key:'admin_international', heading:'International' },
    ].forEach(({ key, heading }) => {
      const sub = s.affiliations.subsections[key];
      h += `<div class="cv-sub" id="sub-affiliations-${key}">
        <div class="sub-heading">${heading}</div>`;
      sub.subgroups.forEach(sg => {
        h += `<div class="group-label">${e(sg.groupLabel)}</div>`;
        sg.items.forEach(i => { h += entry('affiliations',key,i); });
      });
      h += `</div>`;
    });
    const pr = s.affiliations.subsections.peer_review;
    h += `<div class="cv-sub" id="sub-affiliations-peer_review">
      ${subHdr(pr.label,'affiliations','peer_review',true,'Add review')}
      <div class="sub-heading">${e(pr.subheading)}</div>`;
    pr.items.forEach(i => { h += entry('affiliations','peer_review',i); });
    h += `</div>`;
    const rp = s.affiliations.subsections.research_projects;
    h += `<div class="cv-sub" id="sub-affiliations-research_projects">
      ${subHdr(rp.label,'affiliations','research_projects',true,'Add project')}
      <div class="sub-heading">${e(rp.subheading)}</div>`;
    rp.items.forEach(i => { h += entry('affiliations','research_projects',i); });
    h += `</div></div>`;

    // ── C. ACADEMIC PROFILE ──
    const ap = s.academic_profile;
    h += `<div class="cv-sec" id="section-academic_profile">
      ${secHdr(ap.label,'academic_profile',false)}`;
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

    // ── D. FUNDING ──
    const fund = s.funding;
    h += `<div class="cv-sec" id="section-funding">
      ${secHdr(fund.label,'funding',false)}`;
    const gr = fund.subsections.peer_reviewed_grants;
    h += `<div class="cv-sub" id="sub-funding-peer_reviewed_grants">
      ${subHdr(gr.label,'funding','peer_reviewed_grants',true,'Add grant')}
      <div class="sub-heading">${e(gr.subheading)}</div>`;
    gr.items.forEach(i => { h += entry('funding','peer_reviewed_grants',i); });
    h += `</div>`;
    const sal = fund.subsections.salary_support;
    h += `<div class="cv-sub" id="sub-funding-salary_support">
      ${subHdr(sal.label,'funding','salary_support',true,'Add funding')}`;
    sal.items.forEach(i => { h += entry('funding','salary_support',i); });
    h += `</div></div>`;

    // ── E. PUBLICATIONS ──
    const pubs = s.publications;
    h += `<div class="cv-sec" id="section-publications">
      ${secHdr(pubs.label,'publications',false)}`;
    const ms = pubs.subsections.most_significant;
    h += `<div class="cv-sub" id="sub-publications-most_significant">
      ${subHdr(ms.label,'publications','most_significant',true,'Add significant publication')}`;
    ms.items.forEach(i => { h += pub('publications','most_significant',i); });
    h += `</div>`;
    const peer = pubs.subsections.peer_reviewed;
    h += `<div class="cv-sub" id="sub-publications-peer_reviewed">
      ${subHdr(peer.label,'publications','peer_reviewed',true,'Add journal article')}
      <div class="sub-heading">${e(peer.subheading)}</div>`;
    peer.items.forEach(i => { h += pub('publications','peer_reviewed',i); });
    h += `</div>`;
    [
      { key:'case_reports',  heading:'Case Reports' },
      { key:'abstracts',     heading:'Abstracts' },
      { key:'book_chapters', heading:'Book Chapters' },
    ].forEach(({ key, heading }) => {
      h += `<div class="cv-sub" id="sub-publications-${key}">
        <div class="sub-heading">${heading}</div>
        ${addRow('publications',key,'Add ' + heading.toLowerCase().replace(/s$/,''))}`;
      pubs.subsections[key].items.forEach(i => { h += pub('publications',key,i); });
      h += `</div>`;
    });
    const subm = pubs.subsections.submitted;
    h += `<div class="cv-sub" id="sub-publications-submitted">
      ${subHdr(subm.label,'publications','submitted',true,'Add submitted publication')}
      <div class="sub-heading">${e(subm.subheading)}</div>`;
    subm.items.forEach(i => { h += pub('publications','submitted',i); });
    h += `</div></div>`;

    // ── F. PATENTS ──
    h += `<div class="cv-sec" id="section-patents">
      <div class="cv-sec-hdr">
        <h2>${e(s.patents.label)}</h2>
        <div class="no-print">${btn('edit','Edit','patents','','content')}</div>
      </div>
      <div class="cv-simple">${e(s.patents.content)}</div>
    </div>`;

    // ── G. PRESENTATIONS ──
    h += `<div class="cv-sec" id="section-presentations">
      ${secHdr(s.presentations.label,'presentations',false)}`;
    const ap2 = s.presentations.subsections.abstracts_papers;
    h += `<div class="cv-sub" id="sub-presentations-abstracts_papers">
      ${subHdr(ap2.label,'presentations','abstracts_papers',true,'Add presentation')}`;
    ap2.items.forEach(i => { h += pres('presentations','abstracts_papers',i); });
    h += `</div>`;
    const inv = s.presentations.subsections.invited_lectures;
    h += `<div class="cv-sub" id="sub-presentations-invited_lectures">
      ${subHdr(inv.label,'presentations','invited_lectures',true,'Add lecture')}`;
    inv.items.forEach(i => { h += pres('presentations','invited_lectures',i); });
    h += `</div></div>`;

    // ── H. TEACHING ──
    const td = s.teaching_design;
    h += `<div class="cv-sec" id="section-teaching_design">
      ${secHdr(td.label,'teaching_design',false)}`;
    const innov = td.subsections.innovations;
    h += `<div class="cv-sub" id="sub-teaching_design-innovations">
      ${subHdr(innov.label,'teaching_design','innovations',true,'Add entry')}`;
    innov.items.forEach(i => { h += entry('teaching_design','innovations',i); });
    h += `</div></div>`;

    // ── I. SUPERVISION ──
    const sup = s.supervision;
    h += `<div class="cv-sec" id="section-supervision">
      ${secHdr(sup.label,'supervision','',true,'Add supervisee')}`;
    sup.items.forEach(i => { h += entry('supervision','',i); });
    h += `</div>`;

    document.getElementById('cvDoc').innerHTML = h;
    buildSidenav();
  }

  // ── SIDENAV (with subsections) ────────────────────────────────────────────

  function buildSidenav() {
    const NAV = [
      { id:'section-section_a',        label:'A. Date Prepared', subs:[] },
      { id:'section-section_b',        label:'B. Biographical Info', subs:[] },
      { id:'section-education',        label:'1. Education', subs:[
        { id:'sub-education-degrees',        label:'Degrees' },
        { id:'sub-education-postgrad',       label:'Postgraduate Training' },
        { id:'sub-education-qualifications', label:'Qualifications' },
      ]},
      { id:'section-employment',       label:'2. Employment', subs:[
        { id:'sub-employment-current',  label:'Current Appointments' },
        { id:'sub-employment-previous', label:'Previous Appointments' },
      ]},
      { id:'section-honours',          label:'3. Honours & Awards', subs:[
        { id:'sub-honours-distinctions',            label:'Distinctions' },
        { id:'sub-honours-teaching_awards',         label:'Teaching Awards' },
        { id:'sub-honours-student_awards',          label:'Student Awards' },
      ]},
      { id:'section-affiliations',     label:'4. Affiliations', subs:[
        { id:'sub-affiliations-associations',       label:'Associations' },
        { id:'sub-affiliations-admin_local',        label:'Admin – Local' },
        { id:'sub-affiliations-admin_national',     label:'Admin – National' },
        { id:'sub-affiliations-admin_international',label:'Admin – Intl' },
        { id:'sub-affiliations-peer_review',        label:'Peer Review' },
        { id:'sub-affiliations-research_projects',  label:'Research Projects' },
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
        { id:'sub-publications-most_significant', label:'Most Significant' },
        { id:'sub-publications-peer_reviewed',    label:'Journal Articles' },
        { id:'sub-publications-case_reports',     label:'Case Reports' },
        { id:'sub-publications-abstracts',        label:'Abstracts' },
        { id:'sub-publications-book_chapters',    label:'Book Chapters' },
        { id:'sub-publications-submitted',        label:'Submitted' },
      ]},
      { id:'section-patents',          label:'F. Patents', subs:[] },
      { id:'section-presentations',    label:'G. Presentations', subs:[
        { id:'sub-presentations-abstracts_papers',  label:'Abstracts & Papers' },
        { id:'sub-presentations-invited_lectures',  label:'Invited Lectures' },
      ]},
      { id:'section-teaching_design',  label:'H. Teaching', subs:[
        { id:'sub-teaching_design-innovations', label:'Innovations' },
      ]},
      { id:'section-supervision',      label:'I. Supervision', subs:[] },
    ];

    const ul = document.getElementById('sidenavList');
    if (!ul) return;

    let navHtml = '';
    NAV.forEach(sec => {
      navHtml += `<li class="nav-sec-item"><a href="#${sec.id}" class="nav-sec">${sec.label}</a>`;
      if (sec.subs.length) {
        navHtml += '<ul class="nav-sub-list">';
        sec.subs.forEach(sub => {
          navHtml += `<li><a href="#${sub.id}" class="nav-sub">${sub.label}</a></li>`;
        });
        navHtml += '</ul>';
      }
      navHtml += '</li>';
    });
    ul.innerHTML = navHtml;

    // Intersection observer for active highlighting
    const allItems = [];
    NAV.forEach(sec => {
      allItems.push(sec);
      sec.subs.forEach(sub => allItems.push(sub));
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          ul.querySelectorAll('a').forEach(a => a.classList.remove('active'));
          const a = ul.querySelector(`a[href="#${en.target.id}"]`);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin:'-10% 0px -70% 0px' });

    allItems.forEach(n => {
      const el = document.getElementById(n.id);
      if (el) obs.observe(el);
    });
  }

  return { render };
})();
