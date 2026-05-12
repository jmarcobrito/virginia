# IRIS — Fase 2: Design System + Specs Detalhadas por Página

## Contexto

O projeto Iris já está construído e funcionando com:
- React + Vite + TypeScript + Tailwind CSS
- Dados mockados em src/data/documents.json (20 documentos)
- Páginas: Visão Geral, Documentos, Pendentes, Alertas, Busca, Configurações
- Sidebar fixa com navegação e avatar da Mariana
- Fundo branco (#FFFFFF), sidebar cinza claro (#F8F8F6), accent azul petróleo (#0F6E8C)

**NÃO mude a stack. NÃO mude o tema de cores. NÃO reescreva o que já funciona.**

O objetivo desta fase é **elevar a qualidade visual e completar as specs de cada página** sem quebrar nada que já existe.

---

## 1. Design System — melhorias sem mudar o tema

Adicionar ao CSS global (ou tailwind config) as seguintes variáveis e refinamentos:

```css
:root {
  /* Tipografia */
  --font-mono: 'DM Mono', monospace; /* para números, timestamps, badges de código */

  /* Espaçamento consistente */
  --page-padding: 28px;
  --card-padding: 20px 22px;
  --row-padding: 11px 16px;

  /* Bordas */
  --border-radius-card: 10px;
  --border-radius-badge: 5px;
  --border-radius-btn: 7px;

  /* Sombras sutis */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-modal: 0 20px 60px rgba(0,0,0,0.12);

  /* Status colors — manter os existentes mas padronizar */
  --status-recebido-bg: #F0F0F0;
  --status-recebido-text: #666666;
  --status-revisao-bg: #EBF3FF;
  --status-revisao-text: #0F6E8C;
  --status-pendente-bg: #FFF8E6;
  --status-pendente-text: #916A00;
  --status-assinado-bg: #E8F7EE;
  --status-assinado-text: #1A7A3F;
  --status-arquivado-bg: #F0F0F0;
  --status-arquivado-text: #444444;
}
```

Instalar e importar fonte DM Mono via Google Fonts (junto com DM Sans que já existe):
```
https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap
```

Aplicar DM Mono em: todos os números nos StatCards, timestamps, IDs de documentos, badges de contagem na sidebar.

---

## 2. Componente Badge — padronizar em todo o projeto

Criar/refatorar componente `src/components/Badge.tsx`:

```tsx
type BadgeVariant = 'status' | 'type' | 'urgency'
type StatusKey = 'recebido' | 'em_revisao' | 'pendente_assinatura' | 'assinado' | 'arquivado'

// Status badges: usar as CSS vars definidas acima
// Type badges: fundo neutro #F0F4F8, texto #334155, prefixo de 2 letras (CT, NF, PR, ES, BL, OC, AL, OU)
// Urgency badges: vermelho para < 7 dias, âmbar para 7-30 dias
```

Substituir todos os badges inline espalhados pelo projeto por esse componente.

---

## 3. Página: Visão Geral — refinamentos

**StatCards:**
- Valor principal em DM Mono, 32px, font-weight 300
- Label em uppercase, 10px, letter-spacing 0.08em, color #999
- Ícone no canto superior direito (já existe — manter)
- Adicionar linha de tendência sutil embaixo do valor: ex. "↑ 3 esta semana" em 11px

**Tabela de Documentos Recentes:**
- Header das colunas em uppercase 10px letter-spacing 0.08em
- Hover nas linhas: background #F8F8F6 com transição 0.1s
- Badge de tipo com prefixo 2 letras (CT, NF, etc.)
- Coluna Origem: ícone WhatsApp (verde #25D366) ou ícone Upload para manual
- Linhas clicáveis — ao clicar abre Modal de Detalhes (ver seção 7)

**Feed de Atividade Recente:**
- Dot colorido 6px por tipo de evento:
  - Upload WhatsApp: #25D366
  - Busca realizada: #0F6E8C  
  - Alerta disparado: #E6A84A
  - Mudança de status: #8888A0
- Timestamp em DM Mono 10px
- Máximo 8 itens visíveis, scroll interno

---

## 4. Página: Documentos — completar

**Filtros (topbar):**
- Filtro por Tipo (dropdown com todos os tipos)
- Filtro por Status (dropdown com todos os status)
- Filtro por Período (dropdown: Hoje, Esta semana, Este mês, Todos)
- **Filtro por Origem: WhatsApp / Manual / Todos** ← adicionar este
- Input de busca com ícone Search
- Botão "Limpar filtros" aparece só quando algum filtro está ativo

**Tabela:**
- Colunas: Nome | Tipo | Status | Origem | Data Recebimento | Vencimento | Ações
- Vencimento: se null mostrar "—"; se vencendo em ≤7 dias mostrar em vermelho; se ≤30 dias mostrar em âmbar
- Coluna Ações: ícones Eye + Download + MoreHorizontal (três pontinhos abre mini-menu: "Ver detalhes", "Alterar status", "Arquivar")
- Clique na linha (fora dos ícones de ação) abre Modal de Detalhes
- Ordenação por coluna ao clicar no header (toggle asc/desc) com indicador de seta
- **Paginação:** 10 itens por página, navegação Anterior/Próximo + indicador "Página X de Y"

---

## 5. Página: Pendentes — completar

Dividir em três seções visuais separadas com header de seção:

**"🔴 Urgente — vence em até 7 dias"**
- Border-left 3px solid #E06060
- Background levemente rosado: #FFF5F5
- Badge vermelho com contador de dias restantes em DM Mono

**"🟡 Atenção — vence em 8 a 30 dias"**  
- Border-left 3px solid #E6A84A
- Background levemente âmbar: #FFFBF0
- Badge âmbar com contador de dias restantes

**"📋 Sem prazo definido"**
- Sem destaque especial
- Documentos com status em_revisao ou pendente_assinatura sem dataVencimento

Cada item mostra:
- Nome do documento
- Tipo (badge)
- Data de recebimento
- Resumo em 1 linha (campo resumo do JSON)
- Botão "Marcar como resolvido" → muda status para assinado no state local
- Botão "Ver detalhes" → abre Modal

---

## 6. Página: Alertas — completar

**Toggle WhatsApp no topo:**
- Switch visual (não checkbox nativo) persistido em localStorage
- Quando ativo: fundo verde suave, label "Alertas via WhatsApp ativos"
- Quando inativo: fundo cinza, label "Alertas via WhatsApp desativados"
- Sub-opções (visíveis só quando toggle ativo):
  - Toggle individual: "Documentos vencendo em 30 dias"
  - Toggle individual: "Documentos vencendo em 7 dias"  
  - Toggle individual: "Novos documentos recebidos"
  - Cada sub-toggle também persistido em localStorage

**Lista de alertas:**
- Separados em dois grupos: "Crítico (< 7 dias)" e "Atenção (7-30 dias)"
- Card por alerta com: nome do doc, tipo, dias restantes em DM Mono grande (ex: "3 dias"), botão "Ver documento"
- Contador no header: "4 alertas ativos"

---

## 7. Modal de Detalhes do Documento — criar

Criar componente `src/components/DocumentModal.tsx`.

Acionado ao clicar em qualquer linha de documento em qualquer página.

**Layout:**
- Overlay escuro semi-transparente (rgba(0,0,0,0.4))
- Modal centralizado, largura 560px, border-radius 12px, background branco
- Sombra: var(--shadow-modal)
- Fechar com X no canto ou clique fora

**Conteúdo do modal:**
- Header: nome do documento + badge de status + botão fechar
- Seção Info: grid 2 colunas com Tipo, Origem, Data recebimento, Vencimento, Valor, Tamanho
- Seção Partes: lista das partes envolvidas (campo partes do JSON)
- Seção Tags: badges das tags
- Seção Resumo: texto completo do campo resumo
- Footer com ações: "Alterar status" (dropdown inline) + "Arquivar" + "Download"

**Alterar status no modal:**
- Dropdown com todos os status possíveis
- Ao selecionar novo status, atualiza no state local e fecha o dropdown
- Mudança reflete imediatamente na tabela/lista de onde foi aberto

---

## 8. Página: Configurações — completar

**Seção: Integração WhatsApp**
- Card com status mockado "Conectado" (badge verde) 
- Número: +55 (27) 9xxxx-xxxx
- Botão "Reconectar" (só visual, sem função real)
- Botão "Testar conexão" → mostra toast "Conexão testada com sucesso"

**Seção: Alertas (já existe — manter e sincronizar com página Alertas)**
- Os toggles aqui e na página Alertas devem ler/escrever no mesmo localStorage key

**Seção: Categorias de documentos**
- Lista de todas as categorias existentes (Contrato, Nota Fiscal, Procuração, etc.)
- Botão "Nova categoria" → input inline para adicionar
- Cada categoria tem botão de editar nome (inline) e remover
- Salvo em localStorage

**Seção: Sistema**
- Versão: 1.0.0
- Status RAG: "Em configuração" (badge âmbar)
- Status Supabase: "Não conectado" (badge cinza)
- Status N8n: "Em configuração" (badge âmbar)

---

## 9. Micro-interações globais

Aplicar em todo o projeto:

- **Hover em linhas de tabela:** background #F8F8F6, transition 0.1s
- **Hover em botões:** leve escurecimento, transition 0.15s
- **Hover em itens da sidebar:** background #EFEFED, transition 0.1s
- **Toast de feedback:** componente simples no canto inferior direito para ações como "Status alterado", "Categoria adicionada", "Conexão testada". Aparece por 3s e desaparece. Sem biblioteca externa — implementar simples com useState + setTimeout.
- **Estado vazio elegante:** quando filtros não retornam resultados, mostrar mensagem centralizada com ícone e texto como "Nenhum documento encontrado para esses filtros" — sem usar emojis genéricos.

---

## 10. O que NÃO fazer nesta fase

- NÃO mudar o tema de cores (branco/cinza/azul petróleo)
- NÃO mudar a stack ou instalar bibliotecas de UI externas
- NÃO reescrever páginas que já funcionam — apenas refinar e completar
- NÃO conectar backend real — continuar com dados mockados e localStorage
- NÃO adicionar autenticação
- NÃO mudar a estrutura de pastas existente

---

## Ordem de execução recomendada

1. Adicionar DM Mono + CSS variables ao index.css
2. Criar/refatorar componente Badge.tsx
3. Criar componente DocumentModal.tsx
4. Criar componente Toast.tsx
5. Refinar Visão Geral (StatCards + tabela + atividade)
6. Completar Documentos (filtro origem + ordenação + paginação + modal)
7. Completar Pendentes (3 seções + ações)
8. Completar Alertas (toggles + cards)
9. Completar Configurações (todas as seções)
10. Aplicar micro-interações globais
