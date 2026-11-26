const fs = require('node:fs/promises');
const path = require('node:path');

// Operações locais sobre os arquivos em storageDir. Recebe apenas nomes físicos
// gerados pelo servidor, nunca nomes informados pelo cliente.
function createFileStorageRepository(storageDir) {
  const getFilePath = (storageName) => path.join(storageDir, storageName);

  return {
    getFilePath,
    async exists(storageName) {
      try {
        await fs.access(getFilePath(storageName));
        return true;
      } catch {
        return false;
      }
    },
    remove(storageName) {
      return fs.rm(getFilePath(storageName), { force: true });
    },
  };
}

module.exports = { createFileStorageRepository };
