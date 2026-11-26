const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '10';

const app = require('../src/app');
const { createFileStorageRepository } = require('../src/repositories/fileStorageRepository');

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

  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.originalName, 'relatorio.txt');
  assert.equal(body.size, 3);
  assert.equal(body.owner, null);
  assert.ok(body.id);
  assert.ok(!('storageName' in body));
  assert.equal(fs.readdirSync(storageDir).length, 1);
});

test('POST /upload sem arquivo responde FILE_REQUIRED', async () => {
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'FILE_REQUIRED');
});

test('POST /upload rejeita campos multipart adicionais', async () => {
  const form = new FormData();
  form.append('unexpected', 'value');
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_UPLOAD');
});

test('POST /upload rejeita multipart malformado como erro de entrada', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=broken' },
    body: '--broken\r\nContent-Disposition: form-data; name="file"; filename="incompleto.txt"\r\n\r\nx',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_UPLOAD');
});

test('POST /upload acima do limite responde 413 sem deixar arquivo parcial', async () => {
  const filesBefore = fs.readdirSync(storageDir).length;
  const response = await uploadFile('grande.bin', 'x'.repeat(11));
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.error.code, 'FILE_TOO_LARGE');
  assert.equal(fs.readdirSync(storageDir).length, filesBefore);
});

test('GET /documents lista os documentos do mais recente para o mais antigo', async () => {
  await uploadFile('primeiro.txt', 'um');
  await uploadFile('segundo.txt', 'dois');

  const response = await fetch(`${baseUrl}/documents`);
  const body = await response.json();
  const names = body.map((document) => document.originalName);

  assert.equal(response.status, 200);
  assert.ok(names.indexOf('segundo.txt') < names.indexOf('primeiro.txt'));
  assert.ok(body.every((document) => !('storageName' in document)));
});

test('GET /documents/:id/download devolve o conteúdo como anexo', async () => {
  const uploaded = await (await uploadFile('contrato.txt', 'conteudo')).json();
  const response = await fetch(`${baseUrl}/documents/${uploaded.id}/download`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'conteudo');
  assert.match(response.headers.get('content-disposition'), /^attachment; filename="contrato\.txt"/);
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
});

test('GET /documents/:id/download responde 404 para id inexistente', async () => {
  const response = await fetch(`${baseUrl}/documents/nao-existe/download`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'DOCUMENT_NOT_FOUND');
});

test('o repositório rejeita nomes físicos que poderiam escapar do storage', () => {
  const repository = createFileStorageRepository(storageDir);

  assert.throws(() => repository.getFilePath('../outside'), /Nome físico de arquivo inválido/);
});