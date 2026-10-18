import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Folder,
  Briefcase,
  Code,
  Sparkles,
  Rocket,
  Target,
  BookOpen,
  Globe,
  Flame,
  Layers,
  Heart,
  Zap,
  Coffee,
  ShoppingBag,
  Music,
  Terminal,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectDoc } from "@/lib/firestore";

export const PROJECT_ICONS = [
  { id: "folder", label: "Pasta", icon: Folder },
  { id: "briefcase", label: "Trabalho", icon: Briefcase },
  { id: "code", label: "Código", icon: Code },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "sparkles", label: "Magia", icon: Sparkles },
  { id: "rocket", label: "Foguete", icon: Rocket },
  { id: "target", label: "Objetivo", icon: Target },
  { id: "book", label: "Estudos", icon: BookOpen },
  { id: "globe", label: "Web", icon: Globe },
  { id: "flame", label: "Urgente", icon: Flame },
  { id: "layers", label: "Camadas", icon: Layers },
  { id: "heart", label: "Pessoal", icon: Heart },
  { id: "zap", label: "Rápido", icon: Zap },
  { id: "coffee", label: "Café", icon: Coffee },
  { id: "shopping", label: "Compras", icon: ShoppingBag },
  { id: "music", label: "Música", icon: Music },
];

export const PROJECT_COLORS = [
  { id: "bg-violet-400", hex: "#a78bfa", label: "Violeta" },
  { id: "bg-sky-400", hex: "#38bdf8", label: "Céu" },
  { id: "bg-emerald-400", hex: "#34d399", label: "Esmeralda" },
  { id: "bg-amber-400", hex: "#fbbf24", label: "Âmbar" },
  { id: "bg-rose-400", hex: "#fb7185", label: "Rosa" },
  { id: "bg-fuchsia-400", hex: "#e879f9", label: "Fúcsia" },
  { id: "bg-indigo-400", hex: "#818cf8", label: "Índigo" },
  { id: "bg-teal-400", hex: "#2dd4bf", label: "Turquesa" },
  { id: "bg-slate-400", hex: "#94a3b8", label: "Ardósia" },
  { id: "bg-orange-400", hex: "#fb923c", label: "Laranja" },
];

export function getProjectIconComponent(iconName?: string) {
  const match = PROJECT_ICONS.find((i) => i.id === iconName);
  return match ? match.icon : Folder;
}

export function ProjectModal({
  open,
  onClose,
  project,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  project?: ProjectDoc | null;
  onSave: (data: { name: string; color: string; icon: string; path?: string }) => void;
}) {
  const isEditing = !!project;
  const [name, setName] = useState("");
  const [color, setColor] = useState("bg-violet-400");
  const [icon, setIcon] = useState("folder");
  const [path, setPath] = useState("");

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name);
        setColor(project.color || "bg-violet-400");
        setIcon(project.icon || "folder");
        setPath(project.path || "");
      } else {
        setName("");
        setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)].id);
        setIcon("folder");
        setPath("");
      }
    }
  }, [open, project]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onSave({ name: cleanName, color, icon, path: path.trim() || undefined });
    onClose();
  };

  const SelectedIcon = getProjectIconComponent(icon);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(480px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className={cn("grid h-7 w-7 place-items-center rounded-md text-background", color)}>
                <SelectedIcon className="h-4 w-4" />
              </div>
              <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-foreground">
                {isEditing ? "Editar Projeto" : "Novo Projeto"}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome do Projeto</label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: TotalTrigo, Marketing, Pessoal..."
                className="mt-1 border-border/60 bg-secondary/40 text-sm font-medium"
                required
              />
            </div>

            {/* Escolha de Cor */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cor do Projeto</label>
              <div className="mt-1.5 flex flex-wrap gap-2 p-2 border border-border/40 rounded-lg bg-secondary/20">
                {PROJECT_COLORS.map((c) => {
                  const selected = color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={cn(
                        "relative h-6 w-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
                        c.id,
                        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                      )}
                      title={c.label}
                    >
                      {selected && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Escolha de Ícone */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ícone do Projeto</label>
              <div className="mt-1.5 grid grid-cols-4 sm:grid-cols-8 gap-1.5 p-2 border border-border/40 rounded-lg bg-secondary/20 max-h-36 overflow-y-auto">
                {PROJECT_ICONS.map((i) => {
                  const IconComp = i.icon;
                  const selected = icon === i.id;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIcon(i.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-md p-2 transition-colors",
                        selected
                          ? "bg-primary/20 border border-primary text-primary font-medium"
                          : "border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                      title={i.label}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caminho Local do Repositório (AntiGravity) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-primary" /> Caminho do Projeto no PC (AntiGravity)
                </label>
                <span className="text-[10px] text-muted-foreground">Opcional</span>
              </div>
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Ex: C:\Users\PC-Gabriel\Documents\antigravity\TotalTrigo"
                className="mt-1 border-border/60 bg-secondary/40 text-xs font-mono"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/75">
                Diretório onde o código deste projeto fica no seu computador para o AntiGravity saber onde programar.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="text-xs font-medium">
                {isEditing ? "Salvar Alterações" : "Criar Projeto"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
