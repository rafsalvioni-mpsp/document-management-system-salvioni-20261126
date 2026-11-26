const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const AppError = require('../errors/AppError');

const FILESYSTEM_ERROR_CODES = new Set(['EACCES', 'EIO', 'ENOENT', 'ENOSPC', 'EPERM', 'EROFS']);

function createUploader({ storageDir, maxFileSizeBytes }) {
  return multer({
    storage: multer.diskStorage({
      destination: storageDir,
      filename: (req, file, callback) => callback(null, randomUUID()),
    }),
    // O Busboy sinaliza o limite ao alcançá-lo; 2 aceita a primeira parte e rejeita a segunda.
    limits: { fileSize: maxFileSizeBytes, files: 1, fields: 0, parts: 2 },
  });
}

function toUploadError(error) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.');
  }

  if (FILESYSTEM_ERROR_CODES.has(error.code)) {
    return new AppError(500, 'UPLOAD_FAILED', 'Não foi possível gravar o arquivo.');
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'FILE_REQUIRED', 'Envie exatamente um arquivo no campo file.');
  }

  return new AppError(400, 'INVALID_UPLOAD', 'Requisição de envio inválida.');
}

function createUploadRateLimiter({ maxRequests, windowMs }) {
  const clients = new Map();

  return (req, res, next) => {
    const now = Date.now();
    for (const [clientIp, client] of clients) {
      if (client.expiresAt <= now) clients.delete(clientIp);
    }

    const client = clients.get(req.ip);
    if (!client || client.expiresAt <= now) {
      clients.set(req.ip, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    client.count += 1;
    if (client.count > maxRequests) {
      res.set('Retry-After', String(Math.ceil((client.expiresAt - now) / 1000)));
      return res.status(429).json({
        error: { code: 'UPLOAD_RATE_LIMITED', message: 'Muitos envios em pouco tempo. Tente novamente.' },
      });
    }

    return next();
  };
}

function createDocumentRouter({ documentController, config }) {
  const router = express.Router();
  const uploader = createUploader(config);
  const uploadRateLimiter = createUploadRateLimiter(config);

  router.post('/upload', uploadRateLimiter, (req, res, next) => {
    uploader.single('file')(req, res, (error) => next(error ? toUploadError(error) : undefined));
  }, documentController.upload);
  router.get('/documents', documentController.list);
  router.get('/documents/:id/download', documentController.download);

  return router;
}

module.exports = { createDocumentRouter, toUploadError };