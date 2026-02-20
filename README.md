# json2docx-server

Standalone microservice that generates DOCX documents by merging JSON data into Word templates. Upload a `.docx` template with `{placeholder}` variables and a JSON payload — get back a filled document.

Built on [docx-templates](https://github.com/guigrpa/docx-templates).

## Requirements

- **Node.js >= 22** (`.nvmrc` included)
- **npm**
- **PM2** (optional, for process management)

## Installation

```bash
git clone <repo-url>
cd json2docx-server-srv
nvm use
npm install
```

Or via Make:

```bash
make install
```

## Configuration

Copy the example env file and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description        |
|----------|---------|--------------------|
| `PORT`   | `3500`  | HTTP listening port |

## Usage

### Start the server

```bash
# Direct
node server.js

# Via Make
make start

# Via PM2 (daemonized)
npm run dev
# or
make dev
```

### Stop (PM2)

```bash
npm run stop
# or
make stop
```

### PM2 production mode

```bash
pm2 start ecosystem.config.js --env production
```

## API

### `POST /js2docx`

Converts a DOCX template + JSON data into a filled DOCX document.

**Request** — `multipart/form-data`:

| Field      | Type   | Description                                |
|------------|--------|--------------------------------------------|
| `template` | file   | A `.docx` template with `{variable}` placeholders |
| `data`     | string | JSON string with key/value pairs to inject |

**Response** — `200 OK`:
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="document.docx"`
- Body: the generated DOCX binary

**Errors**:
- `400` — Missing or invalid `data` field, missing template, or non-`.docx` file
- `500` — Conversion error

**Example**:

```bash
curl -X POST \
  -F "template=@./template.docx" \
  -F 'data={"clientName":"John Doe","company":"Acme Inc"}' \
  http://localhost:3500/js2docx --output result.docx
```

With a JSON file:

```bash
curl -X POST \
  -F "template=@./template.docx" \
  -F "data=$(cat data.json)" \
  http://localhost:3500/js2docx --output result.docx
```

### `GET /health`

Health check endpoint.

```json
{ "status": "ok", "service": "json2docx-server" }
```

## Template engine — docx-templates

This service uses [docx-templates](https://github.com/guigrpa/docx-templates) as its core engine.

Templates use `{` and `}` as command delimiters. Any `{variableName}` in the DOCX will be replaced by the corresponding key from the JSON data.

Example template content:
```
Client: {clientName}
Company: {company}
Date: {date}
```

With JSON `{"clientName": "John", "company": "Acme", "date": "2026-02-20"}`, produces:
```
Client: John
Company: Acme
Date: 2026-02-20
```

### Supported commands

Beyond simple variable insertion, docx-templates supports the following commands inside `{...}` delimiters:

| Command | Description |
|---------|-------------|
| `INS` / `=` | Insert the result of a JavaScript expression |
| `EXEC` / `!` | Execute JavaScript without inserting output (define vars, helpers) |
| `FOR` / `END-FOR` | Loop over arrays — works with table rows, paragraphs, nested loops |
| `IF` / `END-IF` | Conditional content based on a JavaScript expression |
| `IMAGE` | Insert an image dynamically from data |
| `LINK` | Insert a hyperlink dynamically |
| `HTML` | Insert HTML content converted to DOCX formatting |
| `ALIAS` | Define custom command aliases for reuse |

Full syntax reference: [docx-templates — Supported commands](https://github.com/guigrpa/docx-templates?tab=readme-ov-file#supported-commands)

## Tests

Tests are self-contained — they start the server on a random port, run all assertions, then shut down.

```bash
npm test
```

This runs 5 test scenarios (20 assertions):
1. Health check
2. Successful conversion — verifies HTTP response, headers, and that template variables are replaced in the output DOCX
3. Error handling — missing `data` field
4. Error handling — invalid JSON
5. Error handling — missing template file

The generated DOCX is saved to `tests/output/result.docx` for manual inspection.

### Regenerate the test template

```bash
npm run create-template
```

This creates `tests/fixtures/template.docx` from `tests/create-template.js`.

## Project structure

```
json2docx-server-srv/
├── server.js               # Express entry point
├── lib/
│   ├── routes.js           # POST /js2docx route + multer upload
│   └── converter.js        # docx-templates conversion logic
├── tests/
│   ├── test.js             # Test suite
│   ├── create-template.js  # Template generator script
│   ├── fixtures/
│   │   ├── template.docx   # Test template
│   │   └── data.json       # Test data
│   └── output/             # Generated test results
├── package.json
├── ecosystem.config.js     # PM2 configuration
├── Makefile
├── Procfile
├── .nvmrc                  # Node 22
└── .env.example
```

## Dependencies

| Package         | Purpose                        |
|-----------------|--------------------------------|
| express         | HTTP server                    |
| multer          | Multipart file upload handling |
| docx-templates  | DOCX template engine           |
| cors            | Cross-origin requests          |
| dotenv          | Environment variable loading   |
