import { createFileRoute } from "@tanstack/react-router";
import { TaskBoard } from "@/components/task-board";
import { LoginScreen } from "@/components/login-screen";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nimbus — AI Task Manager" },
      { name: "description", content: "A focused, AI-powered dark-mode task manager with Kanban workflows and intelligent task breakdowns." },
      { property: "og:title", content: "Nimbus — AI Task Manager" },
      { property: "og:description", content: "A focused, AI-powered dark-mode task manager with Kanban workflows and intelligent task breakdowns." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <TaskBoard />;
}
