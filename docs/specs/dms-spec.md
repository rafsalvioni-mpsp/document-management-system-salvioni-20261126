# Especificação - Document Management System

## 1. Objetivo

Entregar um sistema web mínimo para enviar, listar e baixar documentos armazenados no filesystem local da aplicação, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos conhecidos pelo processo em execução.
- Download de um documento pelo identificador.
- Exibição do nome original, tamanho e data de envio.
- Armazenamento dos arquivos em `backend/storage`, usando Multer com `diskStorage`.
- Acesso à API pelo frontend através do prefixo `/api`, encaminhado pelo proxy do Vite.

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou serviço externo.
- Versionamento, edição, exclusão ou pré-visualização de documentos.
- Autenticação, gestão de contas e isolamento de documentos entre usuários.
- Recuperação dos metadados após reiniciar o processo.
- Restrições de tipo de arquivo no MVP. O limite de tamanho será configurável; o valor padrão deverá ser definido e documentado na implementação.

O campo `owner` é reservado para uma futura evolução com identidade de usuário. No MVP não há identidade autenticada nem garantia de propriedade ou isolamento por usuário.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O cliente pode enviar um único arquivo por requisição `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema valida a presença do arquivo e o limite de tamanho configurado. Não rejeita arquivos somente com base em sua extensão ou tipo MIME no MVP. |
| RF-03 | Em um envio válido, o sistema grava o arquivo localmente com um nome físico gerado pelo servidor, registra seus metadados em memória e responde com HTTP `201`. |
| RF-04 | O cliente pode listar os metadados de todos os documentos registrados no processo atual. A lista é ordenada do mais recente para o mais antigo; sem documentos, retorna uma lista vazia. |
| RF-05 | O cliente pode baixar um documento existente pelo seu identificador. O download é enviado como anexo e usa o nome original como nome sugerido ao cliente. |
| RF-06 | Para um identificador inexistente, ou cujo arquivo não esteja disponível, o sistema responde HTTP `404` sem expor caminhos locais. |
| RF-07 | Erros de entrada e de processamento são retornados em JSON com um código estável e uma mensagem em português. Respostas de erro não incluem stack trace nem detalhes internos do filesystem. |
| RF-08 | O sistema retorna somente metadados públicos na listagem e no resultado do envio; o nome físico e o caminho do armazenamento permanecem internos. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados no filesystem local em `backend/storage`, usando Multer `diskStorage`; não são usados provedores externos. |
| RNF-02 | Os metadados são mantidos em memória. Ao reiniciar o processo, a lista de documentos volta a ficar vazia, mesmo que arquivos enviados anteriormente ainda estejam no filesystem. |
| RNF-03 | A porta HTTP e o limite máximo de upload são configurados por variáveis de ambiente. O nome recomendado para a variável de limite é `MAX_FILE_SIZE_BYTES`; a implementação deve estabelecer e documentar um valor padrão. |
| RNF-04 | O nome físico do arquivo é gerado pelo servidor. O nome original é tratado como dado não confiável e não é usado para construir caminhos no filesystem. |
| RNF-05 | A entrada de identificador não pode ser usada para selecionar caminhos arbitrários. O acesso ao filesystem é feito por referências internas associadas aos metadados. |
| RNF-06 | Caminhos absolutos, nomes físicos, stack traces e detalhes internos de armazenamento não são expostos pela API. |
| RNF-07 | O backend segue a Clean Architecture simples definida no projeto: `routes -> controllers -> services -> repositories`. As dependências apontam para dentro; regras de negócio não dependem de Express ou Multer. |
| RNF-08 | O frontend permanece organizado em componentes React e acessa a API por `fetch` através do prefixo `/api` configurado no Vite. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único, gerado pelo servidor (UUID recomendado). |
| `originalName` | string | Público | Nome informado no envio, preservado para exibição e para o nome sugerido no download. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data e hora do envio em ISO 8601, normalizada para UTC. |
| `owner` | string ou `null` | Público | Identificador do usuário dono quando houver identidade disponível. No MVP sem autenticação, seu valor é `null`; não representa controle de acesso. |
| `storageName` | string | Interno | Nome físico gerado pelo servidor e usado pelo repositório para localizar o arquivo dentro de `backend/storage`. Nunca é retornado pela API. |

Os metadados ficam em memória durante a vida do processo. O arquivo físico pode permanecer após o reinício sem metadados correspondentes; esses arquivos órfãos não são listados nem baixáveis pela API. A limpeza de órfãos não faz parte do MVP.

## 6. Contratos de API

Os caminhos abaixo são os caminhos registrados no backend. O cliente web os chama com o prefixo `/api`; o proxy do Vite remove esse prefixo ao encaminhar a requisição.

### Formato comum de erro

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para uso pelo cliente. `message` é destinada à apresentação em português e não contém detalhes internos.

### `POST /upload`

- **Content-Type:** `multipart/form-data`
- **Entrada:** um arquivo no campo `file`; apenas um arquivo é aceito por requisição.
- **Sucesso:** HTTP `201 Created`, corpo JSON com os metadados públicos do documento criado.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-11-26T14:30:00.000Z",
  "owner": null
}
```

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente ou sem arquivo. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede o limite configurado. |
| `500` | `UPLOAD_FAILED` | Falha inesperada ao gravar o arquivo ou registrar metadados. |

Se o registro dos metadados falhar depois da gravação, o serviço deve tentar remover o arquivo recém-gravado para evitar órfão causado por uma requisição incompleta.

### `GET /documents`

- **Entrada:** sem parâmetros ou corpo.
- **Sucesso:** HTTP `200 OK`, corpo JSON como array de metadados públicos, ordenado por `uploadedAt` decrescente.
- **Sem documentos:** HTTP `200 OK` com `[]`.
- Cada item segue o formato de resposta do upload. Campos internos de armazenamento não são incluídos.
- Não há paginação no MVP.

### `GET /documents/:id/download`

- **Entrada:** identificador do documento no parâmetro `id`.
- **Sucesso:** HTTP `200 OK`, conteúdo binário do arquivo com `Content-Disposition: attachment` e nome original devidamente codificado no cabeçalho.
- **Não encontrado:** HTTP `404 Not Found`, erro JSON `DOCUMENT_NOT_FOUND`, caso o identificador não esteja registrado ou o arquivo não exista.
- **Falha de leitura:** HTTP `500 Internal Server Error`, erro JSON `DOWNLOAD_FAILED`, sem detalhes internos.

## 7. Decisões arquiteturais

- **Routes:** registram os caminhos e o middleware Multer configurado com `diskStorage` em `backend/storage`; após a gravação, delegam aos controllers. O middleware não contém regras de negócio.
- **Controllers:** validam aspectos básicos da entrada HTTP, chamam os serviços e traduzem resultados e erros para status, cabeçalhos e respostas HTTP.
- **Services:** implementam os casos de uso de envio, listagem e download; coordenam validações, repositórios e compensação de gravação em caso de falha.
- **Repositories:** encapsulam o registro de metadados em memória e as operações locais de localizar, ler e remover arquivos. A gravação inicial é feita pelo middleware Multer da rota, configurado com `diskStorage` em `backend/storage`.
- **Composição:** `app.js` monta as rotas e dependências. Camadas internas não importam Express nem recebem objetos de resposta HTTP.
- **Frontend:** componentes React consomem os endpoints com `fetch` e prefixo `/api`, conforme o proxy do Vite.
- **Identidade:** não há autenticação no MVP. `owner` permanece `null`; autorização por proprietário deverá ser projetada junto com a futura autenticação.
- **Persistência:** não adicionar banco de dados nem serviços de armazenamento externos. A perda dos metadados em reinicialização é uma limitação aceita nesta fase.

## 8. Plano de execução

O plano abaixo descreve etapas futuras de desenvolvimento. **Nesta etapa, a única entrega é este documento; não implementar nem alterar arquivos de backend ou frontend.**

1. **Especificação (entrega atual):** revisar e aprovar este documento como fonte dos requisitos e contratos.
2. **Fundação do backend:** definir configuração por ambiente, limite de upload, middleware Multer com `diskStorage` em `backend/storage` e repositórios para metadados em memória e operações locais sobre arquivos.
3. **Casos de uso e API:** implementar upload, listagem e download pelas camadas routes, controllers, services e repositories; incluir tratamento uniforme de erros e remoção compensatória de arquivos em falhas de registro.
4. **Frontend:** integrar os fluxos de envio, listagem e download usando os serviços existentes e os caminhos `/api` do proxy Vite.
5. **Verificação:** cobrir contratos e erros com testes do backend e validar manualmente o fluxo completo de envio, listagem e download; confirmar também comportamento após reinício e limite de tamanho configurado.