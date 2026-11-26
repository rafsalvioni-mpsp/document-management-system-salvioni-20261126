import { useEffect, useRef, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const activeListRequest = useRef(null);

  async function refreshDocuments() {
    activeListRequest.current?.abort();
    const controller = new AbortController();
    activeListRequest.current = controller;
    setIsLoading(true);
    setLoadError('');

    try {
      setDocuments(await listDocuments(controller.signal));
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message);
    } finally {
      if (activeListRequest.current === controller) {
        activeListRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    refreshDocuments();
    return () => {
      const controller = activeListRequest.current;
      activeListRequest.current = null;
      controller?.abort();
    };
  }, []);

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="DMS, início">DMS<span>/</span></a>
        <span className="topbar-label">ARQUIVO LOCAL</span>
        <span className={`connection-state${loadError ? ' is-error' : ''}`}>
          <span aria-hidden="true" />
          {isLoading ? 'Conectando…' : loadError ? 'Sem conexão' : 'Sistema disponível'}
        </span>
      </header>

      <div className="content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">DOCUMENTOS</p>
            <h1 id="page-title">Acervo</h1>
          </div>
          <p className="heading-note">Envie, consulte e baixe arquivos armazenados localmente.</p>
        </section>

        <section className="upload-section" aria-labelledby="upload-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ENTRADA</p>
              <h2 id="upload-title">Adicionar documento</h2>
            </div>
            <span className="section-index">01</span>
          </div>
          <UploadComponent onUploaded={refreshDocuments} />
        </section>

        <section className="documents-section" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ARQUIVO</p>
              <h2 id="documents-title">Documentos enviados</h2>
            </div>
            <span className="document-count" aria-label={`${documents.length} documentos`}>
              {String(documents.length).padStart(2, '0')}
            </span>
          </div>
          <DocumentList documents={documents} isLoading={isLoading} error={loadError} onRetry={refreshDocuments} />
        </section>
      </div>
    </main>
  );
}
