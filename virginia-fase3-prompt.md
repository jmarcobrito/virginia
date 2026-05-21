# VIRGINIA — Fase 3: Backend + RAG-Anything + Claude Vision + Supabase

## Contexto do projeto

O VIRGINIA é um sistema de gestão inteligente de documentos para o Grupo Monarca. O frontend (React + Vite + TypeScript + Tailwind) já está construído e funcionando com dados mockados nas fases 1 e 2.

**O objetivo desta fase é substituir os dados mockados por um backend real**, conectar o Supabase como banco de dados, integrar o RAG-Anything como engine de busca semântica, e usar Claude Vision para extração automática de metadados de documentos.

Ao final desta fase, o VIRGINIA vai:
- Receber documentos reais via upload manual no dashboard
- Processar PDFs, imagens e áudios automaticamente
- Extrair metadados com Claude Vision (tipo, partes, valor, vencimento)
- Indexar no RAG-Anything para busca semântica
- Salvar tudo no Supabase
- Servir dados reais para o frontend via API REST

---

## Stack da Fase 3

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.11+ + FastAPI |
| RAG Engine | RAG-Anything (pip install raganything) |
| Extração de metadados | Claude Vision (claude-sonnet-4-6) |
| Banco de dados | Supabase (PostgreSQL) |
| Storage de arquivos | Supabase Storage |
| Transcrição de áudio | Whisper (openai-whisper, local) |
| Frontend | Sem mudanças — apenas trocar chamadas mock por chamadas à API |

---

## Estrutura de pastas do backend

```
VIRGINIA-backend/
├── app/
│   ├── main.py                  ← FastAPI app principal
│   ├── config.py                ← variáveis de ambiente
│   ├── database.py              ← conexão Supabase
│   ├── routers/
│   │   ├── documents.py         ← CRUD de documentos
│   │   ├── search.py            ← busca semântica via RAG
│   │   ├── upload.py            ← upload e processamento
│   │   └── activity.py         ← feed de atividade
│   ├── services/
│   │   ├── claude_vision.py     ← extração de metadados com Claude
│   │   ├── rag_service.py       ← integração RAG-Anything
│   │   ├── audio_service.py     ← transcrição de áudio com Whisper
│   │   └── storage_service.py   ← upload para Supabase Storage
│   └── models/
│       └── document.py          ← modelos Pydantic
├── requirements.txt
├── .env
└── .env.example
```

---

## Schema Supabase — criar essas tabelas

Execute no SQL Editor do Supabase:

```sql
-- Extensão para UUID
create extension if not exists "uuid-ossp";

-- Tabela principal de documentos
create table documents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  status text not null default 'recebido',
  origin text not null default 'manual',
  format text,
  size_bytes bigint,
  file_url text,
  file_path text,
  value numeric(12,2),
  parties text[],
  tags text[],
  summary text,
  raw_text text,
  expires_at date,
  days_to_expire integer,
  whatsapp_message_id text,
  rag_indexed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de atividade
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  text text not null,
  document_id uuid references documents(id) on delete set null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Tabela de configurações
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Inserir configurações padrão
insert into settings (key, value) values
  ('whatsapp_alerts_enabled', 'false'),
  ('alert_30_days', 'true'),
  ('alert_7_days', 'true'),
  ('alert_new_docs', 'false'),
  ('categories', '["Contrato","Nota Fiscal","Procuração","Escritura","Orçamento","Boleto","Áudio","Alvará","Seguro","Certidão","Outro"]');

-- Trigger para updated_at automático
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

-- RLS básico (habilitar depois)
alter table documents enable row level security;
alter table activity_log enable row level security;
alter table settings enable row level security;

-- Policies permissivas para fase 3 (ajustar com auth na fase posterior)
create policy "allow_all_documents" on documents for all using (true);
create policy "allow_all_activity" on activity_log for all using (true);
create policy "allow_all_settings" on settings for all using (true);
```

Criar bucket no Supabase Storage:
- Nome: `VIRGINIA-documents`
- Público: não
- Tamanho máximo: 50MB

---

## requirements.txt do backend

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
supabase==2.7.0
anthropic==0.34.0
raganything==0.1.0
openai-whisper==20231117
python-dotenv==1.0.0
pydantic==2.8.0
pydantic-settings==2.4.0
httpx==0.27.0
aiofiles==24.1.0
Pillow==10.4.0
```

---

## .env.example

```
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Anthropic (Claude Vision)
ANTHROPIC_API_KEY=your_anthropic_key

# RAG-Anything
RAG_WORKING_DIR=./rag_storage

# App
APP_PORT=8000
APP_ENV=development
```

---

## app/config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    anthropic_api_key: str
    rag_working_dir: str = "./rag_storage"
    app_port: int = 8000
    app_env: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## app/main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents, search, upload, activity

app = FastAPI(title="VIRGINIA API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.0.0"}
```

---

## app/services/claude_vision.py

Este é o serviço mais importante da fase 3. Use Claude Vision para extrair metadados estruturados de qualquer documento.

```python
import anthropic
import base64
from pathlib import Path
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

EXTRACTION_PROMPT = """
Analise este documento e extraia as seguintes informações em JSON puro, sem markdown:
{
  "name": "nome descritivo do documento",
  "type": "um de: Contrato, Nota Fiscal, Procuração, Escritura, Orçamento, Boleto, Álvará, Seguro, Certidão, Áudio, Outro",
  "parties": ["lista de partes envolvidas, pessoas ou empresas"],
  "value": 0.00,
  "expires_at": "YYYY-MM-DD ou null",
  "tags": ["tags relevantes"],
  "summary": "resumo em 1-2 frases do conteúdo do documento"
}

Retorne APENAS o JSON. Sem texto adicional, sem markdown, sem explicações.
Se algum campo não estiver claro no documento, use null para datas/valores e lista vazia para arrays.
"""

async def extract_metadata(file_path: str, file_format: str) -> dict:
    """Usa Claude Vision para extrair metadados estruturados do documento."""
    
    with open(file_path, "rb") as f:
        file_data = base64.standard_b64encode(f.read()).decode("utf-8")
    
    # Mapear formato para media_type
    media_types = {
        "PDF": "application/pdf",
        "IMG": "image/jpeg",
        "PNG": "image/png",
        "JPG": "image/jpeg",
    }
    media_type = media_types.get(file_format.upper(), "image/jpeg")
    
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document" if media_type == "application/pdf" else "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": file_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": EXTRACTION_PROMPT
                    }
                ],
            }
        ],
    )
    
    import json
    raw = message.content[0].text.strip()
    return json.loads(raw)
```

---

## app/services/rag_service.py

```python
import os
from raganything import RAGAnything
from app.config import settings

os.makedirs(settings.rag_working_dir, exist_ok=True)

rag = RAGAnything(
    working_dir=settings.rag_working_dir,
    llm_model_func=None,  # configurar com Claude API
)

async def index_document(file_path: str, document_id: str) -> bool:
    """Indexa documento no RAG-Anything para busca semântica futura."""
    try:
        await rag.insert_file(
            file_path=file_path,
            metadata={"document_id": document_id}
        )
        return True
    except Exception as e:
        print(f"Erro ao indexar documento {document_id}: {e}")
        return False

async def semantic_search(query: str, top_k: int = 5) -> list:
    """Busca semântica em linguagem natural."""
    try:
        results = await rag.query(query, mode="hybrid", top_k=top_k)
        return results
    except Exception as e:
        print(f"Erro na busca: {e}")
        return []
```

---

## app/services/audio_service.py

```python
import whisper
import os

model = whisper.load_model("base")  # usar "small" para mais precisão

async def transcribe_audio(file_path: str) -> str:
    """Transcreve áudio para texto usando Whisper local."""
    result = model.transcribe(file_path, language="pt")
    return result["text"]
```

---

## app/routers/upload.py — fluxo completo de upload

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services import claude_vision, rag_service, audio_service, storage_service
from app.database import supabase
import tempfile, os, uuid
from datetime import datetime, date

router = APIRouter()

@router.post("/")
async def upload_document(file: UploadFile = File(...)):
    """
    Fluxo completo de upload:
    1. Salva arquivo temporariamente
    2. Detecta formato
    3. Se áudio: transcreve com Whisper antes
    4. Extrai metadados com Claude Vision
    5. Faz upload para Supabase Storage
    6. Salva metadados no banco
    7. Indexa no RAG-Anything (background)
    8. Registra na activity_log
    """
    
    # 1. Salvar temporariamente
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # 2. Detectar formato
        format_map = {
            ".pdf": "PDF", ".jpg": "IMG", ".jpeg": "IMG",
            ".png": "IMG", ".mp3": "AUD", ".mp4": "AUD",
            ".ogg": "AUD", ".wav": "AUD", ".m4a": "AUD"
        }
        file_format = format_map.get(suffix, "PDF")
        
        # 3. Se áudio: transcrever primeiro
        text_for_rag = None
        if file_format == "AUD":
            text_for_rag = await audio_service.transcribe_audio(tmp_path)
        
        # 4. Extrair metadados com Claude Vision
        metadata = await claude_vision.extract_metadata(tmp_path, file_format)
        
        # 5. Upload para Supabase Storage
        document_id = str(uuid.uuid4())
        file_path = f"{document_id}/{file.filename}"
        file_url = await storage_service.upload_file(tmp_path, file_path)
        
        # 6. Calcular dias para vencer
        days_to_expire = None
        if metadata.get("expires_at"):
            expires = date.fromisoformat(metadata["expires_at"])
            days_to_expire = (expires - date.today()).days
        
        # 7. Salvar no banco
        doc_data = {
            "id": document_id,
            "name": metadata.get("name", file.filename),
            "type": metadata.get("type", "Outro"),
            "status": "recebido",
            "origin": "manual",
            "format": file_format,
            "size_bytes": len(content),
            "file_url": file_url,
            "file_path": file_path,
            "value": metadata.get("value"),
            "parties": metadata.get("parties", []),
            "tags": metadata.get("tags", []),
            "summary": metadata.get("summary", ""),
            "raw_text": text_for_rag,
            "expires_at": metadata.get("expires_at"),
            "days_to_expire": days_to_expire,
        }
        
        result = supabase.table("documents").insert(doc_data).execute()
        
        # 8. Indexar no RAG (não bloqueia a resposta)
        await rag_service.index_document(tmp_path, document_id)
        supabase.table("documents").update({"rag_indexed": True}).eq("id", document_id).execute()
        
        # 9. Registrar atividade
        supabase.table("activity_log").insert({
            "type": "upload",
            "text": f"Documento '{doc_data['name']}' recebido via upload manual",
            "document_id": document_id,
            "metadata": {"format": file_format, "origin": "manual"}
        }).execute()
        
        return {"success": True, "document": doc_data}
    
    finally:
        os.unlink(tmp_path)
```

---

## app/routers/documents.py

```python
from fastapi import APIRouter, Query
from app.database import supabase
from typing import Optional

router = APIRouter()

@router.get("/")
def list_documents(
    type: Optional[str] = None,
    status: Optional[str] = None,
    origin: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    query = supabase.table("documents").select("*").order("created_at", desc=True)
    
    if type and type != "Todos":
        query = query.eq("type", type)
    if status and status != "Todos":
        query = query.eq("status", status)
    if origin and origin != "Todos":
        query = query.eq("origin", origin)
    
    result = query.execute()
    docs = result.data
    
    # Filtro de busca local (RAG semântico vem do router de search)
    if search:
        search_lower = search.lower()
        docs = [d for d in docs if
            search_lower in (d.get("name") or "").lower() or
            search_lower in (d.get("summary") or "").lower() or
            any(search_lower in p.lower() for p in (d.get("parties") or []))
        ]
    
    total = len(docs)
    start = (page - 1) * limit
    paginated = docs[start:start + limit]
    
    return {
        "documents": paginated,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/stats")
def get_stats():
    all_docs = supabase.table("documents").select("status, days_to_expire, created_at").execute().data
    
    from datetime import datetime, timedelta
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    return {
        "total": len(all_docs),
        "pending": len([d for d in all_docs if d["status"] in ["pendente_assinatura", "em_revisao"]]),
        "this_week": len([d for d in all_docs if d["created_at"] >= week_ago]),
        "expiring_soon": len([d for d in all_docs if d.get("days_to_expire") and 0 < d["days_to_expire"] <= 30])
    }

@router.patch("/{document_id}/status")
def update_status(document_id: str, body: dict):
    new_status = body.get("status")
    supabase.table("documents").update({"status": new_status}).eq("id", document_id).execute()
    supabase.table("activity_log").insert({
        "type": "status_change",
        "text": f"Status alterado para '{new_status}'",
        "document_id": document_id
    }).execute()
    return {"success": True}
```

---

## app/routers/search.py

```python
from fastapi import APIRouter
from app.services import rag_service
from app.database import supabase

router = APIRouter()

@router.get("/")
async def search(q: str):
    """
    Busca híbrida:
    1. RAG semântico para documentos indexados
    2. Fallback para busca textual no banco
    """
    if not q or len(q) < 2:
        return {"results": []}
    
    # Tentar RAG primeiro
    rag_results = await rag_service.semantic_search(q, top_k=5)
    
    if rag_results:
        return {"results": rag_results, "mode": "semantic"}
    
    # Fallback: busca textual
    docs = supabase.table("documents").select("*").ilike("name", f"%{q}%").execute().data
    return {"results": docs, "mode": "text"}
```

---

## Integração no frontend — o que mudar

Criar `src/lib/api.ts` no projeto React:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const api = {
  // Documentos
  getDocuments: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetch(`${API_BASE}/api/documents/${qs}`).then(r => r.json())
  },
  
  getStats: () =>
    fetch(`${API_BASE}/api/stats`).then(r => r.json()),
  
  updateStatus: (id: string, status: string) =>
    fetch(`${API_BASE}/api/documents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    }).then(r => r.json()),

  // Upload
  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append("file", file)
    return fetch(`${API_BASE}/api/upload/`, {
      method: "POST",
      body: form
    }).then(r => r.json())
  },

  // Busca semântica
  search: (q: string) =>
    fetch(`${API_BASE}/api/search/?q=${encodeURIComponent(q)}`).then(r => r.json()),

  // Atividade
  getActivity: () =>
    fetch(`${API_BASE}/api/activity/`).then(r => r.json()),
}
```

Substituir em cada página do dashboard: onde estava `import { documents } from "../data/mock"`, passar a chamar `api.getDocuments()` com `useEffect` + `useState`.

Adicionar `VITE_API_URL=http://localhost:8000` no `.env` do frontend.

---

## Como rodar localmente

```bash
# Backend
cd VIRGINIA-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (sem mudança)
cd VIRGINIA-dashboard
npm run dev
```

---

## Ordem de execução desta fase

1. Criar projeto `VIRGINIA-backend/` com a estrutura acima
2. Configurar `.env` com chaves do Supabase e Anthropic
3. Rodar o schema SQL no Supabase
4. Criar bucket `VIRGINIA-documents` no Supabase Storage
5. Implementar `config.py` e `database.py`
6. Implementar `claude_vision.py` e testar extração com um PDF
7. Implementar `storage_service.py`
8. Implementar `upload.py` — fluxo completo
9. Implementar `documents.py` — CRUD e stats
10. Implementar `rag_service.py` e `search.py`
11. Implementar `audio_service.py` (opcional nesta fase)
12. Criar `src/lib/api.ts` no frontend
13. Substituir dados mock por chamadas reais em Overview e Documents
14. Testar upload de um contrato real e verificar extração de metadados

---

## O que NÃO fazer nesta fase

- NÃO implementar integração WhatsApp (fase 4)
- NÃO implementar o agente Claude (fase 5)
- NÃO implementar autenticação de usuários
- NÃO fazer deploy em produção ainda — rodar local
- NÃO mudar nada no visual do dashboard
