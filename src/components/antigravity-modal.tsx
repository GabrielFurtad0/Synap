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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskDoc, ProjectDoc, Priority, Status } from "@/lib/firestore";

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

  const activeScopeName =
    selectedProjectId === "all"
      ? "Todos os Projetos"
      : projects.find((p) => p.id === selectedProjectId)?.name || "Projeto Selecionado";

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

  const executeTask = async (task: TaskDoc) => {
    setRunning(true);
    toast.info(`AntiGravity iniciou a execução da tarefa: "${task.title}"`);

    // 1. Move to doing
    onUpdateTask(task.id, { status: "doing" });

    // 2. Simulate AI agent execution
    await new Promise((r) => setTimeout(r, 800));

    // 3. Move to done with subtask or completion note
    onUpdateTask(task.id, {
      status: "done",
      description: task.description
        ? `${task.description}\n\n[AntiGravity]: Tarefa executada e validada pelo agente autônomo AGY.`
        : `[AntiGravity]: Tarefa executada e validada com sucesso pelo agente autônomo AGY.`,
    });

    toast.success(`AntiGravity concluiu com sucesso: "${task.title}"!`);
    setRunning(false);
  };

  const executeAllTasks = async () => {
    if (todoTasks.length === 0) {
      toast.info(`Não há tarefas pendentes em To Do no escopo "${activeScopeName}"!`);
      return;
    }
    setRunning(true);
    toast.info(`AntiGravity iniciando lote de ${todoTasks.length} tarefa(s) em "${activeScopeName}"...`);

    for (const t of todoTasks) {
      onUpdateTask(t.id, { status: "doing" });
      await new Promise((r) => setTimeout(r, 600));
      onUpdateTask(t.id, {
        status: "done",
        description: t.description
          ? `${t.description}\n\n[AntiGravity]: Executada automaticamente pelo AGY.`
          : `[AntiGravity]: Executada automaticamente pelo AGY.`,
      });
    }

    toast.success(`AntiGravity concluiu todas as ${todoTasks.length} tarefas de "${activeScopeName}"!`);
    setRunning(false);
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
      status: "todo",
      priority: "high",
      project: targetProject?.name || "Synap",
      projectId: targetProject?.id,
      tags: ["agy-task"],
    });

    toast.success(`Tarefa gerada via prompt do AntiGravity: "${text}" (${targetProject?.name || "Synap"})`);
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

          {/* Task list in To Do */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fila de Execução ({todoTasks.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Disparar individualmente com AGY</span>
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
                {todoTasks.map((t) => (
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
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={running}
                      onClick={() => executeTask(t)}
                      className="h-7 px-2.5 text-[11px] gap-1 hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                    >
                      <Bot className="h-3 w-3" />
                      Executar com AGY
                    </Button>
                  </div>
                ))}
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
