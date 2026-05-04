import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isPortfolioDemoBuild } from "@/lib/portfolio-demo-build";
import { PortfolioDemoProvider } from "@/context/PortfolioDemoContext";
import AuthPage from "./pages/AuthPage";
import FamilyDashboard from "./pages/FamilyDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import DexcomCallbackPage from "./pages/DexcomCallbackPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow text-4xl">🩺</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function portfolioRoutes() {
  return (
    <>
      <Route element={<PortfolioDemoProvider><Outlet /></PortfolioDemoProvider>}>
        <Route path="/" element={<FamilyDashboard />} />
        <Route path="/member/:memberId" element={<MemberDashboard />} />
      </Route>
      <Route path="/app" element={<AuthGuard><Outlet /></AuthGuard>}>
        <Route index element={<FamilyDashboard />} />
        <Route path="member/:memberId" element={<MemberDashboard />} />
      </Route>
      <Route path="/demo" element={<Navigate to="/" replace />} />
    </>
  );
}

function defaultRoutes() {
  return (
    <>
      <Route path="/" element={<AuthGuard><FamilyDashboard /></AuthGuard>} />
      <Route path="/member/:memberId" element={<AuthGuard><MemberDashboard /></AuthGuard>} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="dark">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dexcom-callback" element={<DexcomCallbackPage />} />
            {isPortfolioDemoBuild() ? portfolioRoutes() : defaultRoutes()}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
