// code.gs — CV Backend + DOCX Export
// Deploy as: Web app > Execute as: Me > Who has access: Anyone

const FILENAME = 'cv-data.json';
const TEMP_FOLDER = 'CV_Exports_Temp';

// ── ROUTING ───────────────────────────────────────────────────────────────────
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'export')   return exportDocx(e);
  if (action === 'download') return serveDocx(e);
  return loadData();
}
function doPost(e) { return saveData(e); }

// ── LOAD / SAVE ────────────────────────────────────────────────────────────────
function loadData() {
  try {
    return jsonResponse(getOrCreateFile().getBlob().getDataAsString(), true);
  } catch(err) { return jsonResponse({ error: err.message }); }
}
function saveData(e) {
  try {
    const data = e.postData.contents;
    JSON.parse(data);
    getOrCreateFile().setContent(data);
    return jsonResponse({ success: true });
  } catch(err) { return jsonResponse({ error: err.message }); }
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
function exportDocx(e) {
  try {
    const inc = makeIncluder(e.parameter.include || '');
    const cv  = JSON.parse(getOrCreateFile().getBlob().getDataAsString());
    const docId = buildDoc(cv, inc);

    const token = ScriptApp.getOAuthToken();
    const resp  = UrlFetchApp.fetch(
      'https://docs.google.com/document/d/' + docId + '/export?format=docx',
      { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }
    );
    if (resp.getResponseCode() !== 200)
      throw new Error('Doc export HTTP ' + resp.getResponseCode());

    const folder   = getOrCreateFolder(TEMP_FOLDER);
    const fname    = 'CV_Jennia_Michaeli_' + Utilities.formatDate(new Date(), 'America/Toronto', 'yyyy-MM-dd') + '.docx';
    const saved    = folder.createFile(resp.getBlob().setName(fname));
    saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    DriveApp.getFileById(docId).setTrashed(true);

    return jsonResponse({ success: true, fileId: saved.getId(), filename: fname });
  } catch(err) {
    Logger.log(err.stack);
    return jsonResponse({ error: err.message });
  }
}

function serveDocx(e) {
  try {
    const file = DriveApp.getFileById(e.parameter.fileId);
    const base64 = Utilities.base64Encode(file.getBlob().getBytes());
    const fname = file.getName();
    file.setTrashed(true);
    return jsonResponse({ success: true, base64: base64, filename: fname });
  } catch(err) { return jsonResponse({ error: err.message }); }
}

// ── BUILD DOCUMENT ─────────────────────────────────────────────────────────────
function buildDoc(cv, inc) {
  const doc  = DocumentApp.create('CV_Temp_' + Date.now());
  const body = doc.getBody();

  // ── Page setup: Letter, 0.5" margins all sides, 0.787" bottom ──
  body.setPageWidth(pt(8.5));
  body.setPageHeight(pt(11));
  body.setMarginTop(pt(0.5));
  body.setMarginBottom(pt(0.787));
  body.setMarginLeft(pt(0.5));
  body.setMarginRight(pt(0.5));
  body.clear();

  const m = cv.meta;
  const s = cv.sections;

  // ── Header (skip first page via "different first page" trick) ──
  try {
    doc.addHeader();
    // We set an empty first-page header by using the header object
    // Continuation page header: Name left, Date + CONFIDENTIAL right
    const hdr = doc.getHeader();
    if (hdr) {
      const hp = hdr.appendParagraph('');
      hp.setSpacingBefore(0).setSpacingAfter(0);
      // Tab stop at right margin for right-aligned date
      const tabStop = pt(7.5); // 8.5" page - 0.5" margins each side = 7.5" text width
      hp.appendText(m.name).setFontFamily(TNR).setFontSize(10).setBold(true);
      hp.appendText('\t');
      hp.appendText(m.preparedDate).setFontFamily(TNR).setFontSize(9).setItalic(true);
    }
  } catch(e) { Logger.log('Header: ' + e.message); }

  // ── Footer: Page X of Y  |  date  |  CONFIDENTIAL ──
  try {
    const ftr = doc.addFooter();
    if (ftr) {
      const fp = ftr.appendParagraph('');
      fp.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(0).setSpacingAfter(0);
      fp.appendText('Page ').setFontFamily(TNR).setFontSize(9);
      fp.appendPageNumber().setFontFamily(TNR).setFontSize(9);
      fp.appendText(' of ').setFontFamily(TNR).setFontSize(9);
      fp.appendPageNumberCount().setFontFamily(TNR).setFontSize(9);
      fp.appendText('     ' + m.preparedDate + '     CONFIDENTIAL DOCUMENT')
        .setFontFamily(TNR).setFontSize(9).setItalic(true);
    }
  } catch(e) { Logger.log('Footer: ' + e.message); }

  // ── Section numbering ──
  const nums = computeNums(inc);

  // ── Title block ──
  ctr(body, 'Curriculum Vitae', 14, true);
  ctr(body, m.name, 16, true);
  ctr(body, m.title, 12, false);
  blank(body);

  // ── A. Date ──
  if (inc('section_a')) h1(body, 'A. Date Curriculum Vitae is Prepared: ' + m.preparedDate);

  // ── B. Biographical ──
  if (inc('section_b')) {
    h1(body, 'B. Biographical Information');
    bioRow(body, 'Primary Office',  m.contact.office);
    bioRow(body, 'Telephone',       m.contact.telephone);
    bioRow(body, 'Cellphone',       m.contact.cellphone);
    bioRow(body, 'Fax',             m.contact.fax);
    bioRow(body, 'Email',           m.contact.email);
    blank(body);
  }

  // ── 1. EDUCATION ──
  if (inc('education')) {
    h1(body, nums.education + '. EDUCATION');
    const edu = s.education;
    if (inc('education_degrees'))        { h2(body,'Degrees');                                    edu.subsections.degrees.items.forEach(i=>entry(body,i)); }
    if (inc('education_postgrad'))       { h2(body,'Postgraduate, Research and Specialty Training'); edu.subsections.postgrad.items.forEach(i=>entry(body,i)); }
    if (inc('education_qualifications')) { h2(body,'Qualifications, Certifications and Licenses');  edu.subsections.qualifications.items.forEach(i=>entry(body,i)); }
  }

  // ── 2. EMPLOYMENT ──
  if (inc('employment')) {
    h1(body, nums.employment + '. EMPLOYMENT');
    if (inc('employment_current'))  { h2(body,'Current Appointments'); s.employment.subsections.current.items.forEach(i=>entry(body,i)); }
    if (inc('employment_previous')) { h2(body,'Previous Appointments'); h3(body,'CLINICAL'); s.employment.subsections.previous.items.forEach(i=>entry(body,i)); }
  }

  // ── 3. HONOURS ──
  if (inc('honours')) {
    h1(body, nums.honours + '. HONOURS AND CAREER AWARDS');
    const hon = s.honours;
    if (inc('honours_distinctions')) {
      h2(body,'Distinctions and Research Awards'); h3(body,'Received');
      hon.subsections.distinctions.items.forEach(i=>entry(body,i));
      if (hon.subsections.distinguished_nominated.items.length) { h3(body,'Nominated'); hon.subsections.distinguished_nominated.items.forEach(i=>entry(body,i)); }
    }
    if (inc('honours_teaching')) {
      h2(body,'Teaching Awards'); h3(body,'Received');
      hon.subsections.teaching_awards.items.forEach(i=>entry(body,i));
      if (hon.subsections.teaching_nominated.items.length) { h3(body,'Nominated'); hon.subsections.teaching_nominated.items.forEach(i=>entry(body,i)); }
    }
    if (inc('honours_student')) { h2(body,'Student/Trainee Awards'); h3(body,'Received'); hon.subsections.student_awards.items.forEach(i=>entry(body,i)); }
  }

  // ── 4. AFFILIATIONS ──
  if (inc('affiliations')) {
    h1(body, nums.affiliations + '. PROFESSIONAL AFFILIATIONS AND ACTIVITIES');
    const aff = s.affiliations;
    if (inc('affiliations_associations')) { h2(body,'Professional Associations'); aff.subsections.associations.items.forEach(i=>entry(body,i)); }
    if (inc('affiliations_admin')) {
      h2(body,'Administrative Activities');
      [['admin_local','Local'],['admin_national','National'],['admin_international','International']].forEach(([k,lbl])=>{
        h3(body,lbl);
        aff.subsections[k].subgroups.forEach(sg=>{ underline(body,sg.groupLabel); sg.items.forEach(i=>entry(body,i)); });
      });
    }
    if (inc('affiliations_peer_review'))  { h2(body,'Peer Review Activities'); h3(body,'MANUSCRIPT REVIEWS'); aff.subsections.peer_review.items.forEach(i=>entry(body,i)); }
    if (inc('affiliations_research'))     { h2(body,'Other Research and Professional Activities'); h3(body,'RESEARCH PROJECT'); aff.subsections.research_projects.items.forEach(i=>entry(body,i)); }
  }

  // ── C. ACADEMIC PROFILE ──
  if (inc('academic_profile')) {
    h1(body, nums.academic_profile + '. Academic Profile');
    const ap = s.academic_profile;
    if (inc('academic_research_statement'))  { h2(body,'1. RESEARCH STATEMENTS');                        narr(body, ap.subsections.research_statement.content); }
    if (inc('academic_teaching_philosophy')) { h2(body,'2. TEACHING PHILOSOPHY');                        narr(body, ap.subsections.teaching_philosophy.content); }
    if (inc('academic_cpa'))                 { h2(body,'3. CREATIVE PROFESSIONAL ACTIVITIES STATEMENT'); narr(body, ap.subsections.cpa_statement.content); }
  }

  // ── D. FUNDING ──
  if (inc('funding')) {
    h1(body, nums.funding + '. Research Funding');
    if (inc('funding_grants')) { h2(body,'1. GRANTS, CONTRACTS AND CLINICAL TRIALS'); h3(body,'PEER-REVIEWED GRANTS'); s.funding.subsections.peer_reviewed_grants.items.forEach(i=>entry(body,i)); }
    if (inc('funding_salary')) { h2(body,'2. SALARY SUPPORT AND OTHER FUNDING'); s.funding.subsections.salary_support.items.forEach(i=>entry(body,i)); }
  }

  // ── E. PUBLICATIONS ──
  if (inc('publications')) {
    h1(body, nums.publications + '. Publications');
    const pub = s.publications;
    if (inc('publications_significant')) { h2(body,'1. MOST SIGNIFICANT PUBLICATIONS'); pub.subsections.most_significant.items.forEach(i=>pubEntry(body,i)); }
    if (inc('publications_peer'))        { h2(body,'2. PEER-REVIEWED PUBLICATIONS'); h3(body,'Journal Articles'); pub.subsections.peer_reviewed.items.forEach(i=>pubEntry(body,i)); }
    if (inc('publications_case'))        { h3(body,'Case Reports');  pub.subsections.case_reports.items.forEach(i=>pubEntry(body,i)); }
    if (inc('publications_abstracts'))   { h3(body,'Abstracts');     pub.subsections.abstracts.items.forEach(i=>pubEntry(body,i)); }
    if (inc('publications_chapters'))    { h3(body,'Book Chapters'); pub.subsections.book_chapters.items.forEach(i=>pubEntry(body,i)); }
    if (inc('publications_submitted'))   { h2(body,'3. SUBMITTED PUBLICATIONS'); h3(body,'Journal Articles'); pub.subsections.submitted.items.forEach(i=>pubEntry(body,i)); }
  }

  // ── F. PATENTS ──
  if (inc('patents')) { h1(body, nums.patents + '. Patents and Copyrights'); body_(body, s.patents.content); }

  // ── G. PRESENTATIONS ──
  if (inc('presentations')) {
    h1(body, nums.presentations + '. Presentations and Special Lectures');
    const pres = s.presentations;
    if (inc('presentations_abstracts')) { h2(body,'Abstracts and Other Papers');      pres.subsections.abstracts_papers.items.forEach(i=>presEntry(body,i)); }
    if (inc('presentations_invited'))   { h2(body,'Invited Lectures and Presentations'); pres.subsections.invited_lectures.items.forEach(i=>presEntry(body,i)); }
  }

  // ── H. TEACHING ──
  if (inc('teaching_design')) {
    h1(body, nums.teaching_design + '. Teaching and Design');
    if (inc('teaching_innovations')) { h2(body,'1. INNOVATIONS AND DEVELOPMENT IN TEACHING AND EDUCATION'); s.teaching_design.subsections.innovations.items.forEach(i=>entry(body,i)); }
  }

  // ── I. SUPERVISION ──
  if (inc('supervision')) { h1(body, nums.supervision + '. Research Supervision'); s.supervision.items.forEach(i=>entry(body,i)); }

  doc.saveAndClose();
  return doc.getId();
}

// ── PARAGRAPH BUILDERS ─────────────────────────────────────────────────────────

const TNR   = 'Times New Roman';
const SZ    = 11;   // body font size pt
const INDENT = pt(1.77); // tab stop = 127pt (matches Word's 2550 twips)

function pt(inches) { return inches * 72; }

function blank(body) {
  const p = body.appendParagraph('');
  p.setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
  return p;
}

function ctr(body, text, size, bold) {
  const p = body.appendParagraph('');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(0).setSpacingAfter(2);
  p.appendText(text).setFontFamily(TNR).setFontSize(size).setBold(bold).setItalic(false);
  return p;
}

// Section heading with a paragraph bottom border workaround:
// We use a thin table row as the rule since Apps Script paragraphs have no border API
function h1(body, text) {
  const p = body.appendParagraph('');
  p.setSpacingBefore(10).setSpacingAfter(1);
  p.appendText(text).setFontFamily(TNR).setFontSize(SZ).setBold(true).setItalic(false);
  // Horizontal rule: 1-row 1-col table, transparent except top border of next row
  // Simplest reliable approach: empty paragraph with ALL-CAPS + spacing does not look like original
  // Instead: add a styled empty paragraph that mimics a rule via underscores would be hacky
  // BEST OPTION in Apps Script: use paragraph attributes for bottom border
  const attrs = {};
  attrs[DocumentApp.Attribute.BORDER_BOTTOM] = true;
  // setBorderBottom doesn't exist; use paragraph spacing trick + visual separator
  // Add a minimal separator paragraph
  const rule = body.appendParagraph('');
  rule.setSpacingBefore(0).setSpacingAfter(6);
  // Make the line via a text run of underscore characters at a tiny font = looks like a rule
  const lineWidth = 95; // approximate chars to fill ~7.5" at 6pt
  rule.appendText('_'.repeat(lineWidth))
    .setFontFamily(TNR).setFontSize(4).setForegroundColor('#000000').setBold(false);
  return p;
}

function h2(body, text) {
  const p = body.appendParagraph('');
  p.setSpacingBefore(7).setSpacingAfter(2);
  p.appendText(text).setFontFamily(TNR).setFontSize(SZ).setBold(true).setItalic(true);
  return p;
}

function h3(body, text) {
  const p = body.appendParagraph('');
  p.setSpacingBefore(4).setSpacingAfter(1);
  p.appendText(text).setFontFamily(TNR).setFontSize(10).setBold(true).setItalic(false);
  return p;
}

function underline(body, text) {
  const p = body.appendParagraph('');
  p.setSpacingBefore(4).setSpacingAfter(1);
  p.appendText(text).setFontFamily(TNR).setFontSize(SZ).setBold(true).setUnderline(true);
  return p;
}

function body_(body, text) {
  const p = body.appendParagraph('');
  p.setSpacingBefore(0).setSpacingAfter(3);
  p.appendText(text || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);
  return p;
}

// Biographical two-column row: bold label | regular value
// Uses a 1-row, 2-cell table to guarantee column alignment
function bioRow(body, label, value) {
  // Use table for reliable two-column layout
  const tbl = body.appendTable([['']]);
  tbl.setBorderWidth(0);
  // First row/cell already exists
  const row = tbl.getRow(0);

  // Label cell (already exists as first cell)
  const labelCell = row.getCell(0);
  labelCell.clear();
  labelCell.setWidth(pt(1.5));
  labelCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(0).setPaddingRight(4);
  const lp = labelCell.getChild(0).asParagraph();
  lp.setSpacingBefore(0).setSpacingAfter(0);
  lp.appendText(label).setFontFamily(TNR).setFontSize(SZ).setBold(true);

  // Value cell — handle multi-line office address
  const valCell = row.appendTableCell();
  valCell.setPaddingTop(1).setPaddingBottom(1).setPaddingLeft(0).setPaddingRight(0);
  const lines = value.split('\n');
  const vp = valCell.getChild(0).asParagraph();
  vp.setSpacingBefore(0).setSpacingAfter(0);
  vp.appendText(lines[0]).setFontFamily(TNR).setFontSize(SZ).setBold(false);
  for (let i = 1; i < lines.length; i++) {
    const np = valCell.appendParagraph('');
    np.setSpacingBefore(0).setSpacingAfter(0);
    np.appendText(lines[i]).setFontFamily(TNR).setFontSize(SZ).setBold(false);
  }

  return tbl;
}

// Entry: two-column via table — Year | Title + notes below
function entry(body, item) {
  const tbl = body.appendTable([['']]);
  tbl.setBorderWidth(0);
  // First row/cell already exists
  const row = tbl.getRow(0);

  // Year cell (already exists)
  const yCell = row.getCell(0);
  yCell.clear();
  yCell.setWidth(INDENT);
  yCell.setPaddingTop(0).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(4);
  const yp = yCell.getChild(0).asParagraph();
  yp.setSpacingBefore(0).setSpacingAfter(0);
  yp.appendText(item.years || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);

  // Content cell
  const cCell = row.appendTableCell();
  cCell.setPaddingTop(0).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(0);
  const cp = cCell.getChild(0).asParagraph();
  cp.setSpacingBefore(0).setSpacingAfter(0);
  cp.appendText(item.title || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);

  // Notes as additional paragraphs in the content cell
  if (item.notes) {
    item.notes.split('\n').forEach(line => {
      if (!line.trim()) return;
      const np = cCell.appendParagraph('');
      np.setSpacingBefore(1).setSpacingAfter(0);
      np.appendText(line.trim()).setFontFamily(TNR).setFontSize(10).setBold(false).setForegroundColor('#333333');
    });
  }

  return tbl;
}

// Publication entry: number | citation, annotation below
function pubEntry(body, item) {
  const tbl = body.appendTable([['']]);
  tbl.setBorderWidth(0);
  // First row/cell already exists
  const row = tbl.getRow(0);

  const numCell = row.getCell(0);
  numCell.clear();
  numCell.setWidth(pt(0.35));
  numCell.setPaddingTop(0).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(3);
  const np = numCell.getChild(0).asParagraph();
  np.setSpacingBefore(0).setSpacingAfter(0);
  np.appendText(item.number || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);

  const citCell = row.appendTableCell();
  citCell.setPaddingTop(0).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(0);
  const cp = citCell.getChild(0).asParagraph();
  cp.setSpacingBefore(0).setSpacingAfter(0);
  cp.appendText(item.citation || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);

  if (item.annotation) {
    const ap = citCell.appendParagraph('');
    ap.setSpacingBefore(2).setSpacingAfter(4);
    ap.appendText(item.annotation).setFontFamily(TNR).setFontSize(10).setBold(false).setForegroundColor('#333333');
  }

  return tbl;
}

// Presentation entry: date | text (two-column table)
function presEntry(body, item) {
  const tbl = body.appendTable([['']]);
  tbl.setBorderWidth(0);
  // First row/cell already exists
  const row = tbl.getRow(0);

  const dCell = row.getCell(0);
  dCell.clear();
  dCell.setWidth(INDENT);
  dCell.setPaddingTop(0).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(4);
  const dp = dCell.getChild(0).asParagraph();
  dp.setSpacingBefore(0).setSpacingAfter(0);
  dp.appendText(item.date || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);

  const tCell = row.appendTableCell();
  tCell.setPaddingTop(0).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(0);
  const tp = tCell.getChild(0).asParagraph();
  tp.setSpacingBefore(0).setSpacingAfter(0);
  tp.appendText(item.text || '').setFontFamily(TNR).setFontSize(SZ).setBold(false);

  return tbl;
}

function narr(body, content) {
  if (!content) return;
  content.split(/\n\n+/).filter(Boolean).forEach(para => {
    const p = body.appendParagraph('');
    p.setSpacingBefore(0).setSpacingAfter(5);
    p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFIED);
    p.appendText(para.trim()).setFontFamily(TNR).setFontSize(SZ).setBold(false);
  });
}

// ── SECTION NUMBERING ──────────────────────────────────────────────────────────
function makeIncluder(includeParam) {
  const list = includeParam ? includeParam.split(',') : null;
  return (key) => !list || list.indexOf(key) >= 0;
}

function computeNums(inc) {
  const numbered = ['education','employment','honours','affiliations'];
  const lettered = ['academic_profile','funding','publications','patents','presentations','teaching_design','supervision'];
  const letters  = 'CDEFGHIJ';
  let n = 1, l = 0;
  const nums = {};
  numbered.forEach(k => { if (inc(k)) nums[k] = String(n++); });
  lettered.forEach(k => { if (inc(k)) nums[k] = letters[l++]; });
  return nums;
}

// ── UTILITIES ──────────────────────────────────────────────────────────────────
function getOrCreateFile() {
  const files = DriveApp.getFilesByName(FILENAME);
  if (files.hasNext()) return files.next();
  return DriveApp.createFile(FILENAME, '{}', MimeType.PLAIN_TEXT);
}
function getOrCreateFolder(name) {
  const f = DriveApp.getFoldersByName(name);
  return f.hasNext() ? f.next() : DriveApp.createFolder(name);
}
function jsonResponse(data, raw) {
  const text = raw ? data : JSON.stringify(data);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

// ── PERMISSION TEST (run once to authorize, then delete) ──────────────────────
function testPermissions() {
  const doc = DocumentApp.create('Perm_Test_Delete_Me');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  const token = ScriptApp.getOAuthToken();
  UrlFetchApp.fetch('https://www.google.com');
  Logger.log('All permissions OK');
}
