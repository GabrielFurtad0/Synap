import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Locate service account key
function findServiceAccountKey() {
  const customPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (customPath && fs.existsSync(customPath)) {
    return path.resolve(customPath);
  }

  const defaultPath = path.join(rootDir, "serviceAccountKey.json");
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  const files = fs.readdirSync(rootDir);
  const match = files.find((f) => f.includes("adminsdk") && f.endsWith(".json"));
  if (match) {
    return path.join(rootDir, match);
  }

  return null;
}

const keyPath = findServiceAccountKey();
if (!keyPath) {
  console.error(
    "ERRO: Chave de conta de serviço não encontrada!\n" +
      "Por favor, baixe o arquivo JSON de conta de serviço do Firebase Console e salve como 'serviceAccountKey.json' na raiz do projeto: " +
      rootDir
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || "smart-task-manager-ia",
  });
}

const db = getFirestore();

// Helper to determine the target userId
let cachedUserId = process.env.NIMBUS_USER_ID || null;

async function getUserId() {
  if (cachedUserId) return cachedUserId;

  // Try to find the most recently updated task to extract userId
  const snap = await db.collection("tasks").orderBy("updatedAt", "desc").limit(1).get();
  if (!snap.empty) {
    cachedUserId = snap.docs[0].data().userId;
    return cachedUserId;
  }

  // Fallback: check projects
  const projSnap = await db.collection("projects").limit(1).get();
  if (!projSnap.empty) {
    cachedUserId = projSnap.docs[0].data().userId;
    return cachedUserId;
  }

  return "anonymous";
}

const server = new Server(
  {
    name: "nimbus-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "nimbus_list_tasks",
        description:
          "Lista tarefas do Kanban do Nimbus. Permite filtrar por status ('todo', 'doing', 'done'), projeto ou prioridade.",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["todo", "doing", "done"],
              description: "Filtrar por coluna do Kanban (todo = To Do, doing = In Progress, done = Done)",
            },
            project: {
              type: "string",
              description: "Filtrar por nome do projeto (ex: Inbox, Nimbus Q3, Platform)",
            },
            priority: {
              type: "string",
              enum: ["low", "med", "high"],
              description: "Filtrar por prioridade",
            },
            limit: {
              type: "number",
              description: "Limite máximo de tarefas a retornar (padrão: 50)",
            },
          },
        },
      },
      {
        name: "nimbus_get_task",
        description: "Obtém detalhes completos de uma tarefa específica do Nimbus pelo ID.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID único da tarefa no Firestore",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "nimbus_create_task",
        description:
          "Cria uma nova tarefa no quadro Kanban do Nimbus. Pode incluir descrição, prioridade, tags e subtarefas.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Título da tarefa",
            },
            description: {
              type: "string",
              description: "Descrição detalhada, contexto ou critérios de aceitação",
            },
            status: {
              type: "string",
              enum: ["todo", "doing", "done"],
              description: "Coluna inicial da tarefa (padrão: 'todo')",
            },
            project: {
              type: "string",
              description: "Nome do projeto ao qual a tarefa pertence (padrão: 'Inbox')",
            },
            priority: {
              type: "string",
              enum: ["low", "med", "high"],
              description: "Prioridade da tarefa (padrão: 'med')",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Lista de tags (ex: ['feature', 'backend', 'auth'])",
            },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  done: { type: "boolean" },
                },
                required: ["label"],
              },
              description: "Lista de subtarefas / breakdown do trabalho",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "nimbus_update_task",
        description:
          "Atualiza uma tarefa no Nimbus: move entre colunas ('todo', 'doing', 'done'), edita descrição, anexa observações com timestamp ou atualiza subtarefas.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID da tarefa a ser atualizada",
            },
            status: {
              type: "string",
              enum: ["todo", "doing", "done"],
              description: "Novo status/coluna da tarefa",
            },
            title: {
              type: "string",
              description: "Novo título da tarefa",
            },
            description: {
              type: "string",
              description: "Nova descrição completa da tarefa",
            },
            appendNotes: {
              type: "string",
              description:
                "Adiciona uma observação/nota ao final da descrição atual da tarefa (ideal para o AGY relatar o que fez)",
            },
            priority: {
              type: "string",
              enum: ["low", "med", "high"],
              description: "Nova prioridade",
            },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  done: { type: "boolean" },
                },
                required: ["label"],
              },
              description: "Nova lista de subtarefas atualizada",
            },
            isStarred: {
              type: "boolean",
              description: "Marcar/desmarcar com estrela",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "nimbus_delete_task",
        description: "Remove uma tarefa do Kanban do Nimbus pelo ID.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID da tarefa a ser removida",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "nimbus_list_projects",
        description: "Lista todos os projetos cadastrados no Nimbus.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "nimbus_list_tasks") {
      let query = db.collection("tasks");

      if (args?.status) {
        query = query.where("status", "==", args.status);
      }
      if (args?.project) {
        query = query.where("project", "==", args.project);
      }
      if (args?.priority) {
        query = query.where("priority", "==", args.priority);
      }

      const limit = typeof args?.limit === "number" ? args.limit : 50;
      const snap = await query.limit(limit).get();

      const tasks = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          status: data.status,
          project: data.project,
          priority: data.priority,
          due: data.due,
          tags: data.tags || [],
          subtasksCount: data.subtasks ? data.subtasks.length : 0,
          descriptionSnippet: data.description ? data.description.slice(0, 150) : "",
          isStarred: !!data.isStarred,
        };
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: tasks.length, tasks }, null, 2),
          },
        ],
      };
    }

    if (name === "nimbus_get_task") {
      const doc = await db.collection("tasks").doc(args.taskId).get();
      if (!doc.exists) {
        return {
          content: [{ type: "text", text: `Tarefa com ID '${args.taskId}' não encontrada.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: doc.id, ...doc.data() }, null, 2),
          },
        ],
      };
    }

    if (name === "nimbus_create_task") {
      const userId = await getUserId();
      const payload = {
        userId,
        title: args.title,
        status: args.status || "todo",
        project: args.project || "Inbox",
        priority: args.priority || "med",
        tags: args.tags || [],
        subtasks: (args.subtasks || []).map((s) => ({
          id: s.id || Math.random().toString(36).slice(2, 10),
          label: s.label,
          done: !!s.done,
        })),
        isStarred: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (args.description) {
        payload.description = args.description;
      }

      const ref = await db.collection("tasks").add(payload);
      return {
        content: [
          {
            type: "text",
            text: `Tarefa criada com sucesso! ID: ${ref.id} - Título: "${args.title}" [Status: ${payload.status}]`,
          },
        ],
      };
    }

    if (name === "nimbus_update_task") {
      const ref = db.collection("tasks").doc(args.taskId);
      const doc = await ref.get();
      if (!doc.exists) {
        return {
          content: [{ type: "text", text: `Tarefa com ID '${args.taskId}' não encontrada.` }],
          isError: true,
        };
      }

      const updateData = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (args.status !== undefined) updateData.status = args.status;
      if (args.title !== undefined) updateData.title = args.title;
      if (args.priority !== undefined) updateData.priority = args.priority;
      if (args.isStarred !== undefined) updateData.isStarred = args.isStarred;
      if (args.subtasks !== undefined) {
        updateData.subtasks = args.subtasks.map((s) => ({
          id: s.id || Math.random().toString(36).slice(2, 10),
          label: s.label,
          done: !!s.done,
        }));
      }

      if (args.description !== undefined) {
        updateData.description = args.description;
      }

      if (args.appendNotes) {
        const currentDesc = doc.data()?.description || "";
        const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);
        const noteBlock = `\n\n--- [AGY - ${timestamp}]:\n${args.appendNotes}`;
        updateData.description = currentDesc ? currentDesc + noteBlock : noteBlock.trim();
      }

      await ref.update(updateData);

      return {
        content: [
          {
            type: "text",
            text: `Tarefa '${args.taskId}' atualizada com sucesso! Alterações: ${Object.keys(updateData)
              .filter((k) => k !== "updatedAt")
              .join(", ")}`,
          },
        ],
      };
    }

    if (name === "nimbus_delete_task") {
      await db.collection("tasks").doc(args.taskId).delete();
      return {
        content: [{ type: "text", text: `Tarefa '${args.taskId}' removida com sucesso.` }],
      };
    }

    if (name === "nimbus_list_projects") {
      const snap = await db.collection("projects").get();
      const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: projects.length, projects }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Ferramenta desconhecida: ${name}`);
  } catch (error) {
    return {
      content: [{ type: "text", text: `Erro ao executar ${name}: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
