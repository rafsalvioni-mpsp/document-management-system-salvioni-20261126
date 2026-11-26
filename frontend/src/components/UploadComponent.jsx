import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo antes de enviar.' });
      return;
    }

    setIsUploading(true);
    setFeedback({ type: '', message: '' });
    try {
      const document = await uploadDocument(selectedFile);
      setFeedback({ type: 'success', message: `"${document.originalName}" enviado com sucesso.` });
      setSelectedFile(null);
      inputRef.current.value = '';
      onUploaded();
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="document-file">Arquivo: </label>
      <input
        id="document-file"
        ref={inputRef}
        type="file"
        disabled={isUploading}
        onChange={(event) => setSelectedFile(event.target.files[0] ?? null)}
      />
      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar'}
      </button>
      {feedback.message && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'}>
          <span style={{ color: feedback.type === 'error' ? 'crimson' : 'seagreen' }}>
            {feedback.message}
          </span>
        </p>
      )}
    </form>
  );
}
