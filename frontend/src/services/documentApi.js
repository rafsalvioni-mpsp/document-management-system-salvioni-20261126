// Cliente da API do backend. Todas as chamadas usam o prefixo /api, que o proxy do Vite
// remove antes de encaminhar ao backend.
const API_BASE = '/api';
const DEFAULT_ERROR_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.';
const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor.';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? DEFAULT_ERROR_MESSAGE, body?.error?.code);
  }

  return response;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', { method: 'POST', body: formData });
  return response.json();
}

export async function listDocuments() {
  const response = await request('/documents');
  return response.json();
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}
