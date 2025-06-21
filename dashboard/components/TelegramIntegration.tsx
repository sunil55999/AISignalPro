import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Plus,
  User,
  Globe,
  Shield,
  Star,
  Settings,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Bot,
  Zap,
  Search
} from 'lucide-react';

interface TelegramSession {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isOnline: boolean;
  lastSeen: string;
}

interface TelegramChannel {
  id: string;
  name: string;
  title: string;
  memberCount: number;
  description: string;
  isVerified: boolean;
  trustScore: number;
  provider: string;
  strategy: string;
  isActive: boolean;
}

export default function TelegramIntegration() {
  const { toast } = useToast();
  const [sessionDialog, setSessionDialog] = useState(false);
  const [channelDialog, setChannelDialog] = useState(false);
  const [scanDialog, setScanDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with real API calls
  const telegramSessions: TelegramSession[] = [
    {
      id: '1',
      username: 'trader_pro',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      isOnline: true,
      lastSeen: 'Online'
    }
  ];

  const availableChannels: TelegramChannel[] = [
    {
      id: '1',
      name: '@ForexPro',
      title: 'Forex Professional Signals',
      memberCount: 25000,
      description: 'Professional forex trading signals with 85% accuracy',
      isVerified: true,
      trustScore: 92,
      provider: 'ForexPro',
      strategy: 'Scalping',
      isActive: true
    },
    {
      id: '2',
      name: '@XAUUSDExpert',
      title: 'Gold Trading Expert',
      memberCount: 18000,
      description: 'Specialized XAUUSD signals for gold trading',
      isVerified: true,
      trustScore: 88,
      provider: 'GoldExpert',
      strategy: 'Swing Trading',
      isActive: false
    },
    {
      id: '3',
      name: '@CryptoSignals',
      title: 'Crypto Trading Signals',
      memberCount: 32000,
      description: 'Cryptocurrency trading signals and analysis',
      isVerified: false,
      trustScore: 75,
      provider: 'CryptoTrader',
      strategy: 'Day Trading',
      isActive: false
    }
  ];

  const addSession = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await apiRequest('POST', '/api/telegram/sessions', sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/sessions'] });
      setSessionDialog(false);
      toast({
        title: 'Session Added',
        description: 'Telegram session connected successfully',
      });
    },
  });

  const toggleChannel = useMutation({
    mutationFn: async ({ channelId, active }: { channelId: string; active: boolean }) => {
      const response = await apiRequest('POST', '/api/telegram/channels/toggle', {
        channelId,
        active
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Channel Updated',
        description: 'Channel status changed successfully',
      });
    },
  });

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const sessionData = {
      phoneNumber: formData.get('phoneNumber') as string,
      apiId: formData.get('apiId') as string,
      apiHash: formData.get('apiHash') as string,
    };

    addSession.mutate(sessionData);
  };

  const handleChannelToggle = (channelId: string, active: boolean) => {
    toggleChannel.mutate({ channelId, active });
  };

  const filteredChannels = availableChannels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <MessageSquare className="w-8 h-8 mr-3" />
            Telegram Integration
          </h1>
          <p className="text-gray-400 mt-1">Connect your Telegram accounts and manage signal channels</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setScanDialog(true)}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Search className="w-4 h-4 mr-2" />
            Scan Channels
          </Button>
          
          <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add Telegram Account</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Connect a new Telegram account to monitor channels
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddSession} className="space-y-4">
                <div>
                  <Label className="text-gray-300">Phone Number</Label>
                  <Input
                    name="phoneNumber"
                    placeholder="+1234567890"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">API ID</Label>
                  <Input
                    name="apiId"
                    placeholder="Your Telegram API ID"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">API Hash</Label>
                  <Input
                    name="apiHash"
                    placeholder="Your Telegram API Hash"
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-400 font-medium">How to get API credentials:</p>
                      <ol className="text-gray-300 mt-1 space-y-1">
                        <li>1. Go to my.telegram.org</li>
                        <li>2. Log in with your phone number</li>
                        <li>3. Create a new application</li>
                        <li>4. Copy API ID and API Hash</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSessionDialog(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addSession.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {addSession.isPending ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-blue-600">
            <User className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="channels" className="data-[state=active]:bg-blue-600">
            <Bot className="w-4 h-4 mr-2" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-blue-600">
            <Star className="w-4 h-4 mr-2" />
            Providers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Connected Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {telegramSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No Telegram accounts connected</p>
                  <p className="text-sm mt-2">Add your first account to start monitoring channels</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {telegramSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {session.firstName} {session.lastName}
                          </p>
                          <p className="text-gray-400 text-sm">@{session.username}</p>
                          <p className="text-gray-500 text-xs">{session.phoneNumber}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={session.isOnline ? "default" : "secondary"}
                          className={session.isOnline ? "bg-green-600" : ""}
                        >
                          {session.isOnline ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Online</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> {session.lastSeen}</>
                          )}
                        </Badge>
                        
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search channels, providers, or strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Available Channels</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Channel</TableHead>
                    <TableHead className="text-gray-300">Provider</TableHead>
                    <TableHead className="text-gray-300">Strategy</TableHead>
                    <TableHead className="text-gray-300">Trust Score</TableHead>
                    <TableHead className="text-gray-300">Members</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChannels.map((channel) => (
                    <TableRow key={channel.id} className="border-gray-700">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{channel.name}</p>
                            <p className="text-gray-400 text-sm">{channel.title}</p>
                          </div>
                          {channel.isVerified && (
                            <Badge variant="outline" className="border-blue-500 text-blue-400">
                              <Shield className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-gray-300">{channel.provider}</TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                          {channel.strategy}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            channel.trustScore >= 90 ? 'bg-green-500' :
                            channel.trustScore >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-white font-mono">{channel.trustScore}%</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-gray-300">
                        {(channel.memberCount / 1000).toFixed(1)}k
                      </TableCell>
                      
                      <TableCell>
                        <Switch
                          checked={channel.isActive}
                          onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300">
                            <Settings className="w-4 h-4" />
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

        <TabsContent value="providers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(new Set(availableChannels.map(c => c.provider))).map((provider) => {
              const providerChannels = availableChannels.filter(c => c.provider === provider);
              const avgTrustScore = Math.round(
                providerChannels.reduce((sum, c) => sum + c.trustScore, 0) / providerChannels.length
              );
              
              return (
                <Card key={provider} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{provider}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={`${
                          avgTrustScore >= 90 ? 'border-green-500 text-green-400' :
                          avgTrustScore >= 80 ? 'border-yellow-500 text-yellow-400' :
                          'border-red-500 text-red-400'
                        }`}
                      >
                        {avgTrustScore}% Trust
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Channels</span>
                      <span className="text-white font-mono">{providerChannels.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Active</span>
                      <span className="text-green-400 font-mono">
                        {providerChannels.filter(c => c.isActive).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Total Members</span>
                      <span className="text-blue-400 font-mono">
                        {Math.round(providerChannels.reduce((sum, c) => sum + c.memberCount, 0) / 1000)}k
                      </span>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          // View provider details
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}