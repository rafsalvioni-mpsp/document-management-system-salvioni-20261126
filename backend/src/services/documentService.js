const { randomUUID } = require('node:crypto');
const AppError = require('../errors/AppError');

function toPublicDocument({ id, originalName, size, uploadedAt, owner }) {
  return { id, originalName, size, uploadedAt, owner };
}

function createDocumentService({ documentRepository, fileStorageRepository }) {
  return {
    async registerUpload({ originalName, size, storageName }) {
      const document = {
        id: randomUUID(),
        originalName,
        size,
        uploadedAt: new Date().toISOString(),
        owner: null,
        storageName,
      };

      try {
        documentRepository.save(document);
      } catch {
        await fileStorageRepository.remove(storageName).catch(() => {});
        throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
      }

      return toPublicDocument(document);
    },

    listDocuments() {
      return documentRepository
        .findAll()
        .reverse()
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },

    async getDocumentForDownload(id) {
      const document = documentRepository.findById(id);
      const isAvailable = document && (await fileStorageRepository.exists(document.storageName));

      if (!isAvailable) {
        throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }

      return {
        originalName: document.originalName,
        filePath: fileStorageRepository.getFilePath(document.storageName),
      };
    },
  };
}

module.exports = { createDocumentService };