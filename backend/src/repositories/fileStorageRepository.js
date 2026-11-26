const fs = require('node:fs/promises');
const path = require('node:path');

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function createFileStorageRepository(storageDir) {
  const absoluteStorageDir = path.resolve(storageDir);

  const getFilePath = (storageName) => {
    if (typeof storageName !== 'string' || !UUID_PATTERN.test(storageName)) {
      throw new TypeError('Nome físico de arquivo inválido.');
    }

    const filePath = path.resolve(absoluteStorageDir, storageName);
    const relativePath = path.relative(absoluteStorageDir, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new TypeError('Caminho fora do diretório de armazenamento.');
    }

    return filePath;
  };

  return {
    getFilePath,
    async exists(storageName) {
      const filePath = getFilePath(storageName);
      try {
        await fs.access(filePath);
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