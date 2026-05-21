-- Tabela de fila de retry para uploads do WhatsApp que falharam
-- Rodar no Supabase SQL Editor

create table if not exists upload_queue (
  id uuid primary key default uuid_generate_v4(),
  whatsapp_message_id text not null,
  whatsapp_instance text,
  error_reason text,
  retry_count integer default 0,
  processed boolean default false,
  created_at timestamptz default now()
);

-- Índice para buscar pendentes rapidamente
create index if not exists idx_upload_queue_processed on upload_queue(processed);
