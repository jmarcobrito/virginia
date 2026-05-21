# Validação End-to-End — Íris
> Auditoria completa do fluxo CEO → WhatsApp → Backend → Dashboard → Alertas  
> Data: 2026-05-21

---

## 1. ENTRADA: CEO manda PDF no WhatsApp

### N8n captura a mensagem?
**IMPLEMENTADO** — `workflow-1-captura.json` tem webhook no path `whatsapp-incoming`, nó de verificação de mídia, download via Evolution API, switch por tipo (PDF/Imagem/Áudio) e POST para `/api/upload/`.

### Webhook está correto?
**PARCIAL — BUG REAL.**

Em `whatsapp.py:115`, quando cria uma instância nova, o backend registra o webhook assim:
```python
"url": f"{settings.n8n_url}/webhook/whatsapp-incoming",
```
E `config.py:13`:
```python
n8n_url: str = "http://localhost:5678"
```
O problema: a **Evolution API roda dentro do Docker**. De dentro do container, `localhost:5678` aponta para o próprio container da Evolution — não para o N8n. A URL correta seria `http://n8n:5678` (service name da rede Docker) ou `http://host.docker.internal:5678`. O webhook nunca vai ser recebido pelo N8n.

### O arquivo chega no backend?
**IMPLEMENTADO** — o workflow baixa o arquivo da Evolution API e faz multipart POST para `/api/upload/`. O fluxo está correto.

**Porém: BUG CRÍTICO DE ORIGEM.** O N8n envia campos extras `origin=whatsapp` e `whatsapp_message_id` no form (`workflow-1-captura.json:119-123`), mas `upload.py:13` aceita apenas `file: UploadFile = File(...)` — ignora ambos. Todo documento recebido via WhatsApp fica gravado como `origin: "manual"` (hardcoded em `upload.py:77`).

---

## 2. PROCESSAMENTO: Backend recebe o arquivo

### POST /api/upload/ existe?
**IMPLEMENTADO** — `upload.py:12`, montado em `main.py:17` como `/api/upload/`. O fluxo completo de 9 etapas está correto.

### Claude Vision extrai metadados?
**IMPLEMENTADO** — `claude_vision.py` usa `claude-sonnet-4-6`, suporta PDF (`type: "document"`) e imagem (`type: "image"`), retorna JSON com `name`, `type`, `parties`, `value`, `expires_at`, `tags`, `summary`.

### RAG-Anything está indexando?
**PARCIAL — BUG SILENCIOSO.** `rag_service.py:7-10`:
```python
rag = RAGAnything(
    working_dir=settings.rag_working_dir,
    llm_model_func=None,  # configurar com Claude API
)
```
O `llm_model_func=None` faz o RAG falhar ao tentar indexar ou buscar. O `except` em `index_document` engole o erro (`rag_service.py:20-23`), então o upload termina com sucesso, `rag_indexed=True` fica gravado no Supabase — mas o documento **nunca foi realmente indexado**. Busca semântica retorna vazio.

### Supabase recebe os dados?
**IMPLEMENTADO** — `database.py` cria o client correto. `upload.py:87` insere, `upload.py:91` atualiza `rag_indexed`, `upload.py:96` registra na `activity_log`.

---

## 3. SAÍDA: Dashboard mostra o documento

### Frontend usa dados reais ou mock?
**IMPLEMENTADO — dados reais.** `AppContext.tsx:72` chama `api.getAllDocuments()` que bate em `/api/documents/?limit=100` com paginação. Não há mock.

### Endpoints conectados ao frontend?
**IMPLEMENTADO** — `api.ts` cobre todos os endpoints. O `TYPE_MAP` em `api.ts:6-18` mapeia os tipos da API (proper case PT) para os tipos do frontend (snake_case). CORS em `main.py:9` permite `localhost:5173` e `5174`.

### Busca em linguagem natural funciona?
**PARCIAL — busca semântica não é invocada.** `Busca.tsx:17-30` usa `useDocuments()` e faz filtro local em memória com `.filter()`. A função `api.search()` existe em `api.ts:78-82` e chama `/api/search/` com RAG semântico — mas **nenhuma página do frontend a chama**. A busca semântica está implementada no backend mas desconectada do frontend.

Além disso, o Status RAG em `Configuracoes.tsx:571` é um badge estático hardcoded como `pending` — nunca é verificado dinamicamente.

---

## 4. ALERTAS: N8n dispara notificação

### Workflow de alertas está configurado?
**IMPLEMENTADO com um bug.** `workflow-2-alertas.json` tem cron `0 8 * * *`, verifica `whatsapp_alerts_enabled`, checa se WhatsApp está conectado, busca docs com `days_to_expire <= 30` direto no Supabase, monta mensagem formatada (🔴 críticos ≤7d / 🟡 atenção ≤30d) e envia via Evolution API.

**BUG**: o último nó tenta `POST /api/activity/` (`workflow-2-alertas.json:168-169`) para registrar a atividade. Mas `activity.py` só tem `GET /` — não há rota POST. Vai retornar 404/405. O alerta é enviado mesmo assim (o nó de atividade é o último), mas a atividade não é registrada no dashboard.

### Toggle do dashboard conectado ao Supabase?
**IMPLEMENTADO** — `AppContext.tsx:36-46` carrega os 4 settings do Supabase na inicialização. `setWhatsappAlertsEnabled` (`AppContext.tsx:49-52`) chama `api.updateSetting('whatsapp_alerts_enabled', val)` que bate em `PATCH /api/settings/{key}`. O N8n lê essa mesma key no Supabase via `GET /api/settings/whatsapp_alerts_enabled`.

---

## Tabela de Status

| Ponto | Status | Arquivo(s) |
|---|---|---|
| N8n captura mensagem WhatsApp | ✅ IMPLEMENTADO | `workflow-1-captura.json` |
| Webhook URL para Docker | ❌ FALTANDO | `config.py:13`, `whatsapp.py:115` |
| Origin "whatsapp" no upload | ❌ FALTANDO | `upload.py:13,77` |
| Claude Vision extrai metadados | ✅ IMPLEMENTADO | `claude_vision.py` |
| RAG-Anything indexando | ⚠️ PARCIAL | `rag_service.py:9` (`llm_model_func=None`) |
| Supabase recebe documentos | ✅ IMPLEMENTADO | `upload.py:87`, `database.py` |
| Frontend usa API real | ✅ IMPLEMENTADO | `AppContext.tsx:72`, `api.ts` |
| Mapeamento de tipos API→frontend | ✅ IMPLEMENTADO | `api.ts:6-18` |
| Busca semântica invocada no frontend | ❌ FALTANDO | `Busca.tsx:17` (usa filtro local) |
| Workflow de alertas N8n | ✅ IMPLEMENTADO | `workflow-2-alertas.json` |
| Toggle alertas → Supabase | ✅ IMPLEMENTADO | `AppContext.tsx:49`, `settings.py:13` |
| POST /api/activity/ para N8n | ❌ FALTANDO | `activity.py` (só tem GET) |

---

## Os 4 bugs que bloqueiam o fluxo completo

### Bug 1 — Webhook URL errada para Docker
**Arquivo:** `config.py:13`  
**Problema:** `n8n_url: "http://localhost:5678"` é usado para registrar o webhook na Evolution API. Como a Evolution API roda dentro do Docker, ela não consegue resolver `localhost` como o host da máquina — o webhook nunca chega ao N8n.  
**Correção:** usar `http://n8n:5678` (service name Docker) ou `http://host.docker.internal:5678` (acessível de dentro do Docker no host).

### Bug 2 — Origin e message_id ignorados no upload
**Arquivo:** `upload.py:13` e `upload.py:77`  
**Problema:** O N8n envia `origin=whatsapp` e `whatsapp_message_id` no multipart form, mas o endpoint aceita apenas `file: UploadFile`. Esses campos são descartados e o documento é salvo com `origin: "manual"` hardcoded.  
**Correção:** adicionar `origin: str = Form("manual")` e `whatsapp_message_id: Optional[str] = Form(None)` como parâmetros do endpoint.

### Bug 3 — RAG sem LLM configurado
**Arquivo:** `rag_service.py:9`  
**Problema:** `RAGAnything(llm_model_func=None)` não consegue processar documentos. O `except` silencia o erro e grava `rag_indexed=True` no banco falsamente. Busca semântica retorna sempre vazio.  
**Correção:** configurar o `llm_model_func` com uma função que chame o Claude via Anthropic SDK.

### Bug 4 — Busca semântica desconectada do frontend
**Arquivo:** `Busca.tsx:17`  
**Problema:** A página usa `useDocuments()` + `.filter()` local. A função `api.search()` (que chama `/api/search/` com RAG) existe em `api.ts:78` mas nunca é invocada.  
**Correção:** substituir o filtro local por uma chamada a `api.search(query)` com debounce, usando o resultado retornado pela API.

### Bug extra — POST /api/activity/ inexistente
**Arquivo:** `activity.py` e `workflow-2-alertas.json:168`  
**Problema:** O workflow de alertas faz `POST /api/activity/` para registrar que o alerta foi enviado, mas a rota só tem GET. O alerta WhatsApp é enviado corretamente, mas a atividade não aparece no dashboard.  
**Correção:** adicionar rota `POST /` em `activity.py` para receber `{ type, text, metadata }`.
