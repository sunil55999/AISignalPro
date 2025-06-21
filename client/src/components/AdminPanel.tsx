import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Database, 
  Brain, 
  Users, 
  Activity, 
  Settings, 
  Upload,
  Download,
  Play,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server
} from "lucide-react";

export default function AdminPanel() {
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [isRetraining, setIsRetraining] = useState(false);
  const [newChannelDialog, setNewChannelDialog] = useState(false);

  // Fetch admin data
  const { data: channels = [] } = useQuery({
    queryKey: ["/api/admin/channels"],
  });

  const { data: tradeLogs = [] } = useQuery({
    queryKey: ["/api/admin/trades/logs"],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/messages"],
  });

  const { data: providerStats = [] } = useQuery({
    queryKey: ["/api/stats/providers"],
  });

  const { data: manualRules = [] } = useQuery({
    queryKey: ["/api/manual-rules"],
  });

  // Create channel mutation
  const createChannel = useMutation({
    mutationFn: async (channelData: any) => {
      const response = await apiRequest("POST", "/api/admin/channels", channelData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      setNewChannelDialog(false);
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    },
  });

  // Update channel mutation
  const updateChannel = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/channels/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({
        title: "Success",
        description: "Channel updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive",
      });
    },
  });

  // Retrain parser mutation
  const retrainParser = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/parser/retrain", { userId: 1 });
      return response.json();
    },
    onSuccess: () => {
      setIsRetraining(false);
      toast({
        title: "Success",
        description: "Parser retrained successfully",
      });
    },
    onError: () => {
      setIsRetraining(false);
      toast({
        title: "Error",
        description: "Failed to retrain parser",
        variant: "destructive",
      });
    },
  });

  const handleChannelToggle = (channelId: number, isActive: boolean) => {
    updateChannel.mutate({ id: channelId, data: { isActive } });
  };

  const handleRetrainParser = async () => {
    setIsRetraining(true);
    retrainParser.mutate();
  };

  const handleNewChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    createChannel.mutate({
      name: formData.get("name"),
      description: formData.get("description"),
      confidenceThreshold: parseFloat(formData.get("confidenceThreshold") as string),
      isActive: true,
      userId: 1
    });
  };

  // Chart data
  const parsingAccuracyData = [
    { date: '2025-01-01', accuracy: 85, signals: 45 },
    { date: '2025-01-02', accuracy: 88, signals: 67 },
    { date: '2025-01-03', accuracy: 91, signals: 52 },
    { date: '2025-01-04', accuracy: 89, signals: 78 },
    { date: '2025-01-05', accuracy: 93, signals: 61 },
    { date: '2025-01-06', accuracy: 87, signals: 84 },
  ];

  const channelPerformanceData = channels.map((channel: any) => ({
    name: channel.name,
    signals: Math.floor(Math.random() * 100) + 50,
    accuracy: Math.floor(Math.random() * 20) + 80,
    active: channel.isActive
  }));

  const pieData = [
    { name: 'AI Parsed', value: 75, color: '#10B981' },
    { name: 'Manual Rules', value: 20, color: '#3B82F6' },
    { name: 'Failed', value: 5, color: '#EF4444' },
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-900 to-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
          <p className="text-gray-400">Manage signal parsing, channels, and system performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleRetrainParser} 
            disabled={isRetraining}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRetraining ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retraining...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Retrain Parser
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Channels</p>
                <p className="text-2xl font-bold text-white">{channels.filter((c: any) => c.isActive).length}</p>
              </div>
              <Server className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">All systems operational</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Messages Today</p>
                <p className="text-2xl font-bold text-white">{messages.length}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">+15% vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Parsing Accuracy</p>
                <p className="text-2xl font-bold text-white">89.2%</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">+2.1% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Rules</p>
                <p className="text-2xl font-bold text-white">{manualRules.filter((r: any) => r.isActive).length}</p>
              </div>
              <Settings className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500">Optimally configured</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="channels" className="text-white data-[state=active]:bg-blue-600">Channel Management</TabsTrigger>
          <TabsTrigger value="parser" className="text-white data-[state=active]:bg-blue-600">Parser Control</TabsTrigger>
          <TabsTrigger value="logs" className="text-white data-[state=active]:bg-blue-600">Execution Logs</TabsTrigger>
          <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-blue-600">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Channel Management</h2>
            <Dialog open={newChannelDialog} onOpenChange={setNewChannelDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Channel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleNewChannel} className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Channel Name</Label>
                    <Input 
                      name="name" 
                      placeholder="@SignalChannel" 
                      required 
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea 
                      name="description" 
                      placeholder="Channel description..." 
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Confidence Threshold (%)</Label>
                    <Input 
                      name="confidenceThreshold" 
                      type="number" 
                      defaultValue="85" 
                      min="50" 
                      max="100" 
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setNewChannelDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Create Channel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Channel</TableHead>
                    <TableHead className="text-gray-300">Description</TableHead>
                    <TableHead className="text-gray-300">Confidence Threshold</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Messages</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel: any) => (
                    <TableRow key={channel.id} className="border-gray-700">
                      <TableCell className="font-medium text-white">{channel.name}</TableCell>
                      <TableCell className="text-gray-300">{channel.description || 'No description'}</TableCell>
                      <TableCell className="text-gray-300">{Math.round((channel.confidenceThreshold || 0) * 100)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={channel.isActive}
                            onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                            {channel.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {messages.filter((m: any) => m.channelId === channel.id).length}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parser" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parser Status */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Parser Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Model Version</span>
                  <Badge variant="default">v2.1.0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Last Training</span>
                  <span className="text-white">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Training Data Size</span>
                  <span className="text-white">15,432 samples</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Model Accuracy</span>
                  <span className="text-green-500 font-semibold">89.2%</span>
                </div>
              </CardContent>
            </Card>

            {/* Parsing Distribution */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Parsing Method Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-gray-300">{entry.name}: {entry.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parser Performance Chart */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Parser Accuracy Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={parsingAccuracyData}>
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
                    dataKey="accuracy" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="signals" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Trade Execution Logs</CardTitle>
              <p className="text-gray-400">Monitor MT5 trade execution and system events</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Timestamp</TableHead>
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                    <TableHead className="text-gray-300">Entity</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeLogs.map((log: any) => (
                    <TableRow key={log.id} className="border-gray-700">
                      <TableCell className="text-gray-300">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-white">User {log.userId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{log.entityType}</TableCell>
                      <TableCell>
                        <Badge variant="default">Success</Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Provider Performance */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Provider Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="signals" fill="#3B82F6" />
                  <Bar dataKey="accuracy" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Provider Stats Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Detailed Provider Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Provider</TableHead>
                    <TableHead className="text-gray-300">Total Signals</TableHead>
                    <TableHead className="text-gray-300">Win Rate</TableHead>
                    <TableHead className="text-gray-300">Avg R:R</TableHead>
                    <TableHead className="text-gray-300">Avg Execution Time</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerStats.map((provider: any, index: number) => (
                    <TableRow key={index} className="border-gray-700">
                      <TableCell className="font-medium text-white">
                        {provider.channel?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {provider.stats?.totalSignals || 0}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {provider.stats?.winRate || 0}%
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {provider.stats?.avgRiskReward || 0}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {provider.stats?.avgExecutionTime || 0}ms
                      </TableCell>
                      <TableCell>
                        <Badge variant={provider.channel?.isActive ? 'default' : 'secondary'}>
                          {provider.channel?.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}