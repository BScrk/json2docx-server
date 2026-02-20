const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = require('../server');

const TEMPLATE_PATH = path.join(__dirname, 'fixtures', 'template.docx');
const DATA_PATH = path.join(__dirname, 'fixtures', 'data.json');
const OUTPUT_DIR = path.join(__dirname, 'output');

let passed = 0;
let failed = 0;
let server;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function multipartRequest(url, fields, file) {
  return new Promise((resolve, reject) => {
    const boundary = '----Boundary' + crypto.randomBytes(8).toString('hex');
    const parts = [];

    // Add form fields
    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
        `${value}\r\n`
      );
    }

    // Add file
    if (file) {
      const fileContent = fs.readFileSync(file.path);
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${file.field}"; filename="${path.basename(file.path)}"\r\n` +
        `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`
      );
      parts.push(fileContent);
      parts.push(Buffer.from('\r\n'));
    }

    parts.push(`--${boundary}--\r\n`);

    // Build body buffer
    const bodyParts = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
    const body = Buffer.concat(bodyParts);

    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buffer });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function simpleGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    }).on('error', reject);
  });
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Start server on random available port
  const BASE_URL = await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      console.log(`[test] server started on port ${port}`);
      resolve(`http://localhost:${port}`);
    });
  });

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  console.log('\n=== json2docx-server tests ===\n');

  // --------------------------------------------------
  console.log('1. Health check');
  const health = await simpleGet(`${BASE_URL}/health`);
  assert(health.status === 200, 'GET /health returns 200');
  const hBody = JSON.parse(health.body);
  assert(hBody.status === 'ok', 'Health status is "ok"');
  assert(hBody.service === 'json2docx-server', 'Service name matches');

  // --------------------------------------------------
  console.log('\n2. Conversion OK - template + data');
  const res = await multipartRequest(`${BASE_URL}/js2docx`,
    { data: JSON.stringify(data) },
    { field: 'template', path: TEMPLATE_PATH }
  );
  assert(res.status === 200, 'POST /js2docx returns 200');
  assert(res.headers['content-type'].includes('openxmlformats'), 'Content-Type is DOCX');
  assert(res.headers['content-disposition'].includes('document.docx'), 'Content-Disposition has filename');
  assert(res.body.length > 500, `Response body is a valid buffer (${res.body.length} bytes)`);

  // Save output for manual inspection
  const outPath = path.join(OUTPUT_DIR, 'result.docx');
  fs.writeFileSync(outPath, res.body);
  console.log(`  → Saved to ${outPath}`);

  // Verify the generated DOCX contains injected data
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(res.body);
  const docXml = await zip.file('word/document.xml').async('string');
  assert(docXml.includes(data.clientName), `DOCX contains clientName "${data.clientName}"`);
  assert(docXml.includes(data.company), `DOCX contains company "${data.company}"`);
  assert(docXml.includes(data.projectName), `DOCX contains projectName "${data.projectName}"`);
  assert(docXml.includes(data.email), `DOCX contains email "${data.email}"`);
  assert(docXml.includes(data.status), `DOCX contains status "${data.status}"`);
  assert(!docXml.includes('{clientName}'), 'Template variable {clientName} was replaced');
  assert(!docXml.includes('{company}'), 'Template variable {company} was replaced');

  // --------------------------------------------------
  console.log('\n3. Error: missing data field');
  const noData = await multipartRequest(`${BASE_URL}/js2docx`,
    {},
    { field: 'template', path: TEMPLATE_PATH }
  );
  assert(noData.status === 400, 'Returns 400 without data');
  const noDataBody = JSON.parse(noData.body.toString());
  assert(noDataBody.error.includes('Missing data'), 'Error message mentions missing data');

  // --------------------------------------------------
  console.log('\n4. Error: invalid JSON in data');
  const badJson = await multipartRequest(`${BASE_URL}/js2docx`,
    { data: '{not valid json' },
    { field: 'template', path: TEMPLATE_PATH }
  );
  assert(badJson.status === 400, 'Returns 400 for invalid JSON');
  const badJsonBody = JSON.parse(badJson.body.toString());
  assert(badJsonBody.error.includes('Invalid JSON'), 'Error message mentions invalid JSON');

  // --------------------------------------------------
  console.log('\n5. Error: missing template file');
  const noFile = await multipartRequest(`${BASE_URL}/js2docx`,
    { data: JSON.stringify(data) },
    null
  );
  assert(noFile.status === 400, 'Returns 400 without template');
  const noFileBody = JSON.parse(noFile.body.toString());
  assert(noFileBody.error.includes('Missing docx'), 'Error message mentions missing template');

  // --------------------------------------------------
  console.log('\n=== Results ===');
  console.log(`  ${passed} passed, ${failed} failed\n`);

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Test runner error:', e);
  if (server) server.close();
  process.exit(1);
});
