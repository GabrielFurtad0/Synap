import { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Sparkles,
  Bot,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Send,
  X,
  RefreshCw,
  Cpu,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskDoc, ProjectDoc, Priority, Status, ExecutionStatus } from "@/lib/firestore";

export function AntiGravityModal({
  open,
  onClose,
  tasks,
  projects,
  currentProjectId,
  onUpdateTask,
  onCreateTask,
  onOpenAiChat,
}: {
  open: boolean;
  onClose: () => void;
  tasks: TaskDoc[];
  projects: ProjectDoc[];
  currentProjectId?: string | null;
  onUpdateTask: (id: string, patch: Partial<TaskDoc>) => void;
  onCreateTask: (task: {
    title: string;
    description?: string;
    status: Status;
    priority: Priority;
    project: string;
    projectId?: string;
    tags: string[];
    assignedTo?: string;
    executionRequested?: boolean;
    executionStatus?: ExecutionStatus;
    executionLog?: string;
  }) => void;
  onOpenAiChat?: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">(
    currentProjectId || "all"
  );

  useEffect(() => {
    if (open) {
      setSelectedProjectId(currentProjectId || "all");
    }
  }, [open, currentProjectId]);

  const selectedProject =
    selectedProjectId === "all"
      ? null
      : projects.find((p) => p.id === selectedProjectId) || null;

  const activeScopeName =
    selectedProject ? selectedProject.name : "Todos os Projetos";

  const scopedTasks =
    selectedProjectId === "all"
      ? tasks
      : tasks.filter(
          (t) =>
            t.projectId === selectedProjectId ||
            t.project === projects.find((p) => p.id === selectedProjectId)?.name
        );

  const todoTasks = scopedTasks.filter((t) => t.status === "todo");
  const doingTasks = scopedTasks.filter((t) => t.status === "doing");
  const doneTasks = scopedTasks.filter((t) => t.status === "done");

  const activeWorkerTasks = scopedTasks.filter(
    (t) => t.executionRequested || t.executionStatus === "running" || t.executionStatus === "queued"
  );

  const executeTask = (task: TaskDoc) => {
    const nowStr = new Date().toLocaleTimeString();
    onUpdateTask(task.id, {
      status: "doing",
      assignedTo: "AntiGravity",
      executionRequested: true,
      executionStatus: "queued",
      executionLog: `[${nowStr}] 🚀 Enviada para a fila de execução autônoma do AntiGravity Worker.`,
    });

    toast.info(`Tarefa enviada para o AntiGravity Worker!`, {
      description: `O worker local executará na pasta: "${task.title}"`,
    });
  };

  const executeAllTasks = () => {
    if (todoTasks.length === 0) {
      toast.info(`Não há tarefas pendentes em To Do no escopo "${activeScopeName}"!`);
      return;
    }
    const nowStr = new Date().toLocaleTimeString();
    toast.info(`Despachando ${todoTasks.length} tarefa(s) para o AntiGravity Worker...`);

    for (const t of todoTasks) {
      onUpdateTask(t.id, {
        status: "doing",
        assignedTo: "AntiGravity",
        executionRequested: true,
        executionStatus: "queued",
        executionLog: `[${nowStr}] 🚀 Enfileirada para o worker do AntiGravity.`,
      });
    }

    toast.success(`${todoTasks.length} tarefa(s) enviadas para a fila de execução real!`);
  };

  const handleCustomPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    const targetProject =
      selectedProjectId === "all"
        ? projects[0]
        : projects.find((p) => p.id === selectedProjectId) || projects[0];

    onCreateTask({
      title: text,
      status: "doing",
      priority: "high",
      project: targetProject?.name || "Synap",
      projectId: targetProject?.id,
      tags: ["agy-task"],
      assignedTo: "AntiGravity",
      executionRequested: true,
      executionStatus: "queued",
      executionLog: `[${new Date().toLocaleTimeString()}] Criada via prompt e despachada para o AntiGravity Worker.`,
    });

    toast.success(`Tarefa criada e enviada para o AntiGravity Worker: "${text}"`);
    setPrompt("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(620px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div
                className="grid h-8 w-8 place-items-center rounded-lg text-background shadow-md"
                style={{ background: "var(--gradient-magic)" }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-foreground">
                    AntiGravity Autonomous Agent
                  </DialogPrimitive.Title>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Motor de execução autônoma integrado ao Cloud Firestore e MCP Tools
                </p>
              </div>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Scope Selector: Todos os Projetos vs Projeto Específico */}
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>Escopo de Execução:</span>
              <span className="text-foreground font-semibold">{activeScopeName}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-secondary/30 p-1">
              <button
                type="button"
                onClick={() => setSelectedProjectId("all")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedProjectId === "all"
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span>🌐 Todos os Projetos</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                  {tasks.filter((t) => t.status === "todo").length}
                </span>
              </button>

              {projects.map((p) => {
                const count = tasks.filter(
                  (t) => (t.projectId === p.id || t.project === p.name) && t.status === "todo"
                ).length;
                const active = selectedProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-card text-foreground border border-primary/50 shadow-sm font-semibold"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", p.color ?? "bg-violet-400")} />
                    <span className="truncate max-w-[120px]">{p.name}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            {selectedProject && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5 text-[11px] mt-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Terminal className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground shrink-0 font-medium">Pasta no PC:</span>
                  {selectedProject.path ? (
                    <span className="font-mono text-foreground truncate select-all" title={selectedProject.path}>
                      {selectedProject.path}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground/80">
                      Caminho local não configurado (edite o projeto para adicionar o caminho)
                    </span>
                  )}
                </div>
                {selectedProject.path && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-400 font-normal shrink-0">
                    Target OK
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Metrics summary */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-center">
              <div className="text-[11px] font-medium text-muted-foreground">To Do (Pendentes)</div>
              <div className="text-xl font-bold text-foreground mt-0.5">{todoTasks.length}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-center">
              <div className="text-[11px] font-medium text-amber-400/90">Em Progresso</div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">{doingTasks.length}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-center">
              <div className="text-[11px] font-medium text-emerald-400/90">Concluídas</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{doneTasks.length}</div>
            </div>
          </div>

          {/* Action triggers */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={executeAllTasks}
              disabled={running || todoTasks.length === 0}
              size="sm"
              className="flex-1 min-w-[200px] gap-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              {selectedProjectId === "all"
                ? `Executar Todas as Tarefas (${todoTasks.length})`
                : `Executar Tarefas de "${activeScopeName}" (${todoTasks.length})`}
            </Button>
            {onOpenAiChat && (
              <Button
                onClick={() => {
                  onClose();
                  onOpenAiChat();
                }}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-border/60 hover:bg-secondary"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Abrir Copiloto IA
              </Button>
            )}
          </div>

          {/* Active Worker Tasks (Tarefas em Execução Real pelo Worker) */}
          {activeWorkerTasks.length > 0 && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  AntiGravity Worker Ativo ({activeWorkerTasks.length})
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] animate-pulse">
                  Worker Conectado
                </Badge>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeWorkerTasks.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border/60 bg-card/90 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">{t.title}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] px-1.5 py-0 shrink-0",
                          t.executionStatus === "running"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-primary/20 text-primary border border-primary/30"
                        )}
                      >
                        {t.executionStatus === "running" ? "⚙️ Processando arquivos..." : "⏳ Na fila"}
                      </Badge>
                    </div>
                    {t.executionLog && (
                      <p className="font-mono text-[10px] text-muted-foreground mt-1 whitespace-pre-line line-clamp-2 bg-secondary/50 p-1.5 rounded border border-border/30">
                        {t.executionLog}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task list in To Do */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fila de Execução ({todoTasks.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Disparar individualmente para o AGY</span>
            </div>

            {todoTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/80 mb-1.5" />
                <p className="text-sm font-medium text-foreground">Fila limpa!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Não há tarefas pendentes em To Do para {activeScopeName}.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto p-1 border border-border/40 rounded-xl bg-secondary/20">
                {todoTasks.map((t) => {
                  const taskProj = projects.find(
                    (p) => p.id === t.projectId || p.name?.toLowerCase() === t.project?.toLowerCase()
                  );
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/80 p-2 text-xs hover:border-border transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{t.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-2.5 w-2.5" /> {t.project}
                          </span>
                          {taskProj?.path && (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[9px] text-muted-foreground bg-secondary/70 px-1.5 py-0.5 rounded border border-border/40"
                              title={`Diretório alvo: ${taskProj.path}`}
                            >
                              <Terminal className="h-2.5 w-2.5 text-primary" />
                              {taskProj.path.split(/[/\\]/).filter(Boolean).pop()}
                            </span>
                          )}
                          {t.priority && (
                            <span
                              className={cn(
                                "font-medium",
                                t.priority === "high"
                                  ? "text-rose-400"
                                  : t.priority === "med"
                                  ? "text-amber-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              • Prioridade {t.priority}
                            </span>
                          )}
                          {t.due && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" /> {t.due}
                            </span>
                          )}
                        </div>
                      </div>
                      {t.executionStatus === "running" ? (
                        <Badge variant="outline" className="h-7 px-2.5 text-[11px] gap-1 border-amber-500/50 text-amber-400 bg-amber-500/10 shrink-0">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Executando...
                        </Badge>
                      ) : t.executionRequested ? (
                        <Badge variant="outline" className="h-7 px-2.5 text-[11px] gap-1 border-primary/50 text-primary bg-primary/10 shrink-0">
                          <Clock className="h-3 w-3" />
                          Na Fila
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => executeTask(t)}
                          className="h-7 px-2.5 text-[11px] gap-1 hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                        >
                          <Bot className="h-3 w-3" />
                          Executar com AGY
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick delegate input */}
          <div className="mt-5 border-t border-border/40 pt-4">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Delegar Nova Tarefa para o AntiGravity
            </span>
            <form onSubmit={handleCustomPrompt} className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Descreva a tarefa para o AGY criar em "${activeScopeName}"…`}
                className="h-9 border-border/60 bg-secondary/40 text-xs"
              />
              <Button type="submit" size="sm" className="h-9 px-3 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Send className="h-3 w-3" />
                Delegar
              </Button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
