import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RefreshCw, Monitor, Wifi, WifiOff, AlertTriangle, Eye, EyeOff, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface Terminal {
  id: string;
  name: string;
  lastPing: string;
  lastPingFormatted: string;
  minutesSinceLastPing: number;
  mt5AccountId?: number;
  mt5Connected: boolean;
  stealthMode: boolean;
  retryQueueSize: number;
  ipAddress: string;
  version: string;
  status: 'online' | 'offline' | 'warning';
  errorCount24h: number;
  totalSignalsToday: number;
  activeTrades: number;
  balance?: number;
  equity?: number;
  marginFree?: number;
}

interface TerminalStats {
  totalTerminals: number;
  onlineTerminals: number;
  warningTerminals: number;
  offlineTerminals: number;
  totalMT5Accounts: number;
  connectedMT5: number;
  stealthModeActive: number;
  totalRetryQueue: number;
  totalSignalsToday: number;
  totalActiveTrades: number;
  totalErrors24h: number;
  totalBalance: number;
  totalEquity: number;
}

interface TerminalResponse {
  success: boolean;
  terminals: Terminal[];
  totalTerminals: number;
  onlineTerminals: number;
  timestamp: string;
}

interface StatsResponse {
  success: boolean;
  stats: TerminalStats;
  timestamp: string;
}

const StatusBadge: React.FC<{ status: Terminal['status'] }> = ({ status }) => {
  const variants = {
    online: { variant: 'default' as const, icon: Wifi, color: 'text-green-600' },
    warning: { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
    offline: { variant: 'destructive' as const, icon: WifiOff, color: 'text-red-600' }
  };

  const { variant, icon: Icon, color } = variants[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className={`w-3 h-3 ${color}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const TerminalCard: React.FC<{ terminal: Terminal }> = ({ terminal }) => {
  const formatBalance = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{terminal.name}</CardTitle>
          <StatusBadge status={terminal.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="w-4 h-4" />
          <span>{terminal.id}</span>
          <span>•</span>
          <span>v{terminal.version}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Last Ping</div>
            <div className="text-sm text-muted-foreground">
              {formatTime(terminal.minutesSinceLastPing)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">IP Address</div>
            <div className="text-sm text-muted-foreground font-mono">
              {terminal.ipAddress}
            </div>
          </div>
        </div>

        {/* MT5 Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">MT5 Account</span>
            <Badge variant={terminal.mt5Connected ? 'default' : 'secondary'}>
              {terminal.mt5Connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          {terminal.mt5AccountId && (
            <div className="text-sm text-muted-foreground font-mono">
              #{terminal.mt5AccountId}
            </div>
          )}
        </div>

        {/* Account Balance */}
        {terminal.balance && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground">Balance</div>
              <div className="font-medium text-green-600">
                {formatBalance(terminal.balance)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Equity</div>
              <div className="font-medium">
                {formatBalance(terminal.equity)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Free Margin</div>
              <div className="font-medium">
                {formatBalance(terminal.marginFree)}
              </div>
            </div>
          </div>
        )}

        {/* Trading Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Active Trades</div>
            <div className="font-medium">{terminal.activeTrades}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Signals Today</div>
            <div className="font-medium">{terminal.totalSignalsToday}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Errors (24h)</div>
            <div className={`font-medium ${terminal.errorCount24h > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {terminal.errorCount24h}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {terminal.stealthMode ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                Stealth
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Normal
              </Badge>
            )}
          </div>
          
          {terminal.retryQueueSize > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {terminal.retryQueueSize} Retries
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const StatsOverview: React.FC<{ stats: TerminalStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Terminals</p>
              <p className="text-2xl font-bold">{stats.totalTerminals}</p>
            </div>
            <Monitor className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{stats.onlineTerminals} online</span>
            <span className="text-yellow-600">{stats.warningTerminals} warning</span>
            <span className="text-red-600">{stats.offlineTerminals} offline</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">MT5 Connections</p>
              <p className="text-2xl font-bold">{stats.connectedMT5}/{stats.totalMT5Accounts}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.stealthModeActive} in stealth mode
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalBalance.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Equity: ${stats.totalEquity.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Activity</p>
              <p className="text-2xl font-bold">{stats.totalSignalsToday}</p>
            </div>
            <Wifi className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span>{stats.totalActiveTrades} trades</span>
            <span className="text-red-600">{stats.totalErrors24h} errors</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Terminals: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [stats, setStats] = useState<TerminalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTerminals = async () => {
    try {
      setLoading(true);
      
      const [terminalsResponse, statsResponse] = await Promise.all([
        fetch('/api/terminals'),
        fetch('/api/terminals/stats/summary')
      ]);

      if (!terminalsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch terminal data');
      }

      const terminalsData: TerminalResponse = await terminalsResponse.json();
      const statsData: StatsResponse = await statsResponse.json();

      if (terminalsData.success && statsData.success) {
        setTerminals(terminalsData.terminals);
        setStats(statsData.stats);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching terminals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTerminals, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && terminals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading terminals...</p>
        </div>
      </div>
    );
  }

  if (error && terminals.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Terminals</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchTerminals}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Terminal Management</h1>
          <p className="text-muted-foreground">
            Monitor active trading terminals and their MT5 connections
          </p>
        </div>
        <Button onClick={fetchTerminals} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {stats && <StatsOverview stats={stats} />}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Connection Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {terminals.map((terminal) => (
          <TerminalCard key={terminal.id} terminal={terminal} />
        ))}
      </div>

      {terminals.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Terminals Found</h3>
            <p className="text-muted-foreground">
              No active terminals are currently reporting their status.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Terminals;