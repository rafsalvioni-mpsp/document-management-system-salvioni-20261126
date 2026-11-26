import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';

// Salva o blob no navegador usando o nome original do documento.
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DownloadButton({ document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleClick() {
    setIsDownloading(true);
    setErrorMessage('');
    try {
      const blob = await downloadDocument(document.id);
      saveBlob(blob, document.originalName);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={handleClick} disabled={isDownloading}>
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {errorMessage && (
        <span role="alert" style={{ color: 'crimson', marginLeft: '0.5rem' }}>
          {errorMessage}
        </span>
      )}
    </span>
  );
}
