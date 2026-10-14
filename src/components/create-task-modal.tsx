import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, X, Folder, Calendar, Tag, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectDoc, Priority, Status, TaskDoc } from "@/lib/firestore";

export function CreateTaskModal({
  open,
  onClose,
  projects,
  tags,
  defaultStatus = "todo",
  defaultDate,
  defaultProjectId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  projects: ProjectDoc[];
  tags: string[];
  defaultStatus?: Status;
  defaultDate?: string;
  defaultProjectId?: string | null;
  onCreate: (task: {
    title: string;
    description?: string;
    status: Status;
    projectId?: string;
    project: string;
    priority: Priority;
    tags: string[];
    due?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId || projects[0]?.id || ""
  );
  const [priority, setPriority] = useState<Priority>("med");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [due, setDue] = useState<string>(defaultDate || "");
  const [customTag, setCustomTag] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const t = title.trim();
    if (!t) return;

    const proj = projects.find((p) => p.id === projectId);
    const projectName = proj?.name || projects[0]?.name || "Inbox";

    onCreate({
      title: t,
      description: description.trim() || undefined,
      status,
      projectId: proj?.id || projects[0]?.id,
      project: projectName,
      priority,
      tags: selectedTags,
      due: due || undefined,
    });

    // Reset and close
    setTitle("");
    setDescription("");
    setSelectedTags([]);
    setDue("");
    onClose();
  };

  const toggleTag = (tg: string) => {
    setSelectedTags((prev) =>
      prev.includes(tg) ? prev.filter((t) => t !== tg) : [...prev, tg]
    );
  };

  const addCustomTag = () => {
    const val = customTag.trim().toLowerCase();
    if (val && !selectedTags.includes(val)) {
      setSelectedTags((prev) => [...prev, val]);
      setCustomTag("");
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(540px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div
                className="grid h-7 w-7 place-items-center rounded-md"
                style={{ background: "var(--gradient-magic)" }}
              >
                <Plus className="h-4 w-4 text-background" />
              </div>
              <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-foreground">
                Criar Nova Tarefa
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Título</label>
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Desenvolver nova tela de checkout..."
                className="mt-1 border-border/60 bg-secondary/40 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes, requisitos, notas técnicas..."
                rows={3}
                className="mt-1 w-full rounded-md border border-border/60 bg-secondary/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Projeto</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Coluna / Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="mt-1 w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="todo" className="bg-card text-foreground">To Do</option>
                  <option value="doing" className="bg-card text-foreground">In Progress</option>
                  <option value="done" className="bg-card text-foreground">Done</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1 w-full rounded-md border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="low" className="bg-card text-foreground">Baixa</option>
                  <option value="med" className="bg-card text-foreground">Média</option>
                  <option value="high" className="bg-card text-foreground">Alta 🔴</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Data de Vencimento</label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Tags Sugeridas</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-border/40 rounded-lg bg-secondary/20">
                {tags.map((tg) => {
                  const active = selectedTags.includes(tg);
                  return (
                    <button
                      type="button"
                      key={tg}
                      onClick={() => toggleTag(tg)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[11px] transition-colors border",
                        active
                          ? "bg-primary/20 border-primary text-primary font-medium"
                          : "border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {tg}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder="Adicionar nova tag personalizada..."
                  className="h-7 text-xs border-border/60 bg-secondary/40"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={addCustomTag}
                >
                  + Tag
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Criar Tarefa
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
