# VIRGINIA — Fase 4: N8n + WhatsApp Business API

## Contexto do projeto

O VIRGINIA já tem:
- **Fase 1 e 2:** Frontend React + TypeScript + Tailwind funcionando
- **Fase 3:** Backend FastAPI com Claude Vision, RAG-Anything, Whisper e Supabase

O backend já expõe o endpoint `POST /api/upload/` que recebe qualquer arquivo,
extrai metadados com Claude Vision, indexa no RAG e salva no Supabase.

**O objetivo desta fase é conectar o WhatsApp ao backend via N8n.**
O CEO continua mandando tudo no WhatsApp como sempre. O N8n captura,
roteia por tipo de arquivo, e chama o backend existente. Nenhum processamento
novo é criado — o N8n é apenas o orquestrador que liga os pontos.

---

## O que o N8n faz nesta fase

**Workflow 1 — Captura de documentos:**
WhatsApp recebe arquivo → N8n detecta tipo → roteia para o backend → backend processa

**Workflow 2 — Alertas de vencimento:**
Cron diário → consulta Supabase → filtra documentos vencendo → manda WhatsApp

---

## Pré-requisitos antes de começar

1. N8n instalado — usar Docker:
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

2. WhatsApp Business API — usar **Evolution API** (open source, gratuito):
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=your_key \
  atendai/evolution-api:latest
```

3. Expor N8n e Evolution API publicamente para receber webhooks:
- Usar **ngrok** em desenvolvimento: `ngrok http 5678`
- Em produção: Railway ou VPS com domínio

4. Conectar número WhatsApp na Evolution API via QR Code no painel `http://localhost:8080`

---

## Workflow 1 — Captura de documentos via WhatsApp

### Visão do fluxo completo

```
[CEO manda arquivo no WhatsApp]
         ↓
[Evolution API recebe]
         ↓
[Webhook → N8n]
         ↓
[N8n: é documento ou mensagem de texto?]
    ↓ documento        ↓ texto
[Detectar tipo]    [Ignorar por enquanto]
    ↓
[PDF?] → POST /api/upload/ com arquivo
[IMG?] → POST /api/upload/ com arquivo (Claude Vision já faz OCR)
[AUD?] → POST /api/upload/ com arquivo (Whisper já transcreve)
    ↓
[Backend processa — sem mudança na fase 3]
    ↓
[N8n registra sucesso ou erro]
    ↓
[Se erro: salvar em fila de retry]
```

### Nós do Workflow 1 no N8n

**Nó 1 — Webhook trigger**
- Tipo: Webhook
- Método: POST
- URL: `/webhook/whatsapp-incoming`
- Autenticação: Header `x-api-key` com valor da Evolution API

**Nó 2 — Verificar se tem arquivo**
- Tipo: IF
- Condição: `{{ $json.message.hasMedia }}` equals `true`
- Branch TRUE → continua
- Branch FALSE → End (ignora mensagens de texto por enquanto)

**Nó 3 — Baixar arquivo do WhatsApp**
- Tipo: HTTP Request
- Método: GET
- URL: `http://localhost:8080/message/download/{{ $json.instance }}/{{ $json.message.id }}`
- Headers: `apikey: your_evolution_key`
- Response: Binary data

**Nó 4 — Detectar tipo de arquivo**
- Tipo: Switch
- Baseado em: `{{ $json.message.mimetype }}`
- Cases:
  - `application/pdf` → Branch PDF
  - `image/jpeg`, `image/png`, `image/webp` → Branch IMG
  - `audio/ogg`, `audio/mpeg`, `audio/mp4` → Branch AUD
  - Default → Branch Outro

**Nó 5A/5B/5C — Upload para o backend** (um por branch, mesma configuração)
- Tipo: HTTP Request
- Método: POST
- URL: `http://localhost:8000/api/upload/`
- Body: Form-Data
  - `file`: Binary data do nó 3
  - `origin`: `whatsapp`
  - `whatsapp_message_id`: `{{ $json.message.id }}`

**Nó 6 — Verificar resposta**
- Tipo: IF
- Condição: `{{ $json.success }}` equals `true`
- Branch TRUE → End (sucesso)
- Branch FALSE → Nó 7

**Nó 7 — Fila de retry (erro)**
- Tipo: Supabase node (ou HTTP Request para o Supabase REST API)
- Operação: INSERT na tabela `upload_queue`
- Dados: message_id, instance, timestamp, error_reason
- Propósito: garantir que nenhum documento se perde se o backend estiver fora

**Nó 8 — Notificar erro (opcional)**
- Tipo: Evolution API — Send Message
- Para: número da assistente Mariana
- Mensagem: "⚠️ Erro ao processar documento. Será reprocessado automaticamente."

---

## Tabela de fila de retry — adicionar no Supabase

```sql
create table upload_queue (
  id uuid primary key default uuid_generate_v4(),
  whatsapp_message_id text not null,
  whatsapp_instance text,
  error_reason text,
  retry_count integer default 0,
  processed boolean default false,
  created_at timestamptz default now()
);
```

---

## Workflow 2 — Alertas automáticos de vencimento

### Visão do fluxo

```
[Cron: todo dia às 08:00]
         ↓
[Consultar Supabase: documentos com days_to_expire <= 30]
         ↓
[Filtrar: <= 7 dias → crítico | 8-30 dias → atenção]
         ↓
[Verificar se alerta WhatsApp está ativo no settings]
         ↓
[Para cada documento: montar mensagem]
         ↓
[Enviar WhatsApp para número da assistente]
         ↓
[Registrar alerta enviado no activity_log]
```

### Nós do Workflow 2 no N8n

**Nó 1 — Schedule trigger**
- Tipo: Schedule
- Cron: `0 8 * * *` (todo dia às 8h)

**Nó 2 — Verificar se alertas estão ativos**
- Tipo: HTTP Request
- Método: GET
- URL: `http://localhost:8000/api/settings/whatsapp_alerts_enabled`
- IF result == false → End

**Nó 3 — Buscar documentos vencendo**
- Tipo: HTTP Request
- URL: `{{ $env.SUPABASE_URL }}/rest/v1/documents?days_to_expire=lte.30&days_to_expire=gte.1&status=neq.arquivado`
- Headers:
  - `apikey: {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Authorization: Bearer {{ $env.SUPABASE_SERVICE_KEY }}`

**Nó 4 — Separar críticos e atenção**
- Tipo: Split In Batches ou Code node
- Críticos: `days_to_expire <= 7`
- Atenção: `days_to_expire > 7`

**Nó 5 — Montar mensagem**
- Tipo: Code (JavaScript)
```javascript
const docs = $input.all();
const criticos = docs.filter(d => d.json.days_to_expire <= 7);
const atencao = docs.filter(d => d.json.days_to_expire > 7);

let msg = "📋 *VIRGINIA — Alertas do dia*\n\n";

if (criticos.length > 0) {
  msg += "🔴 *CRÍTICO — Vence em até 7 dias:*\n";
  criticos.forEach(d => {
    msg += `• ${d.json.name} — *${d.json.days_to_expire} dias*\n`;
  });
  msg += "\n";
}

if (atencao.length > 0) {
  msg += "🟡 *ATENÇÃO — Vence em até 30 dias:*\n";
  atencao.forEach(d => {
    msg += `• ${d.json.name} — ${d.json.days_to_expire} dias\n`;
  });
}

return [{ json: { message: msg, total: docs.length } }];
```

**Nó 6 — Enviar WhatsApp**
- Tipo: HTTP Request para Evolution API
- Método: POST
- URL: `http://localhost:8080/message/sendText/{{ $env.WHATSAPP_INSTANCE }}`
- Headers: `apikey: your_evolution_key`
- Body:
```json
{
  "number": "{{ $env.ALERT_PHONE_NUMBER }}",
  "text": "{{ $json.message }}"
}
```

**Nó 7 — Registrar no activity_log**
- Tipo: HTTP Request
- Método: POST
- URL: `http://localhost:8000/api/activity/`
- Body:
```json
{
  "type": "alert",
  "text": "Alertas de vencimento enviados via WhatsApp ({{ $json.total }} documentos)",
  "metadata": { "source": "n8n_cron" }
}
```

---

## Variáveis de ambiente do N8n

Configurar em Settings → Environment Variables no painel N8n:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
VIRGINIA_BACKEND_URL=http://localhost:8000
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your_evolution_key
WHATSAPP_INSTANCE=monarca
ALERT_PHONE_NUMBER=5527999999999
```

---

## Endpoint adicional no backend (fase 3) — adicionar

Adicionar em `app/routers/documents.py`:

```python
@router.patch("/{document_id}")
def update_document(document_id: str, body: dict):
    """Permite N8n atualizar origem e whatsapp_message_id após upload."""
    allowed_fields = ["status", "origin", "whatsapp_message_id"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    supabase.table("documents").update(update_data).eq("id", document_id).execute()
    return {"success": True}
```

Adicionar em `app/routers/` novo arquivo `settings.py`:

```python
from fastapi import APIRouter
from app.database import supabase

router = APIRouter()

@router.get("/{key}")
def get_setting(key: str):
    result = supabase.table("settings").select("value").eq("key", key).single().execute()
    return result.data

@router.patch("/{key}")
def update_setting(key: str, body: dict):
    supabase.table("settings").update({"value": body.get("value")}).eq("key", key).execute()
    return {"success": True}
```

Registrar em `main.py`:
```python
from app.routers import settings
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
```

---

## Conectar toggle do dashboard ao Supabase

Na página de Configurações do frontend (fase 2), os toggles de alerta
estavam salvando em localStorage. Nesta fase, substituir por chamadas à API:

```typescript
// Ao mudar toggle de alerta WhatsApp
const toggleAlert = async (enabled: boolean) => {
  await api.updateSetting("whatsapp_alerts_enabled", enabled)
}

// Ao carregar a página
const loadSettings = async () => {
  const result = await api.getSetting("whatsapp_alerts_enabled")
  setAlertEnabled(result.value)
}
```

Adicionar em `src/lib/api.ts`:
```typescript
getSetting: (key: string) =>
  fetch(`${API_BASE}/api/settings/${key}`).then(r => r.json()),

updateSetting: (key: string, value: unknown) =>
  fetch(`${API_BASE}/api/settings/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  }).then(r => r.json()),
```

---

## Ordem de execução desta fase

1. Subir Evolution API via Docker e conectar número WhatsApp via QR Code
2. Subir N8n via Docker
3. Expor ambos com ngrok para receber webhooks
4. Adicionar endpoint `/api/settings/` no backend (fase 3)
5. Adicionar tabela `upload_queue` no Supabase
6. Configurar variáveis de ambiente no N8n
7. Criar Workflow 1 — captura de documentos nó por nó
8. Testar: CEO manda PDF no WhatsApp → verificar se aparece no dashboard
9. Criar Workflow 2 — alertas de vencimento
10. Testar: forçar execução manual do cron e verificar mensagem no WhatsApp
11. Substituir localStorage dos toggles por chamadas à API no frontend
12. Testar fluxo completo: documento → WhatsApp → N8n → backend → dashboard

---

## O que NÃO fazer nesta fase

- NÃO implementar o agente Claude no WhatsApp (fase 5)
- NÃO responder mensagens de texto do CEO — só processar arquivos
- NÃO implementar autenticação
- NÃO fazer deploy em produção — continuar local com ngrok
- NÃO mudar nada no visual do dashboard
- NÃO reprocessar documentos que já estão no banco da fase 3
