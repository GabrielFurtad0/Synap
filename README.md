# Nimbus — AI Smart Task Manager

Nimbus é um Web App moderno de produtividade e gerenciamento de tarefas com foco em altíssima performance e design minimalista em dark mode (inspirado em TickTick e Linear).

## 🚀 Tecnologias

* **Framework & Frontend:** TanStack Start (React 19) + Vite + Tailwind CSS
* **Autenticação:** Firebase Auth via Google SSO (`GoogleAuthProvider`)
* **Banco de Dados:** Google Cloud Firestore (em tempo real com isolamento multi-inquilino por `userId`)
* **Drag-and-Drop:** `@dnd-kit/core`
* **Protocolo de IA:** Servidor MCP nativo do Antigravity (AGY) integrado via Firebase Admin SDK
* **Componentes:** Radix UI primitives + Lucide Icons + Sonner + Tailwind Merge

## 📁 Estrutura do Projeto

```text
PTM/
├── .agents/             # Configurações e Skills para o Antigravity (AGY)
├── scripts/
│   ├── nimbus-mcp.mjs   # Servidor MCP oficial do Nimbus para o AGY
│   └── nimbus-cli.mjs   # CLI de terminal para gerenciar tarefas
├── src/
│   ├── components/      # Componentes React (TaskBoard, Modais, Kanban, etc.)
│   ├── lib/             # Firebase SDK, Contextos de Auth e UI, Firestore helpers
│   └── routes/          # Rotas com TanStack Router
├── firestore.rules      # Regras de segurança do Firestore por usuário
└── vite.config.ts       # Configurações de compilação do Vite
```

## 🛠️ Como Rodar Localmente

1. Clone o repositório ou navegue até a pasta:
   ```bash
   cd PTM
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:8080`

## 🤖 Integração com AGY (Antigravity)

O Nimbus expõe ferramentas nativas para o agente AGY através do protocolo MCP:
* `nimbus_list_tasks`: Lista tarefas por coluna e projeto.
* `nimbus_get_task`: Obtém detalhes completos de uma tarefa.
* `nimbus_create_task`: Cria tarefas diretamente no Kanban.
* `nimbus_update_task`: Move status, atualiza dados e anexa observações técnicas do AGY.
