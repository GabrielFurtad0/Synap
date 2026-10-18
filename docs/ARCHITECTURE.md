# Arquitetura do Synap (Neural Task Engine)

O **Synap** é uma plataforma de gerenciamento inteligente de tarefas e Kanban operacional, desenhada para automação autônoma de desenvolvimento em conjunto com o agente de IA **AntiGravity (AGY)**.

---

## 🏛️ Visão Geral dos Componentes

```
┌────────────────────────────────────────────────────────┐
│                   Synap Web UI (Browser)               │
│        TanStack Start + React 19 + Tailwind CSS        │
└───────────────────────────┬────────────────────────────┘
                            │ (Leitura / Gravação em Tempo Real)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Google Cloud Firestore DB                 │
│         - tasks (tarefas com status, checklist, etc)   │
│         - projects (projetos com repoPath local)       │
└──────────────┬───────────────────────────┬─────────────┘
               │ (Fila de execuções)       │ (Ferramentas MCP)
               ▼                           ▼
┌──────────────────────────────┐ ┌───────────────────────┐
│     AntiGravity Worker       │ │   Nimbus MCP Server   │
│   (scripts/agy-worker.mjs)   │ │ (scripts/nimbus-mcp)  │
│                              │ │                       │
│ Executa comandos agy no      │ │ Permite ao agente AGY │
│ repositório local do projeto │ │ manipular tarefas via │
│ (ex: TotalTrigo, PTM, etc.)  │ │ protocolo nativo MCP  │
└──────────────────────────────┘ └───────────────────────┘
```

---

## 📂 Organização dos Diretórios

- **`.agents/`**: Configuração das Skills do AntiGravity (`synap-task-manager`).
- **`archive/`**: Arquivos legados, backups locais e arquivos de exportação compactados (`.zip`), ignorados pelo git.
- **`docs/`**: Documentações gerais do sistema.
  - **`docs/projects/`**: Especificações técnicas, requisitos e histórias geradas para projetos gerenciados.
- **`scripts/`**: Utilitários de linha de comando, serviços em segundo plano e scripts de inicialização:
  - `agy-worker.mjs`: Worker autônomo que monitora a fila do Firestore e aciona o AGY CLI no repositório correspondente.
  - `nimbus-mcp.mjs`: Servidor de ferramentas Model Context Protocol (MCP) para agentes de IA.
  - `nimbus-cli.mjs`: CLI interativa para visualização e atualização de tarefas no terminal.
  - `start-worker.bat`: Launcher em lote exclusivo para o worker autônomo.
  - `start.ps1`: Script PowerShell para inicialização do servidor de desenvolvimento.
- **`src/`**: Código-fonte da aplicação React:
  - `components/`: Componentes visuais do Kanban, modais de tarefas, copiloto de IA e UI primitives (Radix).
  - `lib/`: Contextos de autenticação, preferências de UI e conectores do Firestore/Firebase.
  - `routes/`: Rotas de navegação gerenciadas via `@tanstack/react-router`.
- **`start.bat`**: Atalho principal na raiz para inicialização unificada (Worker + Servidor Web em paralelo).
- **`serviceAccountKey.json`**: Credencial da Conta de Serviço do Firebase Admin SDK (privada e ignorada no git).
- **`.env.example`**: Modelo de variáveis de ambiente.

---

## ⚡ Fluxo de Execução com AntiGravity Worker

1. O usuário clica em **"Executar com AGY"** em um card ou modal no Synap.
2. O status da tarefa no Firestore muda para `in_progress` com a flag `pendingExecution: true` e `executionStatus: "queued"`.
3. O `scripts/agy-worker.mjs` (em execução contínua) detecta a tarefa via listener do Firestore (`onSnapshot`).
4. O Worker identifica o repositório local associado ao projeto da tarefa (`project.repoPath`).
5. O Worker invoca a CLI do AntiGravity (`agy`) com o prompt contextualizado da tarefa e sub-tarefas.
6. Ao finalizar com sucesso, o Worker atualiza a tarefa no Firestore com as notas de execução e move o status para `done`.
