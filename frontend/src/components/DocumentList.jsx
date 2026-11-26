import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (isLoading) return <p className="list-state" role="status">Carregando documentos…</p>;

  if (error) {
    return (
      <div className="list-state list-error" role="alert">
        <span>{error}</span>
        <button type="button" className="text-button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return <p className="list-state empty-state">Nenhum documento enviado.</p>;
  }

  return (
    <div className="table-scroll">
      <table className="documents-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col"><span className="visually-hidden">Ação</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((documentItem) => (
            <tr key={documentItem.id}>
              <td className="document-name" title={documentItem.originalName}>{documentItem.originalName}</td>
              <td className="document-size">{formatSize(documentItem.size)}</td>
              <td className="document-date">{dateFormatter.format(new Date(documentItem.uploadedAt))}</td>
              <td className="document-action"><DownloadButton document={documentItem} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}