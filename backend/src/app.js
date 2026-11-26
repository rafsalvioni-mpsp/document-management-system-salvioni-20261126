const express = require('express');
const config = require('./config');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createFileStorageRepository } = require('./repositories/fileStorageRepository');
const { createDocumentService } = require('./services/documentService');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRouter } = require('./routes/documentRoutes');
const { errorHandler } = require('./controllers/errorHandler');

const app = express();
const documentRepository = createDocumentRepository();
const fileStorageRepository = createFileStorageRepository(config.storageDir);
const documentService = createDocumentService({ documentRepository, fileStorageRepository });
const documentController = createDocumentController({ documentService });

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(createDocumentRouter({ documentController, config }));
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

module.exports = app;
