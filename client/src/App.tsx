import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/components/Dashboard";
import SignalParser from "@/components/SignalParser";
import ParseHistory from "@/components/ParseHistory";
import TrainingData from "@/components/TrainingData";
import RuleEngine from "@/components/RuleEngine";
import Analytics from "@/components/Analytics";
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/parser" component={SignalParser} />
          <Route path="/history" component={ParseHistory} />
          <Route path="/training" component={TrainingData} />
          <Route path="/rules" component={RuleEngine} />
          <Route path="/analytics" component={Analytics} />
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
