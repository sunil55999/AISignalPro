import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import UserDashboard from "@/components/UserDashboard";
import AdminPanel from "@/components/AdminPanel";
import SignalParser from "@/components/SignalParser";
import ParseHistory from "@/components/ParseHistory";
import TrainingData from "@/components/TrainingData";
import RuleEngine from "@/components/RuleEngine";
import Analytics from "@/components/Analytics";
import Sidebar from "@/components/Sidebar";
import LoginPage from "@/components/LoginPage";
import MobileAuthenticatedLayout from "@/components/MobileAuthenticatedLayout";
import DesktopLayout from "@/components/DesktopLayout";
import ParserControlPanel from "@/components/ParserControlPanel";
import DesktopDashboard from "@/components/DesktopDashboard";
import { useIsMobile } from "@/hooks/use-mobile";

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const Layout = isMobile ? MobileAuthenticatedLayout : DesktopLayout;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={UserDashboard} />
        <Route path="/dashboard" component={DesktopDashboard} />
        <Route path="/signals" component={SignalParser} />
        <Route path="/trades" component={ParseHistory} />
        <Route path="/settings" component={UserDashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/parser" component={ParserControlPanel} />
        <Route path="/logs" component={TrainingData} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/history" component={ParseHistory} />
        <Route path="/training" component={TrainingData} />
        <Route path="/rules" component={RuleEngine} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AuthenticatedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
