const { randomUUID } = require('node:crypto');
const AppError = require('../errors/AppError');

// Remove campos internos (ex.: storageName) antes de expor o documento.
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
        // Evita arquivo órfão quando o registro dos metadados falha.
        await fileStorageRepository.remove(storageName).catch(() => {});
        throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
      }

      return toPublicDocument(document);
    },

    listDocuments() {
      // Invertida antes da ordenação estável para que, no mesmo milissegundo, o mais recente venha primeiro.
      return documentRepository
        .findAll()
        .reverse()
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
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
