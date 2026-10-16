import { createFileRoute } from "@tanstack/react-router";
import { TaskBoard } from "@/components/task-board";
import { LoginScreen } from "@/components/login-screen";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Synap - Neural Task Engine" },
      { name: "description", content: "Synap é um Smart Task Manager moderno com design minimalista, copiloto de IA e execução autônoma AntiGravity." },
      { property: "og:title", content: "Synap - Neural Task Engine" },
      { property: "og:description", content: "Synap é um Smart Task Manager moderno com design minimalista, copiloto de IA e execução autônoma AntiGravity." },
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
