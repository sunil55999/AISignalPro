import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext } from "react";
import StrategyBuilder from "./components/StrategyBuilder";
import Terminals from "./components/dashboard/Terminals";
import ParserManager from "./components/dashboard/ParserManager";

// Simple Auth Context
const AuthContext = createContext<{
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}>({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  login: async () => false,
  logout: async () => {}
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.authenticated);
        setUser(data.user);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      setIsAuthenticated(true);
      setUser(data.user);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

// Simple Login Component
function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await login(username, password);
      if (!success) {
        setError("Invalid credentials");
      }
    } catch (error) {
      setError("Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">AI Trading Signal Parser</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>
        <p className="text-gray-400 text-sm mt-4 text-center">
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}

// Simple Dashboard Component
function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ totalSignals: 0, totalTrades: 0, averageConfidence: 0 });
  const [signalText, setSignalText] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  const parseSignal = async () => {
    if (!signalText.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/parse-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: signalText })
      });
      const data = await res.json();
      setParseResult(data);
    } catch (error) {
      console.error('Parsing failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">AI Trading Signal Parser</h1>
            <nav className="flex gap-4">
              <a href="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
              <a href="/strategy-builder" className="text-gray-300 hover:text-white transition-colors">Strategy Builder</a>
              <a href="/terminals" className="text-gray-300 hover:text-white transition-colors">Terminals</a>
              <a href="/parser" className="text-gray-300 hover:text-white transition-colors">Parser</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Welcome, {user?.username}</span>
            <button
              onClick={logout}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Signals</h3>
            <p className="text-3xl font-bold text-blue-400">{stats.totalSignals}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Trades</h3>
            <p className="text-3xl font-bold text-green-400">{stats.totalTrades}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Average Confidence</h3>
            <p className="text-3xl font-bold text-yellow-400">{(stats.averageConfidence * 100).toFixed(1)}%</p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Signal Parser</h2>
          <div className="space-y-4">
            <textarea
              value={signalText}
              onChange={(e) => setSignalText(e.target.value)}
              placeholder="Enter trading signal text here..."
              className="w-full h-32 p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
            />
            <button
              onClick={parseSignal}
              disabled={isLoading || !signalText.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Parsing...' : 'Parse Signal'}
            </button>
            
            {parseResult && (
              <div className="mt-4 p-4 bg-gray-700 rounded">
                <h3 className="font-semibold mb-2">Parse Result:</h3>
                <pre className="text-sm overflow-auto">{JSON.stringify(parseResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/strategy-builder">
        <div className="h-screen">
          <StrategyBuilder />
        </div>
      </Route>
      <Route path="/terminals">
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
              <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold">AI Trading Signal Parser</h1>
                <nav className="flex gap-4">
                  <a href="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
                  <a href="/strategy-builder" className="text-gray-300 hover:text-white transition-colors">Strategy Builder</a>
                  <a href="/terminals" className="text-white font-medium">Terminals</a>
                </nav>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto p-6">
            <Terminals />
          </div>
        </div>
      </Route>
      <Route path="/parser">
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
              <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold">AI Trading Signal Parser</h1>
                <nav className="flex gap-4">
                  <a href="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
                  <a href="/strategy-builder" className="text-gray-300 hover:text-white transition-colors">Strategy Builder</a>
                  <a href="/terminals" className="text-gray-300 hover:text-white transition-colors">Terminals</a>
                  <a href="/parser" className="text-white font-medium">Parser</a>
                </nav>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto p-6">
            <ParserManager />
          </div>
        </div>
      </Route>
      <Route component={() => <div>404 - Page not found</div>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
