const path = require('node:path');

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '../../storage');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  storageDir: path.resolve(process.env.STORAGE_DIR || DEFAULT_STORAGE_DIR),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES) || DEFAULT_MAX_FILE_SIZE_BYTES,
};
