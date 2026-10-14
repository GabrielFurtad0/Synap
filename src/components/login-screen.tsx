import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 7.1 29.3 5 24 5 16.3 5 9.7 9.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.7 35.9 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/60 p-8 shadow-2xl">
        <div className="flex items-center gap-2">
          <div
            className="grid h-9 w-9 place-items-center rounded-md"
            style={{ background: "var(--gradient-magic)", boxShadow: "var(--shadow-magic)" }}
          >
            <Sparkles className="h-4 w-4 text-background" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight">Nimbus</div>
            <div className="text-[11px] text-muted-foreground">AI Task Manager</div>
          </div>
        </div>

        <h1 className="mt-7 text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to sync your tasks across devices.
        </p>

        <Button
          onClick={handle}
          disabled={busy}
          className="mt-6 h-10 w-full justify-center gap-3 border border-border/60 bg-secondary/60 text-foreground hover:bg-secondary"
        >
          <GoogleIcon />
          {busy ? "Signing in…" : "Sign in with Google"}
        </Button>

        {err && (
          <p className="mt-3 text-[11px] text-rose-400/90">
            {err}
          </p>
        )}

        <p className="mt-6 text-[10px] leading-relaxed text-muted-foreground/70">
          By continuing you agree to Nimbus' Terms and acknowledge the Privacy Policy.
        </p>
      </div>
    </div>
  );
}