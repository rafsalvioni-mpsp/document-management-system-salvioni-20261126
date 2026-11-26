const AppError = require('../errors/AppError');

function createDocumentController({ documentService }) {
  return {
    async upload(req, res) {
      if (!req.file) {
        throw new AppError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
      }

      const document = await documentService.registerUpload({
        originalName: req.file.originalname,
        size: req.file.size,
        storageName: req.file.filename,
      });

      res.status(201).json(document);
    },

    list(req, res) {
      res.json(documentService.listDocuments());
    },

    async download(req, res, next) {
      const { originalName, filePath } = await documentService.getDocumentForDownload(req.params.id);

      res.attachment(originalName);
      res.set('Content-Type', 'application/octet-stream');
      res.sendFile(filePath, (error) => {
        if (error) {
          next(new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
        }
      });
    },
  };
}

module.exports = { createDocumentController };