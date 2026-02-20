const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const converter = require('./converter');

// --------- Upload config
const uploadDirectory = '/tmp/json2docx';

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, buf) => {
      if (err) return cb(err);
      const uniqueSuffix = buf.toString('hex');
      const fileExtension = path.extname(file.originalname);
      cb(null, uniqueSuffix + fileExtension);
    });
  },
});

const upload = multer({ storage }).single('template');

// --------- Routes

router.post('/js2docx', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    // Validate JSON data
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: 'Missing data field (JSON object)' });
    }

    let jsonData;
    try {
      jsonData = JSON.parse(req.body.data);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in data field' });
    }

    // Validate template file
    if (!req.file) {
      return res.status(400).json({ error: 'Missing docx template (docx file)' });
    }

    const ext = path.extname(req.file.filename).slice(1);
    if (ext !== 'docx') {
      return res.status(400).json({ error: 'Upload a .docx file' });
    }

    const templatePath = path.join(uploadDirectory, req.file.filename);
    const buffer = await converter.js2docx(jsonData, templatePath);

    res.writeHead(200, {
      'Content-Disposition': 'attachment; filename="document.docx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    res.end(buffer);

  } catch (e) {
    console.error('[json2docx-server] conversion error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'json2docx-server' });
});

module.exports = router;
