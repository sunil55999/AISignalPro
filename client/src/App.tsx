import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import UserDashboard from "@/components/UserDashboard";
import AdminPanel from "@/components/AdminPanel";
import SignalParser from "@/components/SignalParser";
import ParseHistory from "@/components/ParseHistory";
import TrainingData from "@/components/TrainingData";
import RuleEngine from "@/components/RuleEngine";
import Analytics from "@/components/Analytics";
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="flex h-screen bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={UserDashboard} />
          <Route path="/dashboard" component={UserDashboard} />
          <Route path="/signals" component={SignalParser} />
          <Route path="/trades" component={ParseHistory} />
          <Route path="/settings" component={UserDashboard} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/parser" component={RuleEngine} />
          <Route path="/logs" component={TrainingData} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/history" component={ParseHistory} />
          <Route path="/training" component={TrainingData} />
          <Route path="/rules" component={RuleEngine} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
