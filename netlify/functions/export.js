const {
  Document, Packer, Paragraph, TextRun, Tab, Table, TableRow, TableCell,
  Header, Footer, PageNumber, PageNumberElement, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, TabStopType, TabStopPosition, NumberFormat, TableLayoutType,
  convertInchesToTwip, UnderlineType, PageBreak
} = require('docx');

// ── MEASUREMENTS (all in DXA = twips, 1440 per inch) ─────────────────────────
const DXA = 1440;
const in2dxa = n => Math.round(n * DXA);

// From original DOCX inspection:
const PAGE_W      = in2dxa(8.5);
const PAGE_H      = in2dxa(11);
const MARGIN_TOP  = in2dxa(0.5);
const MARGIN_BOT  = 1134;          // exact value from original: 0.787"
const MARGIN_L    = in2dxa(0.5);
const MARGIN_R    = in2dxa(0.5);
const TEXT_W      = PAGE_W - MARGIN_L - MARGIN_R;  // 10800 dxa = 7.5"
const TAB_COL     = in2dxa(1.77);  // 2545 dxa — matches original Word tab stop
const TNR         = 'Times New Roman';
const BODY_SZ     = 22;            // half-points: 22 = 11pt
const BODY_SZ_SM  = 20;            // 10pt for notes
const HDR_SZ      = 20;            // 10pt header
const TITLE_SZ    = 32;            // 16pt name
const SUBTITLE_SZ = 24;            // 12pt title

// ── NETLIFY FUNCTION HANDLER ──────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const body     = JSON.parse(event.body);
    const cvData   = body.cvData;
    const included = body.included; // array of section keys, null = all

    const inc = key => !included || included.includes(key);
    const nums = computeNums(inc);

    const doc = buildDocument(cvData, inc, nums);
    const buffer = await Packer.toBuffer(doc);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="CV_Jennia_Michaeli_${new Date().toISOString().slice(0,10)}.docx"`,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('Export error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// ── DOCUMENT BUILDER ──────────────────────────────────────────────────────────

function buildDocument(cv, inc, nums) {
  const m = cv.meta;
  const s = cv.sections;
  const children = [];

  // ── Title block ──
  children.push(centered('Curriculum Vitae', SUBTITLE_SZ, true));
  children.push(centered(m.name, TITLE_SZ, true));
  children.push(centered(m.title, SUBTITLE_SZ, false));
  children.push(spacer());

  // ── A ──
  if (inc('section_a')) {
    children.push(h1('A. Date Curriculum Vitae is Prepared: ' + m.preparedDate));
  }

  // ── B ──
  if (inc('section_b')) {
    children.push(h1('B. Biographical Information'));
    children.push(...bioTable(m.contact));
    children.push(spacer());
  }

  // ── 1. Education ──
  if (inc('education')) {
    children.push(h1(nums.education + '. EDUCATION'));
    const edu = s.education;
    if (inc('education_degrees'))        { children.push(h2('Degrees'));                                      children.push(...entryTable(edu.subsections.degrees.items)); }
    if (inc('education_postgrad'))       { children.push(h2('Postgraduate, Research and Specialty Training')); children.push(...entryTable(edu.subsections.postgrad.items)); }
    if (inc('education_qualifications')) { children.push(h2('Qualifications, Certifications and Licenses'));   children.push(...entryTable(edu.subsections.qualifications.items)); }
  }

  // ── 2. Employment ──
  if (inc('employment')) {
    children.push(h1(nums.employment + '. EMPLOYMENT'));
    if (inc('employment_current'))  { children.push(h2('Current Appointments'));  children.push(...entryTable(s.employment.subsections.current.items)); }
    if (inc('employment_previous')) { children.push(h2('Previous Appointments')); children.push(h3('CLINICAL')); children.push(...entryTable(s.employment.subsections.previous.items)); }
  }

  // ── 3. Honours ──
  if (inc('honours')) {
    children.push(h1(nums.honours + '. HONOURS AND CAREER AWARDS'));
    const hon = s.honours;
    if (inc('honours_distinctions')) {
      children.push(h2('Distinctions and Research Awards')); children.push(h3('Received'));
      children.push(...entryTable(hon.subsections.distinctions.items));
      if (hon.subsections.distinguished_nominated.items.length) { children.push(h3('Nominated')); children.push(...entryTable(hon.subsections.distinguished_nominated.items)); }
    }
    if (inc('honours_teaching')) {
      children.push(h2('Teaching Awards')); children.push(h3('Received'));
      children.push(...entryTable(hon.subsections.teaching_awards.items));
      if (hon.subsections.teaching_nominated.items.length) { children.push(h3('Nominated')); children.push(...entryTable(hon.subsections.teaching_nominated.items)); }
    }
    if (inc('honours_student')) { children.push(h2('Student/Trainee Awards')); children.push(h3('Received')); children.push(...entryTable(hon.subsections.student_awards.items)); }
  }

  // ── 4. Affiliations ──
  if (inc('affiliations')) {
    children.push(h1(nums.affiliations + '. PROFESSIONAL AFFILIATIONS AND ACTIVITIES'));
    const aff = s.affiliations;
    if (inc('affiliations_associations')) { children.push(h2('Professional Associations')); children.push(...entryTable(aff.subsections.associations.items)); }
    if (inc('affiliations_admin')) {
      children.push(h2('Administrative Activities'));
      [['admin_local','Local'],['admin_national','National'],['admin_international','International']].forEach(([k,lbl]) => {
        children.push(h3(lbl));
        aff.subsections[k].subgroups.forEach(sg => {
          children.push(underlinePara(sg.groupLabel));
          children.push(...entryTable(sg.items));
        });
      });
    }
    if (inc('affiliations_peer_review'))  { children.push(h2('Peer Review Activities'));                children.push(h3('MANUSCRIPT REVIEWS')); children.push(...entryTable(aff.subsections.peer_review.items)); }
    if (inc('affiliations_research'))     { children.push(h2('Other Research and Professional Activities')); children.push(h3('RESEARCH PROJECT'));   children.push(...entryTable(aff.subsections.research_projects.items)); }
  }

  // ── C. Academic Profile ──
  if (inc('academic_profile')) {
    children.push(h1(nums.academic_profile + '. Academic Profile'));
    const ap = s.academic_profile;
    if (inc('academic_research_statement'))  { children.push(h2('1. RESEARCH STATEMENTS'));                        children.push(...narrativeParas(ap.subsections.research_statement.content)); }
    if (inc('academic_teaching_philosophy')) { children.push(h2('2. TEACHING PHILOSOPHY'));                        children.push(...narrativeParas(ap.subsections.teaching_philosophy.content)); }
    if (inc('academic_cpa'))                 { children.push(h2('3. CREATIVE PROFESSIONAL ACTIVITIES STATEMENT')); children.push(...narrativeParas(ap.subsections.cpa_statement.content)); }
  }

  // ── D. Funding ──
  if (inc('funding')) {
    children.push(h1(nums.funding + '. Research Funding'));
    if (inc('funding_grants')) { children.push(h2('1. GRANTS, CONTRACTS AND CLINICAL TRIALS')); children.push(h3('PEER-REVIEWED GRANTS')); children.push(...entryTable(s.funding.subsections.peer_reviewed_grants.items)); }
    if (inc('funding_salary')) { children.push(h2('2. SALARY SUPPORT AND OTHER FUNDING')); children.push(...entryTable(s.funding.subsections.salary_support.items)); }
  }

  // ── E. Publications ──
  if (inc('publications')) {
    children.push(h1(nums.publications + '. Publications'));
    const pub = s.publications;
    if (inc('publications_significant')) { children.push(h2('1. MOST SIGNIFICANT PUBLICATIONS')); children.push(...pubTable(pub.subsections.most_significant.items)); }
    if (inc('publications_peer'))        { children.push(h2('2. PEER-REVIEWED PUBLICATIONS')); children.push(h3('Journal Articles')); children.push(...pubTable(pub.subsections.peer_reviewed.items)); }
    if (inc('publications_case'))        { children.push(h3('Case Reports'));  children.push(...pubTable(pub.subsections.case_reports.items)); }
    if (inc('publications_abstracts'))   { children.push(h3('Abstracts'));     children.push(...pubTable(pub.subsections.abstracts.items)); }
    if (inc('publications_chapters'))    { children.push(h3('Book Chapters')); children.push(...pubTable(pub.subsections.book_chapters.items)); }
    if (inc('publications_submitted'))   { children.push(h2('3. SUBMITTED PUBLICATIONS')); children.push(h3('Journal Articles')); children.push(...pubTable(pub.subsections.submitted.items)); }
  }

  // ── F. Patents ──
  if (inc('patents')) { children.push(h1(nums.patents + '. Patents and Copyrights')); children.push(bodyPara(s.patents.content)); }

  // ── G. Presentations ──
  if (inc('presentations')) {
    children.push(h1(nums.presentations + '. Presentations and Special Lectures'));
    const pres = s.presentations;
    if (inc('presentations_abstracts')) { children.push(h2('Abstracts and Other Papers'));       children.push(...presTable(pres.subsections.abstracts_papers.items)); }
    if (inc('presentations_invited'))   { children.push(h2('Invited Lectures and Presentations')); children.push(...presTable(pres.subsections.invited_lectures.items)); }
  }

  // ── H. Teaching ──
  if (inc('teaching_design')) {
    children.push(h1(nums.teaching_design + '. Teaching and Design'));
    if (inc('teaching_innovations')) { children.push(h2('1. INNOVATIONS AND DEVELOPMENT IN TEACHING AND EDUCATION')); children.push(...entryTable(s.teaching_design.subsections.innovations.items)); }
  }

  // ── I. Supervision ──
  if (inc('supervision')) { children.push(h1(nums.supervision + '. Research Supervision')); children.push(...entryTable(s.supervision.items)); }

  // ── Assemble document ──
  return new Document({
    creator: 'cv.michaeli.ca',
    title: 'Curriculum Vitae — ' + m.name,
    styles: {
      default: {
        document: {
          run: { font: TNR, size: BODY_SZ },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size:    { width: PAGE_W, height: PAGE_H },
          margin:  { top: MARGIN_TOP, bottom: MARGIN_BOT, left: MARGIN_L, right: MARGIN_R, header: in2dxa(0.5), footer: in2dxa(0.5) },
        },
        titlePage: true,  // different first-page header
      },
      headers: {
        default: makeHeader(m.name, m.preparedDate),
        first:   new Header({ children: [new Paragraph('')] }),  // blank on page 1
      },
      footers: {
        default: makeFooter(m.preparedDate),
        first:   new Footer({ children: [new Paragraph('')] }),  // blank on page 1
      },
      children,
    }],
  });
}

// ── PARAGRAPH HELPERS ─────────────────────────────────────────────────────────

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: TNR,
    size: opts.size || BODY_SZ,
    bold:      opts.bold      || false,
    italics:   opts.italics   || false,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    color:     opts.color     || undefined,
  });
}

function spacer() {
  return new Paragraph({ children: [run('')], spacing: { before: 0, after: 0 } });
}

function centered(text, size, bold) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: in2dxa(0.04) },
    children: [run(text, { size, bold })],
  });
}

// Section heading: bold uppercase + bottom border (the horizontal rule)
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: in2dxa(0.15), after: in2dxa(0.05) },
    border:  { bottom: { style: BorderStyle.SINGLE, size: 12, space: 2, color: '000000' } },
    children: [run(text, { bold: true })],
  });
}

// Subsection heading: bold (not italic — matches original)
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: in2dxa(0.1), after: in2dxa(0.04) },
    children: [run(text, { bold: true })],
  });
}

// Sub-subheading: plain body text (Received, Nominated, CLINICAL, etc.)
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: in2dxa(0.06), after: in2dxa(0.02) },
    children: [run(text, { bold: false })],
  });
}

function underlinePara(text) {
  return new Paragraph({
    spacing: { before: in2dxa(0.06), after: in2dxa(0.02) },
    children: [run(text, { bold: true, underline: true })],
  });
}

function bodyPara(text) {
  return new Paragraph({
    spacing: { before: 0, after: in2dxa(0.04) },
    children: [run(text || '')],
  });
}

// ── BIOGRAPHICAL TABLE ─────────────────────────────────────────────────────────
// Use a real table for reliable two-column layout
function bioTable(contact) {
  const rows = [
    ['Primary Office', contact.office],
    ['Telephone',      contact.telephone],
    ['Cellphone',      contact.cellphone],
    ['Fax',            contact.fax],
    ['Email',          contact.email],
  ];

  const COL1 = in2dxa(1.5);
  const COL2 = TEXT_W - COL1;
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };

  return [new Table({
    layout: TableLayoutType.FIXED,
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [COL1, COL2],
    borders,
    rows: rows.map(([label, value]) => {
      // Handle multi-line values (Primary Office)
      const valueLines = (value || '').split('\n');
      const valueCells = valueLines.map((line, i) => run(line));

      return new TableRow({
        children: [
          new TableCell({
            width: { size: COL1, type: WidthType.DXA },
            borders,
            margins: { top: 20, bottom: 20, left: 0, right: 80 },
            children: [new Paragraph({ spacing:{before:0,after:0}, children: [run(label, { bold: true })] })],
          }),
          new TableCell({
            width: { size: COL2, type: WidthType.DXA },
            borders,
            margins: { top: 20, bottom: 20, left: 0, right: 0 },
            children: valueLines.map(line =>
              new Paragraph({ spacing:{before:0,after:0}, children: [run(line)] })
            ),
          }),
        ],
      });
    }),
  })];
}

// ── ENTRY TABLE (year | title + notes) ────────────────────────────────────────

function entryTable(items) {
  if (!items || !items.length) return [];
  const COL1 = TAB_COL;
  const COL2 = TEXT_W - COL1;
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };

  return items.map(item => {
    const noteLines = item.notes ? item.notes.split('\n').filter(l => l.trim()) : [];
    const valueParas = [
      new Paragraph({ spacing:{before:0,after:0}, children: [run(item.title || '')] }),
      ...noteLines.map(line => new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [run(line, { size: BODY_SZ_SM, color: '444444' })],
      })),
    ];

    return new Table({
      layout: TableLayoutType.FIXED,
      width: { size: TEXT_W, type: WidthType.DXA },
      columnWidths: [COL1, COL2],
      borders,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: COL1, type: WidthType.DXA },
            borders,
            margins: { top: 20, bottom: 80, left: 0, right: 80 },
            children: [new Paragraph({ spacing:{before:0,after:0}, children: [run(item.years || '')] })],
          }),
          new TableCell({
            width: { size: COL2, type: WidthType.DXA },
            borders,
            margins: { top: 20, bottom: 80, left: 0, right: 0 },
            children: valueParas,
          }),
        ],
      })],
    });
  });
}

// ── PUBLICATION TABLE (num | citation + annotation) ───────────────────────────

function pubTable(items) {
  if (!items || !items.length) return [];
  const COL1 = in2dxa(0.35);
  const COL2 = TEXT_W - COL1;
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };

  return items.map((item, idx) => {
    const citParas = [
      new Paragraph({ spacing:{before:0,after:0}, children: [run(item.citation || '')] }),
    ];
    if (item.annotation) {
      citParas.push(new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [run(item.annotation, { size: BODY_SZ_SM, color: '444444' })],
      }));
    }

    return new Table({
      layout: TableLayoutType.FIXED,
      width: { size: TEXT_W, type: WidthType.DXA },
      columnWidths: [COL1, COL2],
      borders,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: COL1, type: WidthType.DXA },
            borders,
            margins: { top: 20, bottom: 40, left: 0, right: 60 },
            children: [new Paragraph({ spacing:{before:0,after:0}, children: [run(String(idx+1) + '.')] })],
          }),
          new TableCell({
            width: { size: COL2, type: WidthType.DXA },
            borders,
            margins: { top: 20, bottom: 40, left: 0, right: 0 },
            children: citParas,
          }),
        ],
      })],
    });
  });
}

// ── PRESENTATION TABLE (date | text) ──────────────────────────────────────────

function presTable(items) {
  if (!items || !items.length) return [];
  const COL1 = TAB_COL;
  const COL2 = TEXT_W - COL1;
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };

  return items.map(item => new Table({
    layout: TableLayoutType.FIXED,
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [COL1, COL2],
    borders,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: COL1, type: WidthType.DXA },
          borders,
          margins: { top: 20, bottom: 40, left: 0, right: 80 },
          children: [new Paragraph({ spacing:{before:0,after:0}, children: [run(item.date || '')] })],
        }),
        new TableCell({
          width: { size: COL2, type: WidthType.DXA },
          borders,
          margins: { top: 20, bottom: 40, left: 0, right: 0 },
          children: [new Paragraph({ spacing:{before:0,after:0}, children: [run(item.text || '')] })],
        }),
      ],
    })],
  }));
}

// ── NARRATIVE ─────────────────────────────────────────────────────────────────

function narrativeParas(content) {
  if (!content) return [];
  return content.split(/\n\n+/).filter(Boolean).map(para =>
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: in2dxa(0.07) },
      children: [run(para.trim())],
    })
  );
}

// ── HEADER / FOOTER ───────────────────────────────────────────────────────────

function makeHeader(name, date) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        border:  { bottom: { style: BorderStyle.SINGLE, size: 6, space: 4, color: '888888' } },
        tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }],
        children: [
          run(name, { bold: true, size: HDR_SZ }),
          new Tab(),
          run(date + '    CONFIDENTIAL DOCUMENT', { size: HDR_SZ, italics: true, color: '666666' }),
        ],
      }),
    ],
  });
}

function makeFooter(date) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          run('Page ', { size: HDR_SZ }),
          new PageNumberElement({ pageNumberType: PageNumber.CURRENT, font: TNR, size: HDR_SZ }),
          run(' of ', { size: HDR_SZ }),
          new PageNumberElement({ pageNumberType: PageNumber.TOTAL_PAGES, font: TNR, size: HDR_SZ }),
          run('     ' + date + '     CONFIDENTIAL DOCUMENT', { size: HDR_SZ, italics: true, color: '666666' }),
        ],
      }),
    ],
  });
}

// ── SECTION NUMBERING ─────────────────────────────────────────────────────────

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
