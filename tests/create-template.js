const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function createTemplate() {
  const zip = new JSZip();

  // Minimal DOCX structure
  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>');

  zip.file('_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>');

  zip.file('word/_rels/document.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '</Relationships>');

  const body = [
    // Title
    '<w:p><w:pPr><w:jc w:val="center"/><w:pStyle w:val="Title"/></w:pPr>' +
    '<w:r><w:rPr><w:b/><w:sz w:val="48"/></w:rPr><w:t>Project Report</w:t></w:r></w:p>',

    // Blank line
    '<w:p/>',

    // Client info
    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Client: </w:t></w:r>' +
    '<w:r><w:t>{clientName}</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Company: </w:t></w:r>' +
    '<w:r><w:t>{company}</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Email: </w:t></w:r>' +
    '<w:r><w:t>{email}</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Date: </w:t></w:r>' +
    '<w:r><w:t>{date}</w:t></w:r></w:p>',

    // Blank line
    '<w:p/>',

    // Section: Project
    '<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Project</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Project name: </w:t></w:r>' +
    '<w:r><w:t>{projectName}</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Version: </w:t></w:r>' +
    '<w:r><w:t>{version}</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Status: </w:t></w:r>' +
    '<w:r><w:t>{status}</w:t></w:r></w:p>',

    // Blank line
    '<w:p/>',

    // Section: Description
    '<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Description</w:t></w:r></w:p>',

    '<w:p><w:r><w:t>{description}</w:t></w:r></w:p>',

    // Blank line
    '<w:p/>',

    // Section: Budget
    '<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Budget</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Total amount: </w:t></w:r>' +
    '<w:r><w:t>{budget} EUR</w:t></w:r></w:p>',

    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Manager: </w:t></w:r>' +
    '<w:r><w:t>{manager}</w:t></w:r></w:p>',
  ].join('');

  zip.file('word/document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" ' +
    'xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main" ' +
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
    'xmlns:mv="urn:schemas-microsoft-com:mac:vml" ' +
    'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
    'xmlns:v="urn:schemas-microsoft-com:vml" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:w10="urn:schemas-microsoft-com:office:word" ' +
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" ' +
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
    'mc:Ignorable="w14 wp14">' +
    '<w:body>' + body + '</w:body>' +
    '</w:document>');

  const outDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'template.docx');
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outPath, buf);
  console.log('Template created:', outPath);
  console.log('Variables: {clientName}, {company}, {email}, {date}, {projectName}, {version}, {status}, {description}, {budget}, {manager}');
}

createTemplate().catch(console.error);
