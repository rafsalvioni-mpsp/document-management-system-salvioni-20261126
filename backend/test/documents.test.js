const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Configuração de ambiente precisa estar definida antes de carregar o app.
const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '10';

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(storageDir, { recursive: true, force: true });
});

function uploadFile(originalName, content) {
  const form = new FormData();
  form.append('file', new Blob([content]), originalName);
  return fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
}

test('POST /upload grava o arquivo e retorna apenas metadados públicos', async () => {
  const response = await uploadFile('relatorio.txt', 'abc');
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  assert.strictEqual(body.originalName, 'relatorio.txt');
  assert.strictEqual(body.size, 3);
  assert.strictEqual(body.owner, null);
  assert.ok(body.id);
  assert.ok(!('storageName' in body), 'storageName é interno e não deve ser exposto');
  assert.strictEqual(fs.readdirSync(storageDir).length, 1);
});

test('POST /upload sem arquivo responde FILE_REQUIRED', async () => {
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });
  const body = await response.json();

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.error.code, 'FILE_REQUIRED');
});

test('POST /upload acima do limite responde FILE_TOO_LARGE e não deixa arquivo parcial', async () => {
  const filesBefore = fs.readdirSync(storageDir).length;
  const response = await uploadFile('grande.bin', 'x'.repeat(11));
  const body = await response.json();

  assert.strictEqual(response.status, 413);
  assert.strictEqual(body.error.code, 'FILE_TOO_LARGE');
  assert.strictEqual(fs.readdirSync(storageDir).length, filesBefore);
});

test('GET /documents lista do mais recente para o mais antigo', async () => {
  await uploadFile('primeiro.txt', 'um');
  await uploadFile('segundo.txt', 'dois');

  const response = await fetch(`${baseUrl}/documents`);
  const body = await response.json();
  const names = body.map((document) => document.originalName);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(names.indexOf('segundo.txt') < names.indexOf('primeiro.txt'), true);
  assert.ok(body.every((document) => !('storageName' in document)));
});

test('GET /documents/:id/download devolve o conteúdo como anexo', async () => {
  const uploaded = await (await uploadFile('contrato.txt', 'conteudo')).json();

  const response = await fetch(`${baseUrl}/documents/${uploaded.id}/download`);
  const content = await response.text();

  assert.strictEqual(response.status, 200);
  assert.strictEqual(content, 'conteudo');
  assert.match(response.headers.get('content-disposition'), /^attachment; filename="contrato\.txt"/);
});

test('GET /documents/:id/download responde 404 para id inexistente', async () => {
  const response = await fetch(`${baseUrl}/documents/nao-existe/download`);
  const body = await response.json();

  assert.strictEqual(response.status, 404);
  assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
});

test('GET /documents/:id/download responde 404 quando o arquivo físico sumiu', async () => {
  await uploadFile('sumiu.txt', 'x');
  const uploaded = (await (await fetch(`${baseUrl}/documents`)).json())[0];
  for (const name of fs.readdirSync(storageDir)) {
    fs.rmSync(path.join(storageDir, name), { force: true });
  }

  const response = await fetch(`${baseUrl}/documents/${uploaded.id}/download`);
  const body = await response.json();

  assert.strictEqual(response.status, 404);
  assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
});
