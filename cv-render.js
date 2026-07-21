/* cv-render.js */
'use strict';

const CVRender = (() => {

  // ── UTILS ──────────────────────────────────────────────────────────────────
  const e  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const nl = s => e(s).replace(/\n/g,'<br>');

  // ── BUTTON FACTORIES ───────────────────────────────────────────────────────

  function iconBtn(action, title, section, sub, id, extraCls) {
    const glyphs = { edit:'✎', del:'🗑', up:'↑', down:'↓' };
    const classes = {
      edit:'btn-icon btn-edit', del:'btn-icon btn-del',
      up:'btn-icon btn-move', down:'btn-icon btn-move'
    };
    return `<button class="${classes[action]||'btn-icon'} no-print ${extraCls||''}" title="${title}"
      data-action="${action}" data-section="${section}" data-sub="${sub||''}" data-id="${id||''}">${glyphs[action]||action}</button>`;
  }

  // Inline add row — consistent style across ALL sections
  function addRow(section, sub, label) {
    return `<div class="add-row no-print">
      <button class="btn-icon btn-add" data-action="add" data-section="${section}" data-sub="${sub||''}" data-id="" title="${label}">+</button>
      <span class="add-row-label">${label}</span>
    </div>`;
  }

  // Section heading — no add button in header, always use addRow below
  function secHdr(label) {
    return `<div class="cv-sec-hdr"><h2>${e(label)}</h2></div>`;
  }

  // Subsection heading with optional add row below
  function subHdr(label, section, sub, addLabel) {
    return `<div class="cv-sub-hdr"><h3>${e(label)}</h3></div>
      ${addLabel ? addRow(section, sub, addLabel) : ''}`;
  }

  // ── ENTRY RENDERERS ────────────────────────────────────────────────────────

  function entry(sec, sub, item, isFirst, isLast) {
    const notes = item.notes ? `<div class="entry-notes">${nl(item.notes)}</div>` : '';
    return `<div class="cv-entry" data-id="${e(item.id)}">
      <div class="entry-year">${e(item.years||'')}</div>
      <div class="entry-body">${e(item.title||'')}${notes}</div>
      <span class="entry-actions no-print">
        ${!isFirst ? iconBtn('up','Move up',sec,sub,item.id) : '<span class="btn-icon-placeholder"></span>'}
        ${!isLast  ? iconBtn('down','Move down',sec,sub,item.id) : '<span class="btn-icon-placeholder"></span>'}
        ${iconBtn('edit','Edit',sec,sub,item.id)}
        ${iconBtn('del','Delete',sec,sub,item.id)}
      </span>
    </div>`;
  }

  function renderEntries(sec, sub, items) {
    return items.map((item,i) => entry(sec, sub, item, i===0, i===items.length-1)).join('');
  }

  function pub(sec, sub, item, num, isFirst, isLast) {
    const ann = item.annotation ? `<div class="pub-annotation">${nl(item.annotation)}</div>` : '';
    return `<div class="pub-entry" data-id="${e(item.id)}">
      <div class="pub-num">${num}.</div>
      <div class="pub-body">${e(item.citation||'')}</div>
      <span class="entry-actions no-print">
        ${!isFirst ? iconBtn('up','Move up',sec,sub,item.id) : '<span class="btn-icon-placeholder"></span>'}
        ${!isLast  ? iconBtn('down','Move down',sec,sub,item.id) : '<span class="btn-icon-placeholder"></span>'}
        ${iconBtn('edit','Edit',sec,sub,item.id)}
        ${iconBtn('del','Delete',sec,sub,item.id)}
      </span>
    </div>${ann}`;
  }

  function renderPubs(sec, sub, items) {
    return items.map((item,i) => pub(sec, sub, item, i+1, i===0, i===items.length-1)).join('');
  }

  function pres(sec, sub, item, isFirst, isLast) {
    return `<div class="pres-entry" data-id="${e(item.id)}">
      <div class="pres-date">${e(item.date||'')}</div>
      <div class="pres-body">${e(item.text||'')}</div>
      <span class="entry-actions no-print">
        ${!isFirst ? iconBtn('up','Move up',sec,sub,item.id) : '<span class="btn-icon-placeholder"></span>'}
        ${!isLast  ? iconBtn('down','Move down',sec,sub,item.id) : '<span class="btn-icon-placeholder"></span>'}
        ${iconBtn('edit','Edit',sec,sub,item.id)}
        ${iconBtn('del','Delete',sec,sub,item.id)}
      </span>
    </div>`;
  }

  function renderPres(sec, sub, items) {
    return items.map((item,i) => pres(sec, sub, item, i===0, i===items.length-1)).join('');
  }

  function narrative(sub, content) {
    const paras = (content||'').split(/\n\n+/).filter(Boolean);
    return `<div class="cv-narrative">${paras.map(p=>`<p>${e(p.trim())}</p>`).join('')}</div>`;
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────

  function render() {
    const d = window.CV_DATA;
    const s = d.sections;
    const m = d.meta;
    let h = '';

    // ── Document title (always shown, not a section) ──
    h += `<div class="cv-hdr">
      <h1>${e(m.name)}</h1>
      <div class="cv-subtitle">${e(m.title)}</div>
    </div>`;

    // ── A. Date ──
    h += `<div class="cv-sec" id="section-section_a">
      <div class="cv-sec-hdr">
        <h2>A. Date Curriculum Vitae is Prepared: ${e(m.preparedDate)}</h2>
        <div class="no-print">${iconBtn('edit','Edit date','meta','preparedDate','preparedDate')}</div>
      </div>
    </div>`;

    // ── B. Biographical ──
    h += `<div class="cv-sec" id="section-section_b">
      ${secHdr('B. Biographical Information')}
      <table class="bio-table">
        <tr>
          <td class="bio-label">Primary Office</td>
          <td style="white-space:pre-line">${e(m.contact.office)}</td>
          <td class="bio-actions no-print">${iconBtn('edit','Edit','meta','contact','office')}</td>
        </tr>
        <tr>
          <td class="bio-label">Telephone</td>
          <td>${e(m.contact.telephone)}</td>
          <td class="bio-actions no-print">${iconBtn('edit','Edit','meta','contact','telephone')}</td>
        </tr>
        <tr>
          <td class="bio-label">Cellphone</td>
          <td>${e(m.contact.cellphone)}</td>
          <td class="bio-actions no-print">${iconBtn('edit','Edit','meta','contact','cellphone')}</td>
        </tr>
        <tr>
          <td class="bio-label">Fax</td>
          <td>${e(m.contact.fax)}</td>
          <td class="bio-actions no-print">${iconBtn('edit','Edit','meta','contact','fax')}</td>
        </tr>
        <tr>
          <td class="bio-label">Email</td>
          <td>${e(m.contact.email)}</td>
          <td class="bio-actions no-print">${iconBtn('edit','Edit','meta','contact','email')}</td>
        </tr>
      </table>
      ${addRow('meta','contact','Add contact row')}
    </div>`;

    // ── 1. EDUCATION ──
    const edu = s.education;
    h += `<div class="cv-sec" id="section-education">${secHdr(edu.label)}`;
    ['degrees','postgrad','qualifications'].forEach(k => {
      const sub = edu.subsections[k];
      h += `<div class="cv-sub" id="sub-education-${k}">
        ${subHdr(sub.label,'education',k,'Add entry')}
        ${renderEntries('education',k,sub.items)}
      </div>`;
    });
    h += `</div>`;

    // ── 2. EMPLOYMENT ──
    h += `<div class="cv-sec" id="section-employment">${secHdr(s.employment.label)}`;
    const empC = s.employment.subsections.current;
    h += `<div class="cv-sub" id="sub-employment-current">
      ${subHdr(empC.label,'employment','current','Add appointment')}
      ${renderEntries('employment','current',empC.items)}
    </div>`;
    const empP = s.employment.subsections.previous;
    h += `<div class="cv-sub" id="sub-employment-previous">
      ${subHdr(empP.label,'employment','previous','Add appointment')}
      <div class="sub-heading">${e(empP.subheading)}</div>
      ${renderEntries('employment','previous',empP.items)}
    </div></div>`;

    // ── 3. HONOURS ──
    const hon = s.honours;
    h += `<div class="cv-sec" id="section-honours">${secHdr(hon.label)}`;
    const dist = hon.subsections.distinctions;
    h += `<div class="cv-sub" id="sub-honours-distinctions">
      ${subHdr(dist.label,'honours','distinctions','Add award')}
      <div class="sub-heading">${e(dist.subheading)}</div>
      ${renderEntries('honours','distinctions',dist.items)}
    </div>`;
    const distN = hon.subsections.distinguished_nominated;
    h += `<div class="cv-sub" id="sub-honours-distinguished_nominated">
      <div class="sub-heading">Nominated</div>
      ${addRow('honours','distinguished_nominated','Add nominated award')}
      ${renderEntries('honours','distinguished_nominated',distN.items)}
    </div>`;
    const taw = hon.subsections.teaching_awards;
    h += `<div class="cv-sub" id="sub-honours-teaching_awards">
      ${subHdr(taw.label,'honours','teaching_awards','Add teaching award')}
      <div class="sub-heading">${e(taw.subheading)}</div>
      ${renderEntries('honours','teaching_awards',taw.items)}
    </div>`;
    const tawN = hon.subsections.teaching_nominated;
    h += `<div class="cv-sub" id="sub-honours-teaching_nominated">
      <div class="sub-heading">Nominated</div>
      ${addRow('honours','teaching_nominated','Add nominated teaching award')}
      ${renderEntries('honours','teaching_nominated',tawN.items)}
    </div>`;
    const staw = hon.subsections.student_awards;
    h += `<div class="cv-sub" id="sub-honours-student_awards">
      ${subHdr(staw.label,'honours','student_awards','Add student award')}
      <div class="sub-heading">${e(staw.subheading)}</div>
      ${renderEntries('honours','student_awards',staw.items)}
    </div></div>`;

    // ── 4. AFFILIATIONS ──
    h += `<div class="cv-sec" id="section-affiliations">${secHdr(s.affiliations.label)}`;
    const assoc = s.affiliations.subsections.associations;
    h += `<div class="cv-sub" id="sub-affiliations-associations">
      ${subHdr(assoc.label,'affiliations','associations','Add association')}
      ${renderEntries('affiliations','associations',assoc.items)}
    </div>`;
    [['admin_local','Local'],['admin_national','National'],['admin_international','International']].forEach(([k,heading]) => {
      const sub = s.affiliations.subsections[k];
      h += `<div class="cv-sub" id="sub-affiliations-${k}">
        <div class="sub-heading">${heading}</div>
        ${addRow('affiliations',k,'Add administrative role')}`;
      sub.subgroups.forEach(sg => {
        h += `<div class="group-label">${e(sg.groupLabel)}</div>`;
        sg.items.forEach((item,i) => { h += entry('affiliations',k,item,i===0,i===sg.items.length-1); });
      });
      h += `</div>`;
    });
    const pr = s.affiliations.subsections.peer_review;
    h += `<div class="cv-sub" id="sub-affiliations-peer_review">
      ${subHdr(pr.label,'affiliations','peer_review','Add peer review')}
      <div class="sub-heading">${e(pr.subheading)}</div>
      ${renderEntries('affiliations','peer_review',pr.items)}
    </div>`;
    const rp = s.affiliations.subsections.research_projects;
    h += `<div class="cv-sub" id="sub-affiliations-research_projects">
      ${subHdr(rp.label,'affiliations','research_projects','Add research project')}
      <div class="sub-heading">${e(rp.subheading)}</div>
      ${renderEntries('affiliations','research_projects',rp.items)}
    </div></div>`;

    // ── C. ACADEMIC PROFILE ── (subsections numbered 1/2/3, no C prefix)
    const ap = s.academic_profile;
    h += `<div class="cv-sec" id="section-academic_profile">${secHdr(ap.label)}`;
    [
      ['research_statement',  '1. RESEARCH STATEMENTS'],
      ['teaching_philosophy', '2. TEACHING PHILOSOPHY'],
      ['cpa_statement',       '3. CREATIVE PROFESSIONAL ACTIVITIES STATEMENT'],
    ].forEach(([k, label]) => {
      const sub = ap.subsections[k];
      h += `<div class="cv-sub" id="sub-academic_profile-${k}">
        <div class="cv-sub-hdr">
          <h3>${label}</h3>
          <div class="no-print">${iconBtn('edit','Edit statement','academic_profile',k,'content')}</div>
        </div>
        ${narrative(k, sub.content)}
      </div>`;
    });
    h += `</div>`;

    // ── D. FUNDING ──
    const fund = s.funding;
    h += `<div class="cv-sec" id="section-funding">${secHdr(fund.label)}`;
    const gr = fund.subsections.peer_reviewed_grants;
    h += `<div class="cv-sub" id="sub-funding-peer_reviewed_grants">
      ${subHdr(gr.label,'funding','peer_reviewed_grants','Add grant')}
      <div class="sub-heading">${e(gr.subheading)}</div>
      ${renderEntries('funding','peer_reviewed_grants',gr.items)}
    </div>`;
    const sal = fund.subsections.salary_support;
    h += `<div class="cv-sub" id="sub-funding-salary_support">
      ${subHdr(sal.label,'funding','salary_support','Add salary support')}
      ${renderEntries('funding','salary_support',sal.items)}
    </div></div>`;

    // ── E. PUBLICATIONS ──
    const pubs = s.publications;
    h += `<div class="cv-sec" id="section-publications">${secHdr(pubs.label)}`;
    const ms = pubs.subsections.most_significant;
    h += `<div class="cv-sub" id="sub-publications-most_significant">
      ${subHdr(ms.label,'publications','most_significant','Add significant publication')}
      ${renderPubs('publications','most_significant',ms.items)}
    </div>`;
    const peer = pubs.subsections.peer_reviewed;
    h += `<div class="cv-sub" id="sub-publications-peer_reviewed">
      ${subHdr(peer.label,'publications','peer_reviewed','Add journal article')}
      <div class="sub-heading">${e(peer.subheading)}</div>
      ${renderPubs('publications','peer_reviewed',peer.items)}
    </div>`;
    [['case_reports','Case Reports'],['abstracts','Abstracts'],['book_chapters','Book Chapters']].forEach(([k,heading]) => {
      h += `<div class="cv-sub" id="sub-publications-${k}">
        <div class="sub-heading">${heading}</div>
        ${addRow('publications',k,'Add ' + heading.toLowerCase().replace(/s$/,''))}
        ${renderPubs('publications',k,pubs.subsections[k].items)}
      </div>`;
    });
    const subm = pubs.subsections.submitted;
    h += `<div class="cv-sub" id="sub-publications-submitted">
      ${subHdr(subm.label,'publications','submitted','Add submitted publication')}
      <div class="sub-heading">${e(subm.subheading)}</div>
      ${renderPubs('publications','submitted',subm.items)}
    </div></div>`;

    // ── F. PATENTS ──
    h += `<div class="cv-sec" id="section-patents">
      <div class="cv-sec-hdr">
        <h2>${e(s.patents.label)}</h2>
        <div class="no-print">${iconBtn('edit','Edit','patents','','content')}</div>
      </div>
      <div class="cv-simple">${e(s.patents.content)}</div>
    </div>`;

    // ── G. PRESENTATIONS ──
    h += `<div class="cv-sec" id="section-presentations">${secHdr(s.presentations.label)}`;
    const ap2 = s.presentations.subsections.abstracts_papers;
    h += `<div class="cv-sub" id="sub-presentations-abstracts_papers">
      ${subHdr(ap2.label,'presentations','abstracts_papers','Add presentation')}
      ${renderPres('presentations','abstracts_papers',ap2.items)}
    </div>`;
    const inv = s.presentations.subsections.invited_lectures;
    h += `<div class="cv-sub" id="sub-presentations-invited_lectures">
      ${subHdr(inv.label,'presentations','invited_lectures','Add lecture')}
      ${renderPres('presentations','invited_lectures',inv.items)}
    </div></div>`;

    // ── H. TEACHING ──
    const td = s.teaching_design;
    h += `<div class="cv-sec" id="section-teaching_design">${secHdr(td.label)}`;
    const innov = td.subsections.innovations;
    h += `<div class="cv-sub" id="sub-teaching_design-innovations">
      ${subHdr(innov.label,'teaching_design','innovations','Add teaching entry')}
      ${renderEntries('teaching_design','innovations',innov.items)}
    </div></div>`;

    // ── I. SUPERVISION ──
    const sup = s.supervision;
    h += `<div class="cv-sec" id="section-supervision">
      ${secHdr(sup.label)}
      ${addRow('supervision','','Add supervisee')}
      ${renderEntries('supervision','',sup.items)}
    </div>`;

    document.getElementById('cvDoc').innerHTML = h;
    buildSidenav();
  }

  // ── SIDENAV ────────────────────────────────────────────────────────────────

  function buildSidenav() {
    const NAV = [
      { id:'section-section_a',         label:'A. Date Prepared',    subs:[] },
      { id:'section-section_b',         label:'B. Biographical Info', subs:[] },
      { id:'section-education',         label:'1. Education', subs:[
        { id:'sub-education-degrees',        label:'Degrees' },
        { id:'sub-education-postgrad',       label:'Postgraduate Training' },
        { id:'sub-education-qualifications', label:'Qualifications' },
      ]},
      { id:'section-employment',        label:'2. Employment', subs:[
        { id:'sub-employment-current',  label:'Current Appointments' },
        { id:'sub-employment-previous', label:'Previous Appointments' },
      ]},
      { id:'section-honours',           label:'3. Honours & Awards', subs:[
        { id:'sub-honours-distinctions',            label:'Distinctions' },
        { id:'sub-honours-teaching_awards',         label:'Teaching Awards' },
        { id:'sub-honours-student_awards',          label:'Student Awards' },
      ]},
      { id:'section-affiliations',      label:'4. Affiliations', subs:[
        { id:'sub-affiliations-associations',        label:'Associations' },
        { id:'sub-affiliations-admin_local',         label:'Admin – Local' },
        { id:'sub-affiliations-admin_national',      label:'Admin – National' },
        { id:'sub-affiliations-admin_international', label:'Admin – Intl' },
        { id:'sub-affiliations-peer_review',         label:'Peer Review' },
        { id:'sub-affiliations-research_projects',   label:'Research Projects' },
      ]},
      { id:'section-academic_profile',  label:'C. Academic Profile', subs:[
        { id:'sub-academic_profile-research_statement',  label:'1. Research Statement' },
        { id:'sub-academic_profile-teaching_philosophy', label:'2. Teaching Philosophy' },
        { id:'sub-academic_profile-cpa_statement',       label:'3. CPA Statement' },
      ]},
      { id:'section-funding',           label:'D. Research Funding', subs:[
        { id:'sub-funding-peer_reviewed_grants', label:'Peer-Reviewed Grants' },
        { id:'sub-funding-salary_support',       label:'Salary Support' },
      ]},
      { id:'section-publications',      label:'E. Publications', subs:[
        { id:'sub-publications-most_significant', label:'Most Significant' },
        { id:'sub-publications-peer_reviewed',    label:'Journal Articles' },
        { id:'sub-publications-case_reports',     label:'Case Reports' },
        { id:'sub-publications-abstracts',        label:'Abstracts' },
        { id:'sub-publications-book_chapters',    label:'Book Chapters' },
        { id:'sub-publications-submitted',        label:'Submitted' },
      ]},
      { id:'section-patents',           label:'F. Patents',          subs:[] },
      { id:'section-presentations',     label:'G. Presentations', subs:[
        { id:'sub-presentations-abstracts_papers',  label:'Abstracts & Papers' },
        { id:'sub-presentations-invited_lectures',  label:'Invited Lectures' },
      ]},
      { id:'section-teaching_design',   label:'H. Teaching', subs:[
        { id:'sub-teaching_design-innovations', label:'Innovations' },
      ]},
      { id:'section-supervision',       label:'I. Supervision', subs:[] },
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

    const allItems = NAV.flatMap(sec => [sec, ...sec.subs]);
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          ul.querySelectorAll('a').forEach(a => a.classList.remove('active'));
          const a = ul.querySelector(`a[href="#${en.target.id}"]`);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin:'-10% 0px -70% 0px' });
    allItems.forEach(n => { const el = document.getElementById(n.id); if (el) obs.observe(el); });
  }

  return { render };
})();
