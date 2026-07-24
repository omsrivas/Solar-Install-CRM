import { useState } from "react";
import { useLocation } from "wouter";
import { SunMedium, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await signIn(email, password);
      setLocation("/dashboard");
    } catch {
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden relative z-10">
        <div className="p-8">
          {/* Brand mark */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-sidebar rounded-xl flex items-center justify-center mb-4 shadow-sm">
              <SunMedium className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-sidebar">Hitech Electropower</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your control center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="h-9 w-full border border-gray-200 rounded-md px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                placeholder="name@hitechelectropower.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="h-9 w-full border border-gray-200 rounded-md px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 w-full h-9 bg-sidebar hover:bg-sidebar/90 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-70 mt-6"
              data-testid="button-submit-login"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-3.5 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400 tracking-wide">Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
}
