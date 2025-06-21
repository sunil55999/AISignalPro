import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Activity, 
  Zap,
  MessageSquare,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Globe,
  Settings
} from "lucide-react";
import WeeklyReportModal from "@/components/WeeklyReportModal";

export default function DesktopDashboard() {
  // Fetch user settings
  const { data: userSettings = {} } = useQuery({
    queryKey: ["/api/user/1/settings"],
  });

  // Fetch user performance
  const { data: performance = {} } = useQuery({
    queryKey: ["/api/stats/user/1/performance"],
  });

  // Fetch signals
  const { data: signals = [] } = useQuery({
    queryKey: ["/api/user/1/signals"],
  });

  // Fetch channels
  const { data: channels = [] } = useQuery({
    queryKey: ["/api/admin/channels"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor your AI signal parsing and trading performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <WeeklyReportModal />
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Today's Signals</p>
                <p className="text-3xl font-bold">247</p>
                <p className="text-blue-200 text-sm">+12% from yesterday</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Parse Accuracy</p>
                <p className="text-3xl font-bold">89.2%</p>
                <p className="text-green-200 text-sm">Above target 85%</p>
              </div>
              <Target className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Active Channels</p>
                <p className="text-3xl font-bold">{(channels as any[]).length}</p>
                <p className="text-purple-200 text-sm">All monitoring</p>
              </div>
              <Globe className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-orange-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">System Health</p>
                <p className="text-3xl font-bold">98.5%</p>
                <p className="text-orange-200 text-sm">All systems operational</p>
              </div>
              <Activity className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
            Overview
          </TabsTrigger>
          <TabsTrigger value="signals" className="data-[state=active]:bg-blue-600">
            Recent Signals
          </TabsTrigger>
          <TabsTrigger value="channels" className="data-[state=active]:bg-blue-600">
            Channel Status
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
            Risk Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Win Rate</span>
                    <span className="text-green-400 font-mono">72.5%</span>
                  </div>
                  <Progress value={72.5} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Risk/Reward Ratio</span>
                    <span className="text-blue-400 font-mono">1:2.3</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Max Drawdown</span>
                    <span className="text-yellow-400 font-mono">-3.2%</span>
                  </div>
                  <Progress value={32} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'success', message: 'XAUUSD signal parsed - Entry: 1985.50', time: '2 min ago' },
                    { type: 'success', message: 'EURUSD trade executed successfully', time: '5 min ago' },
                    { type: 'warning', message: 'Low confidence signal rejected', time: '8 min ago' },
                    { type: 'success', message: 'Channel @ForexPro connected', time: '15 min ago' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'success' ? 'bg-green-500' : 
                        activity.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">{activity.message}</p>
                        <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
                      </div>
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
              <CardTitle className="text-white">Recent Signals</CardTitle>
            </CardHeader>
            <CardContent>
              {(signals as any[]).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No signals processed yet</p>
                  <p className="text-sm mt-2">Signals will appear here once channels are active</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(signals as any[]).slice(0, 10).map((signal: any) => (
                    <div key={signal.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={signal.confidence >= 85 ? "default" : "secondary"}>
                          {Math.round(signal.confidence)}% confidence
                        </Badge>
                        <span className="text-white font-mono">{signal.pair}</span>
                        <span className="text-gray-300">{signal.action}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300">{signal.entry}</p>
                        <p className="text-gray-500 text-sm">{new Date(signal.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(channels as any[]).map((channel: any) => (
              <Card key={channel.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{channel.name}</CardTitle>
                    <Badge variant={channel.isActive ? "default" : "secondary"} className={channel.isActive ? "bg-green-600" : ""}>
                      {channel.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-400 text-sm">{channel.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Confidence Threshold</span>
                    <span className="text-blue-400 font-mono">{Math.round((channel.confidenceThreshold || 0.85) * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Status</span>
                    <div className="flex items-center space-x-2">
                      {channel.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-gray-300 text-sm">
                        {channel.isActive ? "Monitoring" : "Paused"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Risk Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Max Lot Size</span>
                  <span className="text-white font-mono">{(userSettings as any)?.maxLot || 0.1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Risk Per Trade</span>
                  <span className="text-white font-mono">{(userSettings as any)?.riskPercent || 2}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Max Daily Trades</span>
                  <span className="text-white font-mono">{(userSettings as any)?.maxDailyTrades || 10}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Signal Copier</span>
                  <Badge variant={(userSettings as any)?.enableSignalCopier ? "default" : "secondary"}>
                    {(userSettings as any)?.enableSignalCopier ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Trading Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Execution Mode</span>
                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                    {(userSettings as any)?.executionMode || "Auto"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Min Confidence</span>
                  <span className="text-white font-mono">{Math.round(((userSettings as any)?.minConfidence || 0.85) * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Timezone</span>
                  <span className="text-white">{(userSettings as any)?.timezone || "UTC"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Max Drawdown</span>
                  <span className="text-white font-mono">{(userSettings as any)?.maxDrawdown || 10}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}