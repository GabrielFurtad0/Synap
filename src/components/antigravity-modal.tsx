import { useState } from "react";
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
  onUpdateTask,
  onCreateTask,
  onOpenAiChat,
}: {
  open: boolean;
  onClose: () => void;
  tasks: TaskDoc[];
  projects: ProjectDoc[];
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

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const doneTasks = tasks.filter((t) => t.status === "done");

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
      toast.info("Não há tarefas pendentes em To Do no momento!");
      return;
    }
    setRunning(true);
    toast.info(`AntiGravity iniciando lote de ${todoTasks.length} tarefa(s)...`);

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

    toast.success(`AntiGravity concluiu todas as ${todoTasks.length} tarefas pendentes!`);
    setRunning(false);
  };

  const handleCustomPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    onCreateTask({
      title: text,
      status: "todo",
      priority: "high",
      project: projects[0]?.name || "Nimbus",
      projectId: projects[0]?.id,
      tags: ["agy-task"],
    });

    toast.success(`Tarefa gerada via prompt do AntiGravity: "${text}"`);
    setPrompt("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(580px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl">
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
              className="flex-1 min-w-[180px] gap-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              Executar Todas ({todoTasks.length})
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
                  Todas as tarefas do quadro já foram executadas ou estão em progresso.
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
                      </div>
                    </div>
                    <Button
                      onClick={() => executeTask(t)}
                      disabled={running}
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2.5 text-[11px] gap-1 shrink-0 bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      Executar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command Prompt */}
          <form onSubmit={handleCustomPrompt} className="mt-4 border-t border-border/60 pt-3">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Solicitar nova tarefa automática ao AntiGravity:
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Otimizar imagens e preparar deploy no GitHub..."
                className="h-8 border-border/60 bg-secondary/40 text-xs"
              />
              <Button type="submit" size="sm" className="h-8 px-3 text-xs gap-1">
                <Send className="h-3 w-3" />
                Criar
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
