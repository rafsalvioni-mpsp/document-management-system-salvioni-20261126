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
      setSelectedFile(null);
      inputRef.current.value = '';
      onUploaded();
      setFeedback({ type: 'success', message: `“${document.originalName}” enviado com sucesso.` });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker" htmlFor="document-file">
        <span className="file-picker-icon" aria-hidden="true">＋</span>
        <span className="file-picker-copy">
          <strong>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</strong>
          <span>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Selecione um documento do seu dispositivo'}</span>
        </span>
        <span className="file-picker-action">Procurar</span>
      </label>
      <input
        className="visually-hidden"
        id="document-file"
        ref={inputRef}
        type="file"
        disabled={isUploading}
        onChange={(event) => setSelectedFile(event.target.files[0] ?? null)}
      />
      <div className="upload-actions">
        {feedback.message && (
          <p className={`feedback feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            {feedback.message}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando…' : 'Enviar documento'}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}