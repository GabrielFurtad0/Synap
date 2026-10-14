import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Inbox,
  Calendar,
  Star,
  Folder,
  Tag,
  Search,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Settings,
  CalendarDays,
  X,
  Send,
  GripVertical,
  Check,
  LogOut,
  Trash2,
  Columns3,
  Bell,
  Phone,
  Mail,
  LayoutGrid,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useUIPrefs } from "@/lib/ui-prefs-context";
import { CreateTaskModal } from "@/components/create-task-modal";
import { CalendarView } from "@/components/calendar-view";
import {
  subscribeTasks,
  subscribeProjects,
  createTask,
  updateTask as fsUpdateTask,
  deleteTask as fsDeleteTask,
  createProject,
  deleteProject,
  seedDefaultProjects,
  type TaskDoc,
  type ProjectDoc,
  type Status,
  type Priority,
  type SubTask,
} from "@/lib/firestore";

const COLUMNS: { id: Status; title: string; accent: string }[] = [
  { id: "todo", title: "To Do", accent: "bg-muted-foreground/60" },
  { id: "doing", title: "In Progress", accent: "bg-amber-400/80" },
  { id: "done", title: "Done", accent: "bg-emerald-400/80" },
];

const NAV = [
  { icon: Inbox, label: "Inbox", key: "inbox" as const },
  { icon: CalendarDays, label: "Today", key: "today" as const },
  { icon: Calendar, label: "Upcoming", key: "upcoming" as const },
  { icon: Star, label: "Starred", key: "starred" as const },
];

const INITIAL_TAGS = [
  // Tamanho
  "P",
  "M",
  "G",
  // Urgência
  "urgente",
  "alta",
  "média",
  "baixa",
  // Complexidade
  "simples",
  "complexa",
  // Categorias
  "feature",
  "bug",
  "design",
  "planning",
  "tech-debt",
  "strategy",
  "email",
];

type DateFilter = "all" | "today" | "week" | "overdue";
type NavFilter = "inbox" | "today" | "upcoming" | "starred";

function formatDue(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function TaskBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [tags, setTags] = useState<string[]>(INITIAL_TAGS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [prioFilter, setPrioFilter] = useState<Set<Priority>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [navFilter, setNavFilter] = useState<NavFilter>("inbox");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "calendar">("board");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<Status>("todo");
  const [createModalDate, setCreateModalDate] = useState<string | undefined>(undefined);
  const [createModalProjectId, setCreateModalProjectId] = useState<string | null>(null);
  const [createModalMode, setCreateModalMode] = useState<"global" | "column">("global");
  const seedingRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Shortcut ⌘N / Ctrl+N to open New Task modal (global)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCreateModalStatus("todo");
        setCreateModalProjectId(selectedProjectId);
        setCreateModalDate(undefined);
        setCreateModalMode("global");
        setCreateModalOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProjectId]);

  // Subscribe to Firestore tasks & projects for the current user.
  useEffect(() => {
    if (!user) return;
    const unsubTasks = subscribeTasks(user.uid, setTasks);
    const unsubProjects = subscribeProjects(user.uid, (p) => {
      setProjects(p);
      setProjectsLoaded(true);
    });
    return () => {
      unsubTasks();
      unsubProjects();
    };
  }, [user]);

  // Seed default projects on first login (only when projects collection is empty).
  useEffect(() => {
    if (!user || !projectsLoaded) return;
    if (projects.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      seedDefaultProjects(user.uid).catch((e) => {
        console.error("seedDefaultProjects failed:", e);
        seedingRef.current = false;
      });
    }
  }, [user, projectsLoaded, projects.length]);

  // Merge tags from existing task documents into the tag chip list.
  useEffect(() => {
    setTags((prev) => {
      const set = new Set(prev);
      (tasks ?? []).forEach((t) => {
        if (Array.isArray(t.tags)) {
          t.tags.forEach((tag) => set.add(tag));
        }
      });
      return Array.from(set);
    });
  }, [tasks]);

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return (tasks ?? [])
      .filter((t) => {
        if (!t) return false;
        if (query && !t.title?.toLowerCase().includes(query.toLowerCase())) return false;
        if (tagFilter.size && !(t.tags ?? []).some((tg) => tagFilter.has(tg))) return false;
        if (prioFilter.size && (!t.priority || !prioFilter.has(t.priority))) return false;
        if (selectedProjectId && t.projectId !== selectedProjectId) return false;
        if (navFilter === "starred" && !t.isStarred) return false;
        if (navFilter === "today") {
          if (!t.due) return false;
          const d = new Date(t.due + "T00:00:00");
          if (d.getTime() !== today.getTime()) return false;
        }
        if (navFilter === "upcoming") {
          if (!t.due) return false;
          const d = new Date(t.due + "T00:00:00");
          if (d < today || d > weekEnd) return false;
        }
        if (dateFilter !== "all") {
          if (!t.due) return false;
          const d = new Date(t.due + "T00:00:00");
          if (dateFilter === "today" && d.getTime() !== today.getTime()) return false;
          if (dateFilter === "overdue" && d.getTime() >= today.getTime()) return false;
          if (dateFilter === "week" && (d < today || d > weekEnd)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Ordenação por ordem de adição cronológica (createdAt)
        const timeA =
          (a as any).createdAt?.toMillis?.() ??
          ((a as any).createdAt?._seconds ? (a as any).createdAt._seconds * 1000 : 0);
        const timeB =
          (b as any).createdAt?.toMillis?.() ??
          ((b as any).createdAt?._seconds ? (b as any).createdAt._seconds * 1000 : 0);
        return timeA - timeB;
      });
  }, [tasks, query, tagFilter, prioFilter, dateFilter, navFilter, selectedProjectId]);

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;
  const draggingTask = tasks.find((t) => t.id === dragId) ?? null;

  const updateTask = (id: string, patch: Partial<TaskDoc>) => {
    // Optimistic local update for snappy UI; onSnapshot will reconcile.
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    fsUpdateTask(id, patch).catch((e) => console.error("updateTask failed:", e));
  };

  const addTask = (status: Status, title: string) => {
    if (!user) return;
    const title2 = title.trim();
    if (!title2) return;
    const selected = projects.find((p) => p.id === selectedProjectId);
    const defaultProject = selected?.name ?? projects[0]?.name ?? "Inbox";
    const defaultProjectId = selected?.id ?? projects[0]?.id;
    createTask(user.uid, {
      title: title2,
      status,
      project: defaultProject,
      projectId: defaultProjectId,
      tags: [],
      priority: "med",
      isStarred: false,
    }).catch((e) => console.error("createTask failed:", e));
  };

  const addTag = (name: string) => {
    const n = name.trim().toLowerCase();
    if (!n || tags.includes(n)) return;
    setTags((t) => [...t, n]);
  };

  const addProject = (name: string) => {
    if (!user) return;
    const n = name.trim();
    if (!n) return;
    const palette = ["bg-violet-400", "bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-fuchsia-400"];
    createProject(user.uid, { name: n, color: palette[projects.length % palette.length] }).catch((e) =>
      console.error("createProject failed:", e),
    );
  };

  const removeProject = (id: string) => {
    deleteProject(id).catch((e) => console.error("deleteProject failed:", e));
  };

  const toggleTagFilter = (tag: string) => {
    setTagFilter((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const onDragStart = (e: DragStartEvent) => setDragId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id as Status | undefined;
    if (!overId) return;
    if (!["todo", "doing", "done"].includes(overId)) return;
    updateTask(taskId, { status: overId });
  };

  return (
    <div className="flex h-screen max-h-screen w-full overflow-hidden bg-background text-foreground antialiased">
      <SidebarNav
        tags={tags}
        tagFilter={tagFilter}
        onToggleTag={toggleTagFilter}
        onAddTag={addTag}
        projects={projects}
        onAddProject={addProject}
        onRemoveProject={removeProject}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewTask={() => {
          setCreateModalStatus("todo");
          setCreateModalProjectId(selectedProjectId);
          setCreateModalDate(undefined);
          setCreateModalMode("global");
          setCreateModalOpen(true);
        }}
        navCounts={navCountsFor(tasks)}
        navFilter={navFilter}
        onNavFilter={(k) => {
          setNavFilter(k);
          setSelectedProjectId(null);
        }}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId((cur) => (cur === id ? null : id));
          setNavFilter("inbox");
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <TopBar
          query={query}
          onQuery={setQuery}
          prioFilter={prioFilter}
          setPrioFilter={setPrioFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          onAskAi={() => setAskAiOpen(true)}
          activeCount={filtered.length}
          viewMode={viewMode}
          onViewMode={setViewMode}
          onNewTask={() => {
            setCreateModalStatus("todo");
            setCreateModalProjectId(selectedProjectId);
            setCreateModalDate(undefined);
            setCreateModalMode(selectedProjectId ? "column" : "global");
            setCreateModalOpen(true);
          }}
          title={
            selectedProjectId
              ? projects.find((p) => p.id === selectedProjectId)?.name ?? "Project"
              : navFilter === "today"
              ? "Today"
              : navFilter === "upcoming"
              ? "Upcoming"
              : navFilter === "starred"
              ? "Starred"
              : "Inbox"
          }
        />
        {viewMode === "calendar" ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CalendarView
              tasks={filtered}
              onOpenTask={(t) => setActiveId(t.id)}
              onAddTaskDate={(d) => {
                setCreateModalStatus("todo");
                setCreateModalProjectId(selectedProjectId);
                setCreateModalDate(d);
                setCreateModalMode(selectedProjectId ? "column" : "global");
                setCreateModalOpen(true);
              }}
            />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex-1 min-h-0 overflow-x-auto px-6 pb-4">
              <div className="grid h-full min-w-[920px] grid-cols-3 gap-5">
                {COLUMNS.map((col) => (
                  <Column
                    key={col.id}
                    column={col}
                    tasks={filtered.filter((t) => t.status === col.id)}
                    onOpen={(t) => setActiveId(t.id)}
                    onAddTask={(title) => addTask(col.id, title)}
                    onOpenNewModal={() => {
                      setCreateModalStatus(col.id);
                      setCreateModalProjectId(selectedProjectId ?? projects[0]?.id ?? null);
                      setCreateModalDate(undefined);
                      setCreateModalMode("column");
                      setCreateModalOpen(true);
                    }}
                    onUpdateStatus={(taskId, st) => updateTask(taskId, { status: st })}
                    onUpdatePriority={(taskId, pr) => updateTask(taskId, { priority: pr })}
                    onToggleStar={(taskId, starred) => updateTask(taskId, { isStarred: !starred })}
                    onDeleteTask={(taskId) => {
                      fsDeleteTask(taskId).catch((e) => console.error("deleteTask failed:", e));
                    }}
                  />
                ))}
              </div>
            </div>
            <DragOverlay>
              {draggingTask && (
                <div className="rotate-2 opacity-95">
                  <CardSurface task={draggingTask} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <TaskModal
        task={activeTask}
        tags={tags}
        projects={projects}
        onClose={() => setActiveId(null)}
        onUpdate={(patch) => activeTask && updateTask(activeTask.id, patch)}
        onDelete={() => {
          if (!activeTask) return;
          fsDeleteTask(activeTask.id).catch((e) => console.error("deleteTask failed:", e));
          setActiveId(null);
        }}
        onAddTag={addTag}
      />

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        projects={projects}
        tags={tags}
        defaultStatus={createModalStatus}
        defaultDate={createModalDate}
        defaultProjectId={createModalProjectId ?? selectedProjectId}
        contextMode={createModalMode}
        onCreate={(newTask) => {
          if (!user) return;
          createTask(user.uid, newTask).catch((e) => console.error("createTask failed:", e));
        }}
      />

      <AskAiPanel
        open={askAiOpen}
        onClose={() => setAskAiOpen(false)}
        tasks={tasks}
        projects={projects}
        onAddTask={(nt) => {
          if (!user) return;
          createTask(user.uid, {
            title: nt.title,
            status: nt.status || "todo",
            project: nt.project || "Inbox",
            priority: nt.priority || "med",
            tags: [],
            isStarred: false,
          }).catch(console.error);
        }}
        onUpdateTask={(id, patch) => updateTask(id, patch)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function navCountsFor(tasks: TaskDoc[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  let inbox = 0,
    todayCount = 0,
    upcoming = 0,
    starred = 0;
  for (const t of tasks ?? []) {
    if (!t) continue;
    if (t.status !== "done") inbox++;
    if (t.isStarred) starred++;
    if (t.due) {
      const d = new Date(t.due + "T00:00:00");
      if (d.getTime() === today.getTime()) todayCount++;
      if (d >= today && d <= weekEnd) upcoming++;
    }
  }
  return { inbox, today: todayCount, upcoming, starred };
}

/* ---------------- Sidebar ---------------- */

function SidebarNav({
  tags,
  tagFilter,
  onToggleTag,
  onAddTag,
  projects,
  onAddProject,
  onRemoveProject,
  onOpenSettings,
  onOpenNewTask,
  navCounts,
  navFilter,
  onNavFilter,
  selectedProjectId,
  onSelectProject,
}: {
  tags: string[];
  tagFilter: Set<string>;
  onToggleTag: (t: string) => void;
  onAddTag: (t: string) => void;
  projects: ProjectDoc[];
  onAddProject: (name: string) => void;
  onRemoveProject: (id: string) => void;
  onOpenSettings: () => void;
  onOpenNewTask: () => void;
  navCounts: { inbox: number; today: number; upcoming: number; starred: number };
  navFilter: NavFilter;
  onNavFilter: (k: NavFilter) => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [addingProject, setAddingProject] = useState(false);
  const [projectName, setProjectName] = useState("");

  const submit = () => {
    onAddTag(value);
    setValue("");
    setAdding(false);
  };

  const submitProject = () => {
    onAddProject(projectName);
    setProjectName("");
    setAddingProject(false);
  };

  return (
    <aside
      className="hidden w-64 shrink-0 flex-col border-r border-border/60 md:flex h-screen overflow-y-auto"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <div
          className="grid h-8 w-8 place-items-center rounded-md"
          style={{ background: "var(--gradient-magic)", boxShadow: "var(--shadow-magic)" }}
        >
          <Sparkles className="h-4 w-4 text-background" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Nimbus</div>
          <div className="text-[11px] text-muted-foreground">AI Task Manager</div>
        </div>
      </div>

      <div className="px-3">
        <Button
          onClick={onOpenNewTask}
          variant="secondary"
          className="w-full justify-start gap-2 bg-secondary/60 hover:bg-secondary"
        >
          <Plus className="h-4 w-4" /> New task
          <span className="ml-auto text-[10px] text-muted-foreground">⌘N</span>
        </Button>
      </div>

      <nav className="mt-5 flex flex-col gap-0.5 px-2">
        {NAV.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavFilter(item.key)}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              navFilter === item.key && !selectedProjectId && "bg-accent text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
            <span className="ml-auto text-[11px] text-muted-foreground/70">
              {navCounts[item.key]}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-6 mb-2 flex items-center justify-between px-5">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Projects</span>
        <button
          onClick={() => setAddingProject((v) => !v)}
          className="rounded p-0.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
          title="Add project"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
              selectedProjectId === p.id && "bg-accent text-foreground",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", p.color ?? "bg-violet-400")} />
            <Folder className="h-3.5 w-3.5 opacity-60" />
            <span className="flex-1 truncate">{p.name}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveProject(p.id);
              }}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              title="Delete project"
            >
              <Trash2 className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
      {addingProject && (
        <div className="mt-1 px-3">
          <Input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitProject();
              if (e.key === "Escape") setAddingProject(false);
            }}
            onBlur={submitProject}
            placeholder="Project name"
            className="h-7 border-border/60 bg-secondary/40 text-xs"
          />
        </div>
      )}

      <div className="mt-6 mb-2 flex items-center justify-between px-5">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">Tags</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded p-0.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
          title="Add tag"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4">
        {tags.map((t) => {
          const active = tagFilter.has(t);
          return (
            <button
              key={t}
              onClick={() => onToggleTag(t)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                active
                  ? "border-transparent text-primary-foreground"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary",
              )}
              style={active ? { background: "var(--gradient-magic)" } : undefined}
            >
              <Tag className="h-2.5 w-2.5" />
              {t}
            </button>
          );
        })}
      </div>
      {adding && (
        <div className="mt-2 px-4">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={submit}
            placeholder="tag name"
            className="h-7 border-border/60 bg-secondary/40 text-xs"
          />
        </div>
      )}
      {tagFilter.size > 0 && (
        <button
          onClick={() => tagFilter.forEach((t) => onToggleTag(t))}
          className="mt-2 px-5 text-left text-[10px] uppercase tracking-wider text-muted-foreground/70 hover:text-foreground"
        >
          Clear tag filters
        </button>
      )}

      <div className="mt-auto border-t border-border/60 px-3 py-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}

/* ---------------- Top Bar ---------------- */

function TopBar({
  query,
  onQuery,
  prioFilter,
  setPrioFilter,
  dateFilter,
  setDateFilter,
  onAskAi,
  activeCount,
  title,
  viewMode,
  onViewMode,
  onNewTask,
}: {
  query: string;
  onQuery: (v: string) => void;
  prioFilter: Set<Priority>;
  setPrioFilter: (s: Set<Priority>) => void;
  dateFilter: DateFilter;
  setDateFilter: (d: DateFilter) => void;
  onAskAi: () => void;
  activeCount: number;
  title: string;
  viewMode: "board" | "calendar";
  onViewMode: (m: "board" | "calendar") => void;
  onNewTask: () => void;
}) {
  const togglePrio = (p: Priority) => {
    const next = new Set(prioFilter);
    next.has(p) ? next.delete(p) : next.add(p);
    setPrioFilter(next);
  };
  const filterActive = prioFilter.size > 0 || dateFilter !== "all";

  return (
    <header className="flex items-center gap-3 px-6 py-3.5 border-b border-border/40 shrink-0">
      <div>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        <p className="text-[11px] text-muted-foreground">{activeCount} task{activeCount === 1 ? "" : "s"}</p>
      </div>

      <div className="ml-4 flex flex-1 items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search tasks…"
            className="h-8 border-border/60 bg-secondary/40 pl-8 text-xs placeholder:text-muted-foreground/60"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground", filterActive && "text-foreground")}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {filterActive && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary)" }} />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 border-border/60 bg-popover p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Priority</div>
            <div className="mt-2 flex flex-col gap-1">
              {(["high", "med", "low"] as Priority[]).map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={prioFilter.has(p)} onCheckedChange={() => togglePrio(p)} />
                  <PriorityDot p={p} />
                </label>
              ))}
            </div>
            <div className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Due Date</div>
            <div className="mt-2 flex flex-col gap-1">
              {([
                ["all", "All dates"],
                ["today", "Due today"],
                ["week", "Next 7 days"],
                ["overdue", "Overdue"],
              ] as [DateFilter, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setDateFilter(k)}
                  className={cn(
                    "flex items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-accent",
                    dateFilter === k && "text-foreground",
                  )}
                >
                  {label}
                  {dateFilter === k && <Check className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* View Switcher: Kanban vs Calendário */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/30 p-0.5">
          <button
            onClick={() => onViewMode("board")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              viewMode === "board"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            onClick={() => onViewMode("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendário
          </button>
        </div>
      </div>

      <Button
        onClick={onNewTask}
        size="sm"
        className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova Tarefa
      </Button>

      <Button
        onClick={onAskAi}
        size="sm"
        className="h-8 gap-1.5 border border-border/60 bg-secondary/50 text-foreground hover:bg-secondary text-xs"
      >
        <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
        Ask AI
      </Button>
    </header>
  );
}

/* ---------------- Column ---------------- */

function Column({
  column,
  tasks,
  onOpen,
  onAddTask,
  onOpenNewModal,
  onUpdateStatus,
  onUpdatePriority,
  onToggleStar,
  onDeleteTask,
}: {
  column: { id: Status; title: string; accent: string };
  tasks: TaskDoc[];
  onOpen: (t: TaskDoc) => void;
  onAddTask: (title: string) => void;
  onOpenNewModal?: () => void;
  onUpdateStatus?: (taskId: string, st: Status) => void;
  onUpdatePriority?: (taskId: string, pr: Priority) => void;
  onToggleStar?: (taskId: string, isStarred: boolean) => void;
  onDeleteTask?: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");

  const submit = () => {
    onAddTask(val);
    setVal("");
    setAdding(false);
  };

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-border/60 transition-colors h-full max-h-full overflow-hidden",
        isOver && "border-primary/50",
      )}
      style={{ backgroundColor: "var(--column-bg)" }}
    >
      <header className="flex items-center gap-2 px-4 py-3 shrink-0">
        <span className={cn("h-1.5 w-1.5 rounded-full", column.accent)} />
        <h2 className="text-sm font-medium tracking-tight">{column.title}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
        <button
          onClick={() => setAdding(true)}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Nova tarefa rápida nesta coluna"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Container de cartões com scroll independente */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onOpen={() => onOpen(t)}
            onUpdateStatus={onUpdateStatus}
            onUpdatePriority={onUpdatePriority}
            onToggleStar={onToggleStar}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      <div className="shrink-0 px-2 pb-3 pt-1 border-t border-border/30">
        {adding ? (
          <div className="rounded-lg border border-border bg-card/80 p-2">
            <Input
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder={`Nova tarefa em ${column.title}…`}
              className="h-8 border-border/60 bg-secondary/40 text-sm"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 px-2.5 text-xs" onClick={submit}>
                  Adicionar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setAdding(false)}
                >
                  Cancelar
                </Button>
              </div>
              {onOpenNewModal && (
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    onOpenNewModal();
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                  title="Abrir pop-up pré-preenchido com data, tags e descrição"
                >
                  Mais opções
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAdding(true)}
              className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tarefa
            </button>
            {onOpenNewModal && (
              <button
                onClick={onOpenNewModal}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Abrir com detalhes (projeto e coluna pré-preenchidos)"
              >
                <Sparkles className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Task Card with Right Click Context Menu ---------------- */

function TaskCard({
  task,
  onOpen,
  onUpdateStatus,
  onUpdatePriority,
  onToggleStar,
  onDeleteTask,
}: {
  task: TaskDoc;
  onOpen: () => void;
  onUpdateStatus?: (taskId: string, st: Status) => void;
  onUpdatePriority?: (taskId: string, pr: Priority) => void;
  onToggleStar?: (taskId: string, isStarred: boolean) => void;
  onDeleteTask?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onClick={onOpen}
          className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-30")}
        >
          <CardSurface task={task} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 border-border/60 bg-popover text-popover-foreground">
        <ContextMenuItem onClick={onOpen} className="gap-2 text-xs cursor-pointer">
          Abrir Detalhes
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 text-xs cursor-pointer">Mover para...</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40 border-border/60 bg-popover">
            <ContextMenuItem
              disabled={task.status === "todo"}
              onClick={() => onUpdateStatus?.(task.id, "todo")}
              className="gap-2 text-xs cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              To Do
            </ContextMenuItem>
            <ContextMenuItem
              disabled={task.status === "doing"}
              onClick={() => onUpdateStatus?.(task.id, "doing")}
              className="gap-2 text-xs cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              In Progress
            </ContextMenuItem>
            <ContextMenuItem
              disabled={task.status === "done"}
              onClick={() => onUpdateStatus?.(task.id, "done")}
              className="gap-2 text-xs cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              Done
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 text-xs cursor-pointer">Prioridade</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36 border-border/60 bg-popover">
            <ContextMenuItem
              disabled={task.priority === "high"}
              onClick={() => onUpdatePriority?.(task.id, "high")}
              className="gap-2 text-xs cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Alta
            </ContextMenuItem>
            <ContextMenuItem
              disabled={task.priority === "med"}
              onClick={() => onUpdatePriority?.(task.id, "med")}
              className="gap-2 text-xs cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Média
            </ContextMenuItem>
            <ContextMenuItem
              disabled={task.priority === "low"}
              onClick={() => onUpdatePriority?.(task.id, "low")}
              className="gap-2 text-xs cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              Baixa
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem
          onClick={() => onToggleStar?.(task.id, !!task.isStarred)}
          className="gap-2 text-xs cursor-pointer"
        >
          <Star className={cn("h-3.5 w-3.5", task.isStarred ? "fill-amber-300 text-amber-300" : "")} />
          {task.isStarred ? "Remover destaque" : "Destacar com estrela"}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => onDeleteTask?.(task.id)}
          className="gap-2 text-xs text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir tarefa
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function CardSurface({ task }: { task: TaskDoc }) {
  const done = task.status === "done";
  return (
    <article
      className={cn(
        "group relative rounded-lg border border-border/60 bg-card/80 p-3 transition-all",
        "hover:border-border hover:bg-card",
      )}
    >
      <div className="flex items-start gap-2">
        {done ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
            {task.title}
            {task.isStarred && (
              <Star className="ml-1 inline h-3 w-3 fill-amber-300 text-amber-300" />
            )}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5">
              <Folder className="h-2.5 w-2.5" />
              {task.project}
            </span>
            {task.due && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDue(task.due)}
              </span>
            )}
            {task.priority && <PriorityDot p={task.priority} />}
          </div>
          {(task.tags?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-4 rounded-sm bg-secondary/50 px-1.5 text-[10px] font-normal text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </article>
  );
}

function PriorityDot({ p }: { p: Priority }) {
  const color = p === "high" ? "bg-rose-400" : p === "med" ? "bg-amber-400" : "bg-muted-foreground/60";
  const label = p === "high" ? "High" : p === "med" ? "Medium" : "Low";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

/* ---------------- Task Modal ---------------- */

function TaskModal({
  task,
  tags,
  projects,
  onClose,
  onUpdate,
  onDelete,
  onAddTag,
}: {
  task: TaskDoc | null;
  tags: string[];
  projects: ProjectDoc[];
  onClose: () => void;
  onUpdate: (patch: Partial<TaskDoc>) => void;
  onDelete: () => void;
  onAddTag: (t: string) => void;
}) {
  return (
    <DialogPrimitive.Root open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[min(960px,95vw)] -translate-x-1/2 -translate-y-1/2",
            "overflow-y-auto rounded-2xl border border-border/60 bg-card p-0 shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          )}
        >
          {task && (
            <ModalBody
              task={task}
              tags={tags}
              projects={projects}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddTag={onAddTag}
            />
          )}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ModalBody({
  task,
  tags,
  projects,
  onUpdate,
  onDelete,
  onAddTag,
}: {
  task: TaskDoc;
  tags: string[];
  projects: ProjectDoc[];
  onUpdate: (patch: Partial<TaskDoc>) => void;
  onDelete: () => void;
  onAddTag: (t: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <DialogPrimitive.Title className="sr-only">{task.title}</DialogPrimitive.Title>
      <div className="border-b border-border/60 px-6 pt-6 pb-5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Folder className="h-3 w-3" />
          <ProjectEditor task={task} projects={projects} onUpdate={onUpdate} />
          <span className="opacity-40">/</span>
          <span>{task.status === "todo" ? "To Do" : task.status === "doing" ? "In Progress" : "Done"}</span>
          <button
            onClick={() => onUpdate({ isStarred: !task.isStarred })}
            className="ml-1 rounded p-0.5 hover:bg-accent"
            title={task.isStarred ? "Unstar" : "Star"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                task.isStarred ? "fill-amber-300 text-amber-300" : "text-muted-foreground",
              )}
            />
          </button>
        </div>
        <input
          className="mt-2 w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
          value={task.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <textarea
          value={task.description ?? ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Add a description…"
          rows={2}
          className="mt-1 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <DueEditor value={task.due} onChange={(d) => onUpdate({ due: d })} />
          <PriorityEditor value={task.priority} onChange={(p) => onUpdate({ priority: p })} />
          <TagsEditor
            selected={task.tags ?? []}
            all={tags}
            onChange={(t) => onUpdate({ tags: t })}
            onAddTag={onAddTag}
          />
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-rose-300/90 hover:bg-secondary"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
            style={{ background: "var(--gradient-magic)", color: "oklch(0.14 0.01 270)" }}
          >
            <Sparkles className="h-3 w-3" />
            Generated by AI
          </span>
        </div>
      </div>

      <div className="px-6 py-6">
        <Breakdown task={task} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function ProjectEditor({
  task,
  projects,
  onUpdate,
}: {
  task: TaskDoc;
  projects: ProjectDoc[];
  onUpdate: (patch: Partial<TaskDoc>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="rounded px-1 hover:bg-accent">{task.project}</button>
      </PopoverTrigger>
      <PopoverContent className="w-48 border-border/60 bg-popover p-1">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onUpdate({ project: p.name, projectId: p.id })}
            className={cn(
              "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
              task.projectId === p.id && "bg-accent/50",
            )}
          >
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span className={cn("h-2 w-2 rounded-full", p.color ?? "bg-violet-400")} />
              {p.name}
            </span>
            {task.projectId === p.id && <Check className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function DueEditor({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 hover:bg-secondary">
          <Clock className="h-3 w-3" /> {value ? `Due ${formatDue(value)}` : "Set due date"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 border-border/60 bg-popover p-3">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due date</label>
        <Input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="mt-2 h-8 border-border/60 bg-secondary/40 text-sm"
        />
        {value && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 h-7 w-full text-xs text-muted-foreground"
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PriorityEditor({ value, onChange }: { value?: Priority; onChange: (p: Priority) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 hover:bg-secondary">
          {value ? <PriorityDot p={value} /> : "Set priority"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 border-border/60 bg-popover p-1">
        {(["high", "med", "low"] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
              value === p && "bg-accent/50",
            )}
          >
            <PriorityDot p={p} />
            {value === p && <Check className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function TagsEditor({
  selected,
  all,
  onChange,
  onAddTag,
}: {
  selected: string[];
  all: string[];
  onChange: (t: string[]) => void;
  onAddTag: (t: string) => void;
}) {
  const [newTag, setNewTag] = useState("");
  const toggle = (t: string) => {
    if (selected.includes(t)) onChange(selected.filter((x) => x !== t));
    else onChange([...selected, t]);
  };
  const add = () => {
    const n = newTag.trim().toLowerCase();
    if (!n) return;
    onAddTag(n);
    if (!selected.includes(n)) onChange([...selected, n]);
    setNewTag("");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 hover:bg-secondary">
          <Tag className="h-3 w-3" />
          {selected.length ? `${selected.length} tag${selected.length > 1 ? "s" : ""}` : "Add tags"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 border-border/60 bg-popover p-2">
        <div className="max-h-44 overflow-y-auto">
          {all.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-accent"
            >
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Tag className="h-3 w-3" /> {t}
              </span>
              {selected.includes(t) && <Check className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1 border-t border-border/60 pt-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New tag…"
            className="h-7 border-border/60 bg-secondary/40 text-xs"
          />
          <Button size="sm" className="h-7 px-2 text-xs" onClick={add}>
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Breakdown & Concept Map ---------------- */

function Breakdown({ task, onUpdate }: { task: TaskDoc; onUpdate: (patch: Partial<TaskDoc>) => void }) {
  // Per-task subtasks ONLY — no shared mock. Empty until the user adds them.
  const subtasks = task.subtasks ?? [];

  const setSubtree = (nodes: SubTask[]) => onUpdate({ subtasks: nodes });

  const mapTree = (nodes: SubTask[], id: string, fn: (n: SubTask) => SubTask): SubTask[] =>
    nodes.map((n) => {
      if (n.id === id) return fn(n);
      if (n.children) return { ...n, children: mapTree(n.children, id, fn) };
      return n;
    });

  const toggle = (id: string, done: boolean) => setSubtree(mapTree(subtasks, id, (n) => ({ ...n, done })));

  const addRoot = () =>
    setSubtree([...subtasks, { id: uid(), label: "New subtask", done: false }]);

  return (
    <section>
      <PanelSectionHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="AI-powered task breakdown" />
      {subtasks.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No subtasks yet — add the first step to break this task down.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {subtasks.map((s) => (
            <SubtaskNode key={s.id} node={s} depth={0} onToggle={toggle} />
          ))}
        </ul>
      )}
      <button
        onClick={addRoot}
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Add subtask
      </button>
    </section>
  );
}

function SubtaskNode({
  node,
  depth,
  onToggle,
}: {
  node: SubTask;
  depth: number;
  onToggle: (id: string, done: boolean) => void;
}) {
  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        <Checkbox
          checked={!!node.done}
          onCheckedChange={(v) => onToggle(node.id, !!v)}
          className="h-3.5 w-3.5 rounded-[4px] border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />
        <span className={cn("flex-1 text-sm", node.done ? "text-muted-foreground line-through" : "text-foreground")}>
          {node.label}
        </span>
        {node.due && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {node.due}
          </span>
        )}
      </div>
      {node.children && (
        <ul className="ml-4 border-l border-border/40">
          {node.children.map((c) => (
            <SubtaskNode key={c.id} node={c} depth={depth + 1} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

function PanelSectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <span
        className="grid h-5 w-5 place-items-center rounded"
        style={{ background: "var(--gradient-magic)", color: "oklch(0.14 0.01 270)" }}
      >
        {icon}
      </span>
      {title}
    </div>
  );
}

/* ---------------- Settings Modal ---------------- */

/* ---------------- Settings Modal ---------------- */

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { theme, setTheme, textSize, setTextSize, density, setDensity } = useUIPrefs();

  const [phone, setPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("nimbus_notif_phone") || "";
  });
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("nimbus_notif_email") || user?.email || "";
  });
  const [notifyToday, setNotifyToday] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("nimbus_notif_today") !== "false";
  });
  const [notifyUrgent, setNotifyUrgent] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("nimbus_notif_urgent") !== "false";
  });
  const [notifyDaily, setNotifyDaily] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nimbus_notif_daily") === "true";
  });

  const saveNotifPrefs = (key: string, val: string) => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  };

  const handleTestNotification = () => {
    if (!phone && !email) {
      toast.error("Preencha ao menos um WhatsApp ou E-mail para testar.");
      return;
    }
    const channels = [];
    if (phone) channels.push(`WhatsApp (${phone})`);
    if (email) channels.push(`E-mail (${email})`);
    toast.success(`Notificação de teste disparada com sucesso via ${channels.join(" e ")}!`);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(500px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
          <DialogPrimitive.Title className="text-base font-semibold">Configurações</DialogPrimitive.Title>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          {/* Perfil do usuário */}
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/40 p-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div
                className="grid h-10 w-10 place-items-center rounded-full text-sm font-medium text-background"
                style={{ background: "var(--gradient-magic)" }}
              >
                {user?.displayName?.[0] ?? user?.email?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user?.displayName ?? "Conectado"}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>

          {/* Preferências visuais */}
          <div className="mt-4 space-y-3">
            <SettingRow label="Tema">
              <Segmented
                value={theme}
                options={[
                  { v: "light", label: "Light" },
                  { v: "dark", label: "Dark" },
                ]}
                onChange={(v) => setTheme(v as typeof theme)}
              />
            </SettingRow>

            <SettingRow label="Tamanho do texto">
              <Segmented
                value={textSize}
                options={[
                  { v: "sm", label: "Pequeno" },
                  { v: "md", label: "Médio" },
                  { v: "lg", label: "Grande" },
                ]}
                onChange={(v) => setTextSize(v as typeof textSize)}
              />
            </SettingRow>

            <SettingRow label="Densidade dos cartões">
              <Segmented
                value={density}
                options={[
                  { v: "compact", label: "Compacto" },
                  { v: "comfortable", label: "Confortável" },
                ]}
                onChange={(v) => setDensity(v as typeof density)}
              />
            </SettingRow>
          </div>

          {/* Seção de Notificações (WhatsApp e Email) */}
          <div className="mt-6 border-t border-border/60 pt-5">
            <div className="flex items-center gap-2">
              <div
                className="grid h-6 w-6 place-items-center rounded-md"
                style={{ background: "var(--gradient-magic)" }}
              >
                <Bell className="h-3.5 w-3.5 text-background" />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Notificações (WhatsApp & E-mail)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Receba alertas automáticos de prazos e tarefas de alta prioridade
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3 w-3 text-emerald-400" /> WhatsApp para alertas
                </label>
                <Input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    saveNotifPrefs("nimbus_notif_phone", e.target.value);
                  }}
                  placeholder="+55 (11) 99999-9999"
                  className="h-8 border-border/60 bg-secondary/40 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Mail className="h-3 w-3 text-sky-400" /> E-mail de destino
                </label>
                <Input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    saveNotifPrefs("nimbus_notif_email", e.target.value);
                  }}
                  placeholder="seu-email@dominio.com"
                  className="h-8 border-border/60 bg-secondary/40 text-xs"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Alertar sobre tarefas vencendo hoje</span>
                  <Switch
                    checked={notifyToday}
                    onCheckedChange={(c) => {
                      setNotifyToday(c);
                      saveNotifPrefs("nimbus_notif_today", String(c));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Alertas de tarefas em alta prioridade</span>
                  <Switch
                    checked={notifyUrgent}
                    onCheckedChange={(c) => {
                      setNotifyUrgent(c);
                      saveNotifPrefs("nimbus_notif_urgent", String(c));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Resumo diário matinal de pendências</span>
                  <Switch
                    checked={notifyDaily}
                    onCheckedChange={(c) => {
                      setNotifyDaily(c);
                      saveNotifPrefs("nimbus_notif_daily", String(c));
                    }}
                  />
                </div>
              </div>

              <Button
                onClick={handleTestNotification}
                size="sm"
                variant="outline"
                className="mt-3 w-full border-border/60 bg-secondary/30 hover:bg-secondary text-xs gap-1.5"
              >
                <Send className="h-3 w-3" /> Testar Envio de Notificação
              </Button>
            </div>
          </div>

          <Button
            onClick={async () => {
              await signOut();
              onClose();
            }}
            variant="ghost"
            className="mt-6 w-full justify-start gap-2 border border-border/60 text-rose-400 hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border/60 bg-secondary/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            value === o.v
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Functional Ask AI Copilot ---------------- */

type ChatMsg = { id: string; role: "user" | "ai"; text: string };

function AskAiPanel({
  open,
  onClose,
  tasks,
  projects,
  onAddTask,
  onUpdateTask,
}: {
  open: boolean;
  onClose: () => void;
  tasks: TaskDoc[];
  projects: ProjectDoc[];
  onAddTask?: (task: { title: string; priority?: Priority; status?: Status; project?: string }) => void;
  onUpdateTask?: (id: string, patch: Partial<TaskDoc>) => void;
}) {
  const [widthPct, setWidthPct] = useState(25);
  const [resizing, setResizing] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "m1",
      role: "ai",
      text: "Olá! Sou seu copiloto do Nimbus. Posso analisar suas tarefas, sugerir o que fazer primeiro, resumir o quadro ou até criar novas tarefas para você direto daqui!",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const pct = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      setWidthPct(Math.min(60, Math.max(20, pct)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const processQuery = (rawText: string): string => {
    const text = rawText.trim();
    if (!text) return "Digite algo para eu ajudar!";
    const lower = text.toLowerCase();

    // 1. Comando de criação de tarefa: "criar tarefa [titulo]" ou "adicionar [titulo]"
    const createMatch = lower.match(/(?:criar|adicionar|nova)\s+(?:tarefa\s+)?(.+)/i);
    if (createMatch && !lower.includes("resumo") && !lower.includes("status")) {
      let taskTitle = createMatch[1].trim();
      let priority: Priority = "med";
      if (lower.includes("urgente") || lower.includes("alta")) {
        priority = "high";
        taskTitle = taskTitle.replace(/urgente|alta/gi, "").trim();
      }
      if (onAddTask) {
        onAddTask({
          title: taskTitle,
          priority,
          status: "todo",
          project: projects[0]?.name ?? "Inbox",
        });
        return `✅ Criei a tarefa **"${taskTitle}"** com prioridade ${priority === "high" ? "Alta" : "Média"} na sua coluna **To Do**!`;
      }
    }

    // 2. Concluir tarefa: "concluir [nome]" ou "fechar [nome]"
    const doneMatch = lower.match(/(?:concluir|finalizar|fechar|marcar)\s+(.+)/i);
    if (doneMatch) {
      const searchTitle = doneMatch[1].trim();
      const target = tasks.find((t) => t.title.toLowerCase().includes(searchTitle));
      if (target && onUpdateTask) {
        onUpdateTask(target.id, { status: "done" });
        return `🎉 Marquei a tarefa **"${target.title}"** como Concluída!`;
      }
    }

    // 3. Resumo ou status do quadro
    if (lower.includes("resumo") || lower.includes("status") || lower.includes("quadro") || lower.includes("como está")) {
      const todoCount = tasks.filter((t) => t.status === "todo").length;
      const doingCount = tasks.filter((t) => t.status === "doing").length;
      const doneCount = tasks.filter((t) => t.status === "done").length;
      const highPrio = tasks.filter((t) => t.status !== "done" && t.priority === "high");

      return `📊 **Status Atual do seu Nimbus:**\n\n• **Total de tarefas:** ${tasks.length}\n• **To Do (A Fazer):** ${todoCount}\n• **In Progress (Em andamento):** ${doingCount}\n• **Done (Concluídas):** ${doneCount}\n\n${
        highPrio.length > 0
          ? `⚠️ Você tem **${highPrio.length} tarefa(s) de alta prioridade** pendentes: ${highPrio.map((t) => `"${t.title}"`).join(", ")}.`
          : "✨ Nenhuma tarefa urgente acumulada no momento!"
      }`;
    }

    // 4. O que é urgente / prioridade
    if (lower.includes("urgente") || lower.includes("prioridade") || lower.includes("fazer agora")) {
      const urgentTasks = tasks.filter((t) => t.status !== "done" && t.priority === "high");
      if (urgentTasks.length === 0) {
        return "✨ Parabéns! Não há tarefas com prioridade Alta pendentes no seu quadro. Você pode focar nas tarefas em progresso ou escolher uma do 'To Do'!";
      }
      return `🔥 **Foco Urgente Recomendado:**\n\n${urgentTasks
        .map((t, idx) => `${idx + 1}. **${t.title}** (${t.status === "doing" ? "Em andamento" : "A Fazer"}${t.due ? ` • Prazo: ${t.due}` : ""})`)
        .join("\n")}\n\nRecomendo começar pela primeira da lista para destravar o fluxo!`;
    }

    // 5. Sugestão de divisão / breakdown
    if (lower.includes("dividir") || lower.includes("breakdown") || lower.includes("subtarefa")) {
      return `💡 **Dica de Breakdown:**\nPara quebrar qualquer tarefa complexa:\n1. Defina o objetivo mensurável inicial\n2. Isole as dependências ou pré-requisitos técnicos\n3. Execute a implementação mínima funcional\n4. Valide e adicione testes\n\nVocê também pode abrir o modal de detalhes de qualquer tarefa para adicionar subtarefas interativas com checkboxes!`;
    }

    // 6. Resposta padrão contextual
    return `Entendido! Analisando seu projeto com **${tasks.length} tarefas** distribuídas em **${projects.length} projeto(s)**. Se quiser, peça para eu criar tarefas ("criar tarefa X"), listar as urgentes ("o que é urgente?") ou resumir o board!`;
  };

  const send = (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text) return;
    const userMsg: ChatMsg = { id: uid(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    if (!overrideText) setInput("");

    setTimeout(() => {
      const replyText = processQuery(text);
      const aiReply: ChatMsg = { id: uid(), role: "ai", text: replyText };
      setMessages((m) => [...m, aiReply]);
    }, 350);
  };

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex border-l border-border/60 bg-card shadow-2xl transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      )}
      style={{ width: `${widthPct}vw`, minWidth: 320 }}
    >
      <div
        onMouseDown={() => setResizing(true)}
        className={cn(
          "absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40",
          resizing && "bg-primary/60",
        )}
      />
      <div className="flex h-full w-full flex-col">
        <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3 shrink-0">
          <div className="grid h-6 w-6 place-items-center rounded-md" style={{ background: "var(--gradient-magic)" }}>
            <Sparkles className="h-3.5 w-3.5 text-background" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Nimbus AI</div>
            <div className="text-[10px] text-muted-foreground">Copiloto Inteligente de Produtividade</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Quick action prompts */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border/40 bg-secondary/20 shrink-0">
          <button
            onClick={() => send("Resumo do quadro")}
            className="rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            📊 Resumo do quadro
          </button>
          <button
            onClick={() => send("O que é urgente?")}
            className="rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            🔥 O que é urgente?
          </button>
          <button
            onClick={() => send("Criar tarefa Revisar pendências alta prioridade")}
            className="rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            ➕ Criar tarefa rápida
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 min-h-0">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground font-medium"
                    : "rounded-bl-sm border border-border/60 bg-secondary/40 text-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/60 p-3 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-2 py-1.5 focus-within:border-primary/60">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pergunte ao Nimbus ou digite 'criar tarefa...'…"
              className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
            />
            <Button size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => send()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}