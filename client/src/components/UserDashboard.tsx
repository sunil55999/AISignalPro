import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  CheckCircle, 
  XCircle,
  Play,
  Pause,
  Target,
  Shield
} from "lucide-react";

export default function UserDashboard() {
  const { toast } = useToast();
  const [userId] = useState(1); // Mock user ID - in real app would come from auth
  
  // Fetch user settings
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/user/${userId}/settings`],
  });

  // Fetch user performance
  const { data: performance } = useQuery({
    queryKey: [`/api/stats/user/${userId}/performance`],
  });

  // Fetch user signals
  const { data: userSignals = [] } = useQuery({
    queryKey: [`/api/user/${userId}/signals`],
  });

  // Fetch user trades
  const { data: userTrades = [] } = useQuery({
    queryKey: [`/api/user/${userId}/alerts`],
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest("PUT", `/api/user/${userId}/settings`, settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${userId}/settings`] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Mock chart data for performance tracking
  const performanceData = [
    { date: '2025-01-01', profit: 150, trades: 5 },
    { date: '2025-01-02', profit: 300, trades: 8 },
    { date: '2025-01-03', profit: 180, trades: 6 },
    { date: '2025-01-04', profit: 450, trades: 12 },
    { date: '2025-01-05', profit: 220, trades: 7 },
    { date: '2025-01-06', profit: 380, trades: 9 },
  ];

  const handleSettingsUpdate = (field: string, value: any) => {
    if (!userSettings) return;
    
    updateSettings.mutate({
      ...userSettings,
      [field]: value
    });
  };

  const toggleSignalCopier = () => {
    handleSettingsUpdate('enableSignalCopier', !userSettings?.enableSignalCopier);
  };

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'executed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getTradeResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-500';
      case 'loss': return 'text-red-500';
      case 'breakeven': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  if (settingsLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-900 to-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
          <p className="text-gray-400">Manage your signal copier and track performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={userSettings?.enableSignalCopier || false}
              onCheckedChange={toggleSignalCopier}
              className="data-[state=checked]:bg-green-500"
            />
            <Label className="text-white">Signal Copier</Label>
            {userSettings?.enableSignalCopier ? (
              <Play className="w-4 h-4 text-green-500" />
            ) : (
              <Pause className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Trades</p>
                <p className="text-2xl font-bold text-white">{performance?.totalTrades || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">+12% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-white">{performance?.winRate || 0}%</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">Above target</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total P&L</p>
                <p className="text-2xl font-bold text-white">${performance?.totalPnl || 0}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">+8.2% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Risk Reward</p>
                <p className="text-2xl font-bold text-white">{performance?.avgRiskReward || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">Optimal range</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-white data-[state=active]:bg-blue-600">Overview</TabsTrigger>
          <TabsTrigger value="signals" className="text-white data-[state=active]:bg-blue-600">Live Signals</TabsTrigger>
          <TabsTrigger value="trades" className="text-white data-[state=active]:bg-blue-600">Trade History</TabsTrigger>
          <TabsTrigger value="settings" className="text-white data-[state=active]:bg-blue-600">Risk Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Overview</CardTitle>
              <p className="text-gray-400">Daily profit and trade volume</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userSignals.slice(0, 5).map((signal: any) => (
                    <div key={signal.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{signal.pair || 'Unknown'}</span>
                          <Badge variant="outline" className="text-xs">
                            {signal.action?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          Entry: {signal.entry} | SL: {signal.sl}
                        </p>
                      </div>
                      <Badge variant={signal.confidence > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(signal.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Active Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTrades.filter((trade: any) => trade.status === 'pending').slice(0, 5).map((trade: any) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{trade.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {trade.action?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          Lot: {trade.lot} | Entry: {trade.entry}
                        </p>
                      </div>
                      <Badge variant={getTradeStatusColor(trade.status)}>
                        {trade.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Live Signal Feed</CardTitle>
              <p className="text-gray-400">Real-time parsed signals from your enabled channels</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-300">Pair</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                    <TableHead className="text-gray-300">Entry</TableHead>
                    <TableHead className="text-gray-300">SL</TableHead>
                    <TableHead className="text-gray-300">TP</TableHead>
                    <TableHead className="text-gray-300">Confidence</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSignals.map((signal: any) => (
                    <TableRow key={signal.id} className="border-gray-700">
                      <TableCell className="text-gray-300">
                        {signal.createdAt ? new Date(signal.createdAt).toLocaleTimeString() : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-white">{signal.pair || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={signal.action === 'buy' ? 'text-green-500' : 'text-red-500'}>
                          {signal.action?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{signal.entry || 'N/A'}</TableCell>
                      <TableCell className="text-gray-300">{signal.sl || 'N/A'}</TableCell>
                      <TableCell className="text-gray-300">
                        {signal.tp && signal.tp.length > 0 ? signal.tp.join(', ') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={signal.confidence > 0.8 ? 'default' : 'secondary'}>
                          {Math.round(signal.confidence * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {signal.manualRuleApplied ? (
                          <Badge variant="outline">Rule Applied</Badge>
                        ) : (
                          <Badge variant="default">AI Parsed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Trade Execution History</CardTitle>
              <p className="text-gray-400">Complete history of executed trades</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Symbol</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                    <TableHead className="text-gray-300">Lot Size</TableHead>
                    <TableHead className="text-gray-300">Entry</TableHead>
                    <TableHead className="text-gray-300">Exit</TableHead>
                    <TableHead className="text-gray-300">P&L</TableHead>
                    <TableHead className="text-gray-300">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTrades.map((trade: any) => (
                    <TableRow key={trade.id} className="border-gray-700">
                      <TableCell className="text-gray-300">
                        {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-white">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={trade.action === 'buy' ? 'text-green-500' : 'text-red-500'}>
                          {trade.action?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{trade.lot}</TableCell>
                      <TableCell className="text-gray-300">{trade.entry || 'N/A'}</TableCell>
                      <TableCell className="text-gray-300">
                        {trade.executedAt ? 'Executed' : 'Pending'}
                      </TableCell>
                      <TableCell className={getTradeResultColor(trade.result)}>
                        ${trade.pnl || '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTradeStatusColor(trade.status)}>
                          {trade.result || trade.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Management */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-gray-300">Risk Percentage per Trade</Label>
                  <div className="mt-2">
                    <Slider
                      value={[userSettings?.riskPercent || 2]}
                      onValueChange={(value) => handleSettingsUpdate('riskPercent', value[0])}
                      max={10}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>0.1%</span>
                      <span className="text-white font-medium">{userSettings?.riskPercent || 2}%</span>
                      <span>10%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Maximum Lot Size</Label>
                  <Input
                    type="number"
                    value={userSettings?.maxLot || 0.1}
                    onChange={(e) => handleSettingsUpdate('maxLot', parseFloat(e.target.value))}
                    className="mt-2 bg-gray-700 border-gray-600 text-white"
                    placeholder="0.1"
                    step="0.01"
                    min="0.01"
                    max="10"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Minimum Confidence Threshold</Label>
                  <div className="mt-2">
                    <Slider
                      value={[userSettings?.tradeFilters?.minConfidence * 100 || 80]}
                      onValueChange={(value) => handleSettingsUpdate('tradeFilters', { 
                        ...userSettings?.tradeFilters, 
                        minConfidence: value[0] / 100 
                      })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>50%</span>
                      <span className="text-white font-medium">
                        {Math.round((userSettings?.tradeFilters?.minConfidence || 0.8) * 100)}%
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trading Controls */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Trading Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Auto Trade Execution</Label>
                    <p className="text-sm text-gray-400">Execute trades automatically when signals are received</p>
                  </div>
                  <Switch
                    checked={userSettings?.enableSignalCopier || false}
                    onCheckedChange={toggleSignalCopier}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Manual Approval Mode</Label>
                    <p className="text-sm text-gray-400">Require manual approval before executing trades</p>
                  </div>
                  <Switch
                    checked={userSettings?.tradeFilters?.requireManualApproval || false}
                    onCheckedChange={(value) => handleSettingsUpdate('tradeFilters', { 
                      ...userSettings?.tradeFilters, 
                      requireManualApproval: value 
                    })}
                  />
                </div>

                <Alert className="bg-gray-700 border-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-gray-300">
                    Signal copier is currently {userSettings?.enableSignalCopier ? 'enabled' : 'disabled'}. 
                    {userSettings?.enableSignalCopier ? ' Trades will be executed automatically based on your risk settings.' : ' No trades will be executed.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}