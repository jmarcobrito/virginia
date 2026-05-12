# IRIS — Fase 5: Agente Claude (WhatsApp + Dashboard)

## Contexto do projeto

O Iris já tem todas as fases anteriores funcionando:

- **Fase 1 e 2:** Frontend React + TypeScript + Tailwind com design system completo
- **Fase 3:** Backend FastAPI + Claude Vision + RAG-Anything + Whisper + Supabase
- **Fase 4:** N8n + Evolution API capturando documentos do WhatsApp e enviando alertas

O que falta: o agente de IA que opera nos dois canais ao mesmo tempo.

**Hoje o sistema é passivo** — captura o que o CEO manda, processa e guarda.
**Depois desta fase, o sistema é ativo** — responde perguntas, busca documentos,
sugere ações e orienta a assistente tanto no WhatsApp quanto no dashboard.

O agente usa Claude API como cérebro. O mesmo contexto serve os dois canais.

---

## O que o agente faz

**No WhatsApp (via Evolution API + N8n):**
- Assistente pergunta: "Cadê o contrato da transportadora?" → agente busca e responde com o arquivo
- Assistente pergunta: "Quais boletos vencem essa semana?" → agente consulta e lista
- Assistente pergunta: "Qual o status do contrato X?" → agente informa e sugere ação
- CEO manda arquivo → N8n já processa (fase 4), agente não interfere nesse fluxo

**No Dashboard:**
- Campo de chat lateral com o agente
- Assistente digita em linguagem natural: "mostre contratos pendentes de abril"
- Agente responde em texto E filtra a tabela automaticamente
- Agente sugere ações: "Esse contrato vence em 3 dias. Deseja marcar como revisado?"

---

## Arquitetura do agente

```
[Pergunta da assistente]
  WhatsApp ou Dashboard
         ↓
[Novo endpoint: POST /api/agent/chat]
         ↓
[AgentService]
  1. Receber mensagem + histórico de contexto
  2. Montar system prompt com contexto do Grupo Monarca
  3. Definir tools disponíveis
  4. Chamar Claude API com tool_use
  5. Executar tools se necessário
  6. Retornar resposta final
         ↓
[Resposta para o canal correto]
  WhatsApp → Evolution API
  Dashboard → JSON para o frontend
```

---

## Estrutura de arquivos — adicionar no backend existente

```
iris-backend/
├── app/
│   ├── routers/
│   │   └── agent.py          ← novo router
│   ├── services/
│   │   └── agent_service.py  ← novo serviço central
│   └── tools/
│       ├── __init__.py
│       ├── search_tool.py    ← busca documentos
│       ├── list_tool.py      ← lista com filtros
│       ├── status_tool.py    ← atualiza status
│       └── alert_tool.py     ← consulta alertas
```

---

## app/tools/search_tool.py

```python
from app.services.rag_service import semantic_search
from app.database import supabase

async def search_documents(query: str) -> dict:
    """
    Busca documentos por linguagem natural.
    Usa RAG semântico primeiro, fallback para busca textual.
    Retorna lista de documentos com metadados.
    """
    # Tentar RAG primeiro
    rag_results = await semantic_search(query, top_k=5)
    
    if rag_results:
        return {
            "found": True,
            "mode": "semantic",
            "documents": rag_results
        }
    
    # Fallback textual
    results = supabase.table("documents")\
        .select("id, name, type, status, expires_at, days_to_expire, file_url, summary")\
        .ilike("name", f"%{query}%")\
        .limit(5)\
        .execute()
    
    return {
        "found": len(results.data) > 0,
        "mode": "text",
        "documents": results.data
    }

TOOL_DEFINITION = {
    "name": "search_documents",
    "description": "Busca documentos no sistema Iris por nome, tipo, partes envolvidas ou conteúdo. Use quando a assistente pedir para encontrar um documento específico.",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Termo de busca em linguagem natural. Ex: 'contrato transportadora', 'NF abril 2025', 'procuração Monarca'"
            }
        },
        "required": ["query"]
    }
}
```

---

## app/tools/list_tool.py

```python
from app.database import supabase

async def list_documents(
    type: str = None,
    status: str = None,
    expiring_days: int = None,
    limit: int = 10
) -> dict:
    """
    Lista documentos com filtros específicos.
    Usado para perguntas como 'quais boletos vencem essa semana'.
    """
    query = supabase.table("documents")\
        .select("id, name, type, status, expires_at, days_to_expire, summary")\
        .order("created_at", desc=True)
    
    if type:
        query = query.eq("type", type)
    if status:
        query = query.eq("status", status)
    if expiring_days:
        query = query.lte("days_to_expire", expiring_days).gte("days_to_expire", 0)
    
    results = query.limit(limit).execute()
    
    return {
        "total": len(results.data),
        "documents": results.data
    }

TOOL_DEFINITION = {
    "name": "list_documents",
    "description": "Lista documentos com filtros por tipo, status ou prazo de vencimento. Use para perguntas como 'quais contratos estão pendentes', 'boletos vencendo essa semana', 'documentos em revisão'.",
    "input_schema": {
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "description": "Tipo do documento: Contrato, Nota Fiscal, Procuração, Escritura, Orçamento, Boleto, Álvará, Seguro, Certidão"
            },
            "status": {
                "type": "string",
                "description": "Status: recebido, em_revisao, pendente_assinatura, assinado, arquivado"
            },
            "expiring_days": {
                "type": "integer",
                "description": "Filtrar documentos que vencem nos próximos N dias. Ex: 7 para uma semana, 30 para um mês"
            },
            "limit": {
                "type": "integer",
                "description": "Número máximo de resultados. Padrão: 10"
            }
        }
    }
}
```

---

## app/tools/status_tool.py

```python
from app.database import supabase

async def update_document_status(document_id: str, new_status: str) -> dict:
    """
    Atualiza o status de um documento.
    Usado quando a assistente pede para marcar como assinado, arquivar, etc.
    """
    valid_statuses = ["recebido", "em_revisao", "pendente_assinatura", "assinado", "arquivado"]
    
    if new_status not in valid_statuses:
        return {"success": False, "error": f"Status inválido. Use um de: {valid_statuses}"}
    
    supabase.table("documents").update({"status": new_status}).eq("id", document_id).execute()
    
    supabase.table("activity_log").insert({
        "type": "status_change",
        "text": f"Status alterado para '{new_status}' via agente",
        "document_id": document_id,
        "metadata": {"source": "agent"}
    }).execute()
    
    return {"success": True, "document_id": document_id, "new_status": new_status}

TOOL_DEFINITION = {
    "name": "update_document_status",
    "description": "Atualiza o status de um documento. Use quando a assistente pedir para marcar um documento como assinado, arquivar, colocar em revisão, etc. Sempre confirme com a assistente antes de executar.",
    "input_schema": {
        "type": "object",
        "properties": {
            "document_id": {
                "type": "string",
                "description": "ID UUID do documento a ser atualizado"
            },
            "new_status": {
                "type": "string",
                "description": "Novo status: recebido, em_revisao, pendente_assinatura, assinado, arquivado"
            }
        },
        "required": ["document_id", "new_status"]
    }
}
```

---

## app/tools/alert_tool.py

```python
from app.database import supabase

async def get_alerts(days: int = 30) -> dict:
    """
    Retorna documentos com vencimento próximo.
    """
    results = supabase.table("documents")\
        .select("id, name, type, status, expires_at, days_to_expire")\
        .lte("days_to_expire", days)\
        .gte("days_to_expire", 0)\
        .neq("status", "arquivado")\
        .order("days_to_expire")\
        .execute()
    
    critical = [d for d in results.data if d["days_to_expire"] <= 7]
    attention = [d for d in results.data if 7 < d["days_to_expire"] <= 30]
    
    return {
        "total": len(results.data),
        "critical": critical,
        "attention": attention
    }

TOOL_DEFINITION = {
    "name": "get_alerts",
    "description": "Consulta documentos com vencimento próximo. Use para perguntas como 'o que vence essa semana', 'tem algum contrato crítico', 'quais são os alertas de hoje'.",
    "input_schema": {
        "type": "object",
        "properties": {
            "days": {
                "type": "integer",
                "description": "Janela de dias para verificar. Padrão: 30"
            }
        }
    }
}
```

---

## app/services/agent_service.py

```python
import anthropic
import json
from app.config import settings
from app.tools import search_tool, list_tool, status_tool, alert_tool

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """Você é o Iris, assistente inteligente de gestão de documentos do Grupo Monarca.

Você ajuda Mariana, assistente executiva do CEO, a encontrar, organizar e gerenciar documentos corporativos.

O Grupo Monarca atua em construção, transportes e compra/venda de veículos. 
O CEO envia documentos via WhatsApp sem organização. Seu papel é ajudar Mariana a manter tudo em ordem.

Diretrizes:
- Seja direto e objetivo. Mariana está sempre ocupada.
- Antes de alterar status de qualquer documento, confirme com Mariana.
- Quando encontrar documentos, sempre informe o status atual e se há algum prazo vencendo.
- Se não encontrar um documento, sugira termos alternativos de busca.
- Responda em português brasileiro.
- Quando responder no WhatsApp, use formatação simples (sem markdown complexo).
- Quando responder no dashboard, pode usar listas e formatação.
"""

TOOLS = [
    search_tool.TOOL_DEFINITION,
    list_tool.TOOL_DEFINITION,
    status_tool.TOOL_DEFINITION,
    alert_tool.TOOL_DEFINITION,
]

TOOL_FUNCTIONS = {
    "search_documents": search_tool.search_documents,
    "list_documents": list_tool.list_documents,
    "update_document_status": status_tool.update_document_status,
    "get_alerts": alert_tool.get_alerts,
}

async def chat(
    message: str,
    history: list = None,
    channel: str = "dashboard"
) -> dict:
    """
    Processa mensagem da assistente e retorna resposta do agente.
    
    Args:
        message: Pergunta ou comando da assistente
        history: Histórico da conversa [{role, content}]
        channel: "whatsapp" ou "dashboard"
    
    Returns:
        {
            "response": str,           # resposta em texto
            "tool_used": str,          # tool que foi usada
            "tool_result": dict,       # resultado bruto da tool
            "action": dict             # ação sugerida para o frontend
        }
    """
    
    messages = history or []
    messages.append({"role": "user", "content": message})
    
    # Primeira chamada ao Claude
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages
    )
    
    tool_used = None
    tool_result = None
    action = None
    
    # Processar tool_use se necessário
    if response.stop_reason == "tool_use":
        tool_block = next(b for b in response.content if b.type == "tool_use")
        tool_name = tool_block.name
        tool_input = tool_block.input
        tool_used = tool_name
        
        # Executar a tool
        tool_fn = TOOL_FUNCTIONS.get(tool_name)
        if tool_fn:
            tool_result = await tool_fn(**tool_input)
        
        # Gerar ação para o frontend se aplicável
        if tool_name == "search_documents" and tool_result.get("found"):
            action = {
                "type": "filter_documents",
                "data": tool_result["documents"]
            }
        elif tool_name == "list_documents":
            action = {
                "type": "filter_documents",
                "data": tool_result["documents"]
            }
        
        # Segunda chamada com resultado da tool
        messages.append({"role": "assistant", "content": response.content})
        messages.append({
            "role": "user",
            "content": [{
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": json.dumps(tool_result, ensure_ascii=False)
            }]
        })
        
        final_response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages
        )
        
        text_response = next(
            (b.text for b in final_response.content if hasattr(b, "text")),
            "Pronto."
        )
    else:
        text_response = next(
            (b.text for b in response.content if hasattr(b, "text")),
            "Não entendi. Pode reformular?"
        )
    
    return {
        "response": text_response,
        "tool_used": tool_used,
        "tool_result": tool_result,
        "action": action
    }
```

---

## app/routers/agent.py

```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.agent_service import chat
from app.database import supabase

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list = []
    channel: str = "dashboard"

@router.post("/chat")
async def agent_chat(request: ChatRequest):
    result = await chat(
        message=request.message,
        history=request.history,
        channel=request.channel
    )
    
    # Registrar interação no activity_log
    supabase.table("activity_log").insert({
        "type": "agent_query",
        "text": f"Assistente consultou o agente: \"{request.message[:80]}\"",
        "metadata": {
            "channel": request.channel,
            "tool_used": result.get("tool_used")
        }
    }).execute()
    
    return result
```

Registrar em `main.py`:
```python
from app.routers import agent
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
```

---

## Workflow 3 no N8n — Agente no WhatsApp

Adicionar novo workflow no N8n (separado dos workflows 1 e 2 da fase 4):

**Nó 1 — Webhook trigger**
- Mesmo webhook da fase 4: `/webhook/whatsapp-incoming`
- Adicionar branch: se `$json.message.hasMedia == false` E `$json.message.fromMe == false`
- Ou seja: só mensagens de TEXTO enviadas por outros (não arquivos, não do próprio bot)

**Nó 2 — Verificar se é da assistente**
- IF: `$json.message.pushName` contains "Mariana" OR número da Mariana
- Branch TRUE → continua para o agente
- Branch FALSE → End (ignora mensagens do CEO e outros)

**Nó 3 — Buscar histórico recente**
- HTTP Request GET `http://localhost:8000/api/agent/history/{{ $json.instance }}`
- Retorna últimas 5 trocas da conversa para manter contexto

**Nó 4 — Chamar agente**
- HTTP Request POST `http://localhost:8000/api/agent/chat`
- Body:
```json
{
  "message": "{{ $json.message.text }}",
  "history": "{{ $json.history }}",
  "channel": "whatsapp"
}
```

**Nó 5 — Enviar resposta no WhatsApp**
- HTTP Request POST para Evolution API
- URL: `http://localhost:8080/message/sendText/{{ $env.WHATSAPP_INSTANCE }}`
- Body:
```json
{
  "number": "{{ $json.from }}",
  "text": "{{ $json.response }}"
}
```

**Nó 6 — Se tool foi search/list e encontrou documento com file_url**
- IF: `$json.tool_result.found == true` AND `$json.tool_result.documents[0].file_url != null`
- Branch TRUE → Enviar o arquivo também via Evolution API
```json
{
  "number": "{{ $json.from }}",
  "media": {
    "url": "{{ $json.tool_result.documents[0].file_url }}",
    "caption": "{{ $json.tool_result.documents[0].name }}"
  }
}
```

---

## Histórico de conversa — endpoint adicional no backend

Para o agente ter memória da conversa no WhatsApp, salvar histórico no Supabase:

```sql
create table agent_conversations (
  id uuid primary key default uuid_generate_v4(),
  channel text not null,
  channel_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create index on agent_conversations (channel_id, created_at desc);
```

Adicionar em `app/routers/agent.py`:

```python
@router.get("/history/{channel_id}")
def get_history(channel_id: str, limit: int = 10):
    """Retorna histórico recente da conversa para manter contexto."""
    results = supabase.table("agent_conversations")\
        .select("role, content")\
        .eq("channel_id", channel_id)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
    
    # Retornar em ordem cronológica
    history = list(reversed(results.data))
    return {"history": history}

@router.post("/history/{channel_id}")
def save_history(channel_id: str, body: dict):
    """Salva uma troca de mensagem no histórico."""
    supabase.table("agent_conversations").insert({
        "channel": body.get("channel"),
        "channel_id": channel_id,
        "role": body.get("role"),
        "content": body.get("content")
    }).execute()
    return {"success": True}
```

---

## Chat no Dashboard — componente frontend

Criar `src/components/AgentChat.tsx`:

```typescript
import { useState, useRef, useEffect } from "react"
import { Send, Bot, User } from "lucide-react"
import { api } from "../lib/api"

interface Message {
  role: "user" | "assistant"
  content: string
  action?: { type: string; data: unknown[] }
}

interface AgentChatProps {
  onAction?: (action: { type: string; data: unknown[] }) => void
}

export default function AgentChat({ onAction }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá, Mariana. Como posso ajudar? Pode me pedir para buscar documentos, listar pendentes ou verificar vencimentos."
    }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const result = await api.agentChat(userMessage, history)
      
      const assistantMessage: Message = {
        role: "assistant",
        content: result.response,
        action: result.action
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      if (result.action && onAction) {
        onAction(result.action)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Erro ao processar sua pergunta. Tente novamente."
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-secondary)",
      borderLeft: "1px solid var(--border)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        <Bot size={15} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          Iris — Agente
        </span>
      </div>

      {/* Mensagens */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            gap: 8,
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            alignItems: "flex-start"
          }}>
            <div style={{
              width: 24, height: 24,
              borderRadius: "50%",
              background: msg.role === "user" ? "var(--accent)" : "var(--bg-tertiary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              border: "1px solid var(--border)"
            }}>
              {msg.role === "user"
                ? <User size={12} style={{ color: "#fff" }} />
                : <Bot size={12} style={{ color: "var(--accent)" }} />
              }
            </div>
            <div style={{
              maxWidth: "80%",
              background: msg.role === "user" ? "var(--accent-soft)" : "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: "var(--text-primary)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap"
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "var(--bg-tertiary)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Bot size={12} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{
              fontSize: 11, color: "var(--text-tertiary)",
              fontFamily: "'DM Mono', monospace"
            }}>
              pensando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: 8
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Pergunte algo..."
          style={{
            flex: 1,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif",
            outline: "none"
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            width: 32, height: 32,
            background: input.trim() ? "var(--accent)" : "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s"
          }}
        >
          <Send size={13} style={{ color: input.trim() ? "#fff" : "var(--text-tertiary)" }} />
        </button>
      </div>
    </div>
  )
}
```

---

## Integrar AgentChat nas páginas do dashboard

Em `src/pages/Documents.tsx`, adicionar layout de 2 colunas:

```typescript
import AgentChat from "../components/AgentChat"

// No return do componente:
<div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: "calc(100vh - 57px)" }}>
  <div style={{ overflowY: "auto" }}>
    {/* conteúdo existente da página */}
  </div>
  <AgentChat onAction={(action) => {
    if (action.type === "filter_documents") {
      setDocuments(action.data) // aplica filtro da resposta do agente
    }
  }} />
</div>
```

---

## Adicionar em src/lib/api.ts

```typescript
agentChat: (message: string, history: Array<{role: string, content: string}>) =>
  fetch(`${API_BASE}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, channel: "dashboard" })
  }).then(r => r.json()),
```

---

## Ordem de execução desta fase

1. Criar tabela `agent_conversations` no Supabase
2. Criar pasta `app/tools/` com os 4 arquivos de tools
3. Criar `app/services/agent_service.py`
4. Criar `app/routers/agent.py` com endpoints `/chat` e `/history/{id}`
5. Registrar router em `main.py`
6. Testar via curl: `POST /api/agent/chat` com pergunta simples
7. Testar busca: "quais contratos estão pendentes de assinatura?"
8. Testar busca semântica: "contrato transportadora"
9. Criar `src/components/AgentChat.tsx` no frontend
10. Adicionar `agentChat` em `src/lib/api.ts`
11. Integrar AgentChat na página Documents com `onAction`
12. Adicionar Workflow 3 no N8n — mensagens de texto da Mariana
13. Testar no WhatsApp: Mariana manda "cadê o contrato da transportadora?"
14. Verificar se o bot responde E envia o arquivo se encontrado
15. Testar fluxo completo: Dashboard + WhatsApp com o mesmo agente

---

## O que NÃO fazer nesta fase

- NÃO deixar o agente responder mensagens do CEO — só da Mariana
- NÃO deixar o agente alterar status sem confirmação da assistente
- NÃO implementar autenticação de usuários
- NÃO fazer deploy em produção ainda
- NÃO mudar o visual existente do dashboard — apenas adicionar o chat lateral
- NÃO criar tools que deletem documentos — apenas leitura e atualização de status
