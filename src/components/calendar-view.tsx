import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Star, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskDoc } from "@/lib/firestore";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CalendarView({
  tasks,
  onOpenTask,
  onAddTaskDate,
}: {
  tasks: TaskDoc[];
  onOpenTask: (task: TaskDoc) => void;
  onAddTaskDate: (dateStr: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group tasks by due date (YYYY-MM-DD)
  const tasksByDate = new Map<string, TaskDoc[]>();
  tasks.forEach((t) => {
    if (t.due) {
      const list = tasksByDate.get(t.due) || [];
      list.push(t);
      tasksByDate.set(t.due, list);
    }
  });

  const cells = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    cells.push({ day: d, dateStr, currentMonth: false, dateObj });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    cells.push({ day: d, dateStr, currentMonth: true, dateObj });
  }

  // Next month leading days (fill up to 35 or 42 cells)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    cells.push({ day: d, dateStr, currentMonth: false, dateObj });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 pb-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="outline" size="sm" onClick={setToday} className="h-7 text-xs border-border/60">
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/60 text-center text-xs font-medium text-muted-foreground py-2">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-7 auto-rows-fr border-l border-t border-border/40">
        {cells.map(({ day, dateStr, currentMonth, dateObj }, idx) => {
          const isToday =
            dateObj.getFullYear() === today.getFullYear() &&
            dateObj.getMonth() === today.getMonth() &&
            dateObj.getDate() === today.getDate();

          const dayTasks = tasksByDate.get(dateStr) || [];

          return (
            <div
              key={idx}
              className={cn(
                "group relative min-h-[110px] p-2 border-r border-b border-border/40 flex flex-col transition-colors",
                !currentMonth ? "bg-secondary/10 text-muted-foreground/40" : "bg-card/40 hover:bg-card/70",
                isToday && "bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold h-6 w-6 grid place-items-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}
                >
                  {day}
                </span>

                <button
                  onClick={() => onAddTaskDate(dateStr)}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-opacity"
                  title="Criar tarefa nesta data"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Tasks chips */}
              <div className="mt-1.5 flex-1 space-y-1 overflow-y-auto max-h-[85px]">
                {dayTasks.map((t) => {
                  const done = t.status === "done";
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      className={cn(
                        "w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition-all flex items-center gap-1 border",
                        done
                          ? "bg-secondary/30 text-muted-foreground line-through border-transparent opacity-60"
                          : t.priority === "high"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:border-rose-500/60"
                          : t.priority === "med"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-500/60"
                          : "bg-secondary/60 text-foreground border-border/60 hover:border-border"
                      )}
                      title={t.title}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          done ? "bg-emerald-400" : t.priority === "high" ? "bg-rose-400" : "bg-amber-400"
                        )}
                      />
                      <span className="truncate">{t.title}</span>
                      {t.isStarred && <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300 shrink-0 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
