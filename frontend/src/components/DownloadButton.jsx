import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';

function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function DownloadButton({ document: documentItem }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setErrorMessage('');
    try {
      const blob = await downloadDocument(documentItem.id);
      saveBlob(blob, documentItem.originalName);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="download-cell">
      <button
        className="download-button"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Baixar ${documentItem.originalName}`}
      >
        {isDownloading ? 'Baixando…' : 'Baixar'}
        <span aria-hidden="true">↓</span>
      </button>
      {errorMessage && <span className="download-error" role="alert">{errorMessage}</span>}
    </span>
  );
}