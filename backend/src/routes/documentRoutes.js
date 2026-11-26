const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const AppError = require('../errors/AppError');

// Nome físico gerado pelo servidor: o nome original do cliente não entra no caminho.
function createUploader({ storageDir, maxFileSizeBytes }) {
  const storage = multer.diskStorage({
    destination: storageDir,
    filename: (req, file, callback) => callback(null, randomUUID()),
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });
}

// Converte erros do Multer em erros da API. Erros que não são do Multer vêm da gravação em disco.
function toUploadError(err) {
  if (!(err instanceof multer.MulterError)) {
    return new AppError(500, 'UPLOAD_FAILED', 'Não foi possível gravar o arquivo.');
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'FILE_REQUIRED', 'Envie exatamente um arquivo no campo file.');
  }

  return new AppError(400, 'INVALID_UPLOAD', 'Requisição de envio inválida.');
}

function createDocumentRouter({ documentController, storageDir, maxFileSizeBytes }) {
  const router = express.Router();
  const uploader = createUploader({ storageDir, maxFileSizeBytes });

  const uploadSingleFile = (req, res, next) => {
    uploader.single('file')(req, res, (err) => next(err ? toUploadError(err) : undefined));
  };

  router.post('/upload', uploadSingleFile, documentController.upload);
  router.get('/documents', documentController.list);
  router.get('/documents/:id/download', documentController.download);

  return router;
}

module.exports = { createDocumentRouter };
