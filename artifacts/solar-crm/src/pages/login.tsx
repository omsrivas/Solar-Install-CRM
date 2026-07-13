import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { SunMedium, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          localStorage.setItem("solar_crm_token", res.token);
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            title: "Login failed",
            description: "Invalid email or password",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-sidebar rounded-xl flex items-center justify-center mb-4">
              <SunMedium className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-sidebar">SunPower Solar CRM</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your control center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                placeholder="name@sunpower.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-sidebar hover:bg-sidebar/90 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
              data-testid="button-submit-login"
            >
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
}
