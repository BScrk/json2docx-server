const fs = require('fs');
const { createReport } = require('docx-templates');

/**
 * Convert JSON data + DOCX template into a filled DOCX buffer.
 * @param {object} json - Data to inject into the template
 * @param {string} templatePath - Absolute path to the uploaded .docx template
 * @returns {Promise<Buffer>} Generated DOCX buffer
 */
exports.js2docx = async function (json, templatePath) {
  const template = fs.readFileSync(templatePath);
  const buffer = await createReport({
    template,
    cmdDelimiter: ['{', '}'],
    data: json
  });

  // Cleanup temp file
  fs.unlink(templatePath, () => {});

  return buffer;
};
