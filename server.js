require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./lib/routes');

const app = express();
const PORT = process.env.PORT || 3500;

app.use(cors());
app.use('/', routes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[json2docx-server] listening on port ${PORT}`);
  });
}

module.exports = app;
