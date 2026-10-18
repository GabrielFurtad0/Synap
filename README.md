# Synap — Neural Task Engine (Smart Task Manager)

Synap é um Web App moderno de produtividade e gerenciamento de tarefas de alta performance com design minimalista em dark mode (inspirado em Linear e TickTick), integrado ao motor de inteligência autônoma **AntiGravity (AGY)**.

---

## 🚀 Tecnologias

* **Framework & Frontend:** TanStack Start (React 19) + Vite + Tailwind CSS
* **Autenticação:** Firebase Auth via Google SSO (`GoogleAuthProvider`)
* **Banco de Dados:** Google Cloud Firestore (em tempo real com isolamento multi-inquilino por `userId`)
* **Drag-and-Drop:** `@dnd-kit/core`
* **Protocolo de IA:** Servidor MCP nativo do Antigravity (AGY) integrado via Firebase Admin SDK
* **Automação Autônoma:** Worker Node.js em segundo plano que executa comandos do AGY nos repositórios locais configurados por projeto
* **Componentes:** Radix UI primitives + Lucide Icons + Sonner + Tailwind Merge

---

## 📁 Estrutura do Projeto

```text
PTM/
├── .agents/                 # Configurações e Skills para o agente AntiGravity (AGY)
├── archive/                 # Arquivos legados e backups locais (.zip ignorados no git)
├── docs/                    # Documentação do projeto
│   ├── ARCHITECTURE.md      # Arquitetura completa e fluxo do Worker
│   └── projects/            # Documentos e requisitos de projetos vinculados ao Synap
├── scripts/                 # Scripts utilitários, servidores MCP e workers
│   ├── agy-worker.mjs       # Worker autônomo em background (execução das tarefas AGY)
│   ├── nimbus-mcp.mjs       # Servidor MCP oficial para integração com o AGY
│   ├── nimbus-cli.mjs       # CLI de terminal para inspecionar tarefas
│   ├── start-worker.bat     # Launcher Windows dedicado para o worker
│   └── start.ps1            # Script de inicialização PowerShell
├── src/
│   ├── components/          # Componentes React (Kanban, Modais, Copiloto IA, UI Radix)
│   ├── lib/                 # Conectores Firebase, contextos de Auth e preferências
│   └── routes/              # Rotas da aplicação gerenciadas pelo TanStack Router
├── .env.example             # Modelo documentado de variáveis de ambiente
├── firestore.rules          # Regras de segurança do Firestore por usuário
├── package.json             # Dependências e scripts npm
├── serviceAccountKey.json   # Chave de serviço Firebase Admin (privada e ignorada no git)
├── start.bat                # Inicializador 1-clique (Worker + Dev Server na porta 8090)
└── vite.config.ts           # Configuração de build do Vite
```

---

## 🛠️ Como Rodar Localmente

### Opção 1: Inicialização em 1 Clique (Windows)
Dê um duplo clique no arquivo [`start.bat`](file:///c:/Users/PC-Gabriel/OneDrive%20-%20SPTech%20School/Projetos/PTM/start.bat) na raiz do projeto. Ele iniciará automaticamente:
1. O **AntiGravity Worker** em uma janela paralela.
2. O **Servidor Web Synap** na porta `http://localhost:8090`.

### Opção 2: Linha de Comando (Terminal)

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Certifique-se de que a credencial `serviceAccountKey.json` está na raiz do projeto (consulte [`.env.example`](file:///c:/Users/PC-Gabriel/OneDrive%20-%20SPTech%20School/Projetos/PTM/.env.example)).

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:8090`

4. (Opcional) Inicie o worker autônomo em outro terminal:
   ```bash
   npm run worker
   ```

---

## 🤖 Integração com AGY (Antigravity)

O Synap disponibiliza ferramentas nativas para o agente AGY via protocolo MCP:
* `nimbus_list_tasks`: Lista tarefas por status, prioridade e projeto.
* `nimbus_get_task`: Obtém detalhes completos, checklist e notas técnicas de uma tarefa.
* `nimbus_create_task`: Cria tarefas diretamente nas colunas do Kanban.
* `nimbus_update_task`: Move status, atualiza progresso e anexa observações técnicas do agente.
