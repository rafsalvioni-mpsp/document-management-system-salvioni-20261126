function createDocumentRepository() {
  const documents = new Map();

  return {
    save(document) {
      documents.set(document.id, document);
      return document;
    },
    findById(id) {
      return documents.get(id) ?? null;
    },
    findAll() {
      return [...documents.values()];
    },
  };
}

module.exports = { createDocumentRepository };