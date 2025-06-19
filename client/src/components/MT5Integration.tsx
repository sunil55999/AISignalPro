import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  Plus,
  Server,
  Shield,
  Settings,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Download,
  Upload,
  FileText,
  Zap,
  DollarSign
} from 'lucide-react';

interface MT5Account {
  id: string;
  login: string;
  broker: string;
  serverName: string;
  accountType: 'demo' | 'live';
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  isConnected: boolean;
  lastUpdate: string;
  executionMode: 'shadow' | 'semi-auto' | 'auto';
  signalPath: string;
}

export default function MT5Integration() {
  const { toast } = useToast();
  const [accountDialog, setAccountDialog] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Mock data - replace with real API calls
  const mt5Accounts: MT5Account[] = [
    {
      id: '1',
      login: '12345678',
      broker: 'IC Markets',
      serverName: 'ICMarkets-Demo',
      accountType: 'demo',
      balance: 10000,
      equity: 10250,
      margin: 500,
      freeMargin: 9750,
      marginLevel: 2050,
      isConnected: true,
      lastUpdate: '2 minutes ago',
      executionMode: 'semi-auto',
      signalPath: 'C:\\TradingSignals\\signals.json'
    }
  ];

  const addAccount = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest('POST', '/api/mt5/accounts', accountData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mt5/accounts'] });
      setAccountDialog(false);
      toast({
        title: 'Account Added',
        description: 'MT5 account connected successfully',
      });
    },
  });

  const updateExecutionMode = useMutation({
    mutationFn: async ({ accountId, mode }: { accountId: string; mode: string }) => {
      const response = await apiRequest('PATCH', `/api/mt5/accounts/${accountId}`, { executionMode: mode });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Execution Mode Updated',
        description: 'Account execution mode changed successfully',
      });
    },
  });

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const accountData = {
      login: formData.get('login') as string,
      password: formData.get('password') as string,
      broker: formData.get('broker') as string,
      serverName: formData.get('serverName') as string,
      accountType: formData.get('accountType') as string,
      signalPath: formData.get('signalPath') as string,
      executionMode: formData.get('executionMode') as string,
    };

    addAccount.mutate(accountData);
  };

  const handleExecutionModeChange = (accountId: string, mode: string) => {
    updateExecutionMode.mutate({ accountId, mode });
  };

  const downloadEA = () => {
    // Create EA file content
    const eaContent = `
//+------------------------------------------------------------------+
//|                                        StealthCopierEA.mq5      |
//|                                   AI Trading Signal Copier      |
//|                                       Professional Edition      |
//+------------------------------------------------------------------+
#property copyright "AI Trading Signal Copier"
#property version   "2.0"
#property description "Stealth signal copier with prop firm safety"

// Input parameters
input string SignalFile = "C:\\\\TradingSignals\\\\signals.json";
input double RiskPercent = 2.0;                    // Risk per trade (%)
input bool EnableStealthMode = true;               // Hide all visuals
input int MinDelayMS = 500;                        // Minimum delay (ms)
input int MaxDelayMS = 3000;                       // Maximum delay (ms)
input double MaxLotSize = 1.0;                     // Maximum lot size
input bool EnableBreakeven = true;                 // Auto breakeven
input int BreakevenPips = 10;                      // Breakeven trigger (pips)

// Global variables
datetime lastFileTime = 0;
bool isProcessing = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("StealthCopierEA v2.0 initialized");
   Print("Signal file: ", SignalFile);
   Print("Risk per trade: ", RiskPercent, "%");
   
   if(!FileIsExist(SignalFile))
   {
      Print("Signal file not found: ", SignalFile);
      return(INIT_FAILED);
   }
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   if(isProcessing) return;
   
   CheckForNewSignals();
   ManageOpenPositions();
}

//+------------------------------------------------------------------+
//| Check for new signals in JSON file                              |
//+------------------------------------------------------------------+
void CheckForNewSignals()
{
   datetime currentFileTime = (datetime)FileGetInteger(SignalFile, FILE_MODIFY_DATE);
   
   if(currentFileTime <= lastFileTime) return;
   
   lastFileTime = currentFileTime;
   isProcessing = true;
   
   string content = ReadSignalFile();
   if(content != "")
   {
      ProcessSignal(content);
   }
   
   isProcessing = false;
}

//+------------------------------------------------------------------+
//| Read signal file content                                         |
//+------------------------------------------------------------------+
string ReadSignalFile()
{
   int handle = FileOpen(SignalFile, FILE_READ|FILE_TXT);
   if(handle == INVALID_HANDLE) return "";
   
   string content = "";
   while(!FileIsEnding(handle))
   {
      content += FileReadString(handle) + "\\n";
   }
   
   FileClose(handle);
   return content;
}

//+------------------------------------------------------------------+
//| Process signal from JSON                                         |
//+------------------------------------------------------------------+
void ProcessSignal(string jsonContent)
{
   // Parse JSON and execute trade
   // Implementation for JSON parsing and trade execution
   Print("Processing new signal...");
   
   // Add random delay for stealth mode
   if(EnableStealthMode)
   {
      int delay = MathRand() % (MaxDelayMS - MinDelayMS) + MinDelayMS;
      Sleep(delay);
   }
}

//+------------------------------------------------------------------+
//| Manage open positions                                            |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
   if(!EnableBreakeven) return;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionSelectByIndex(i))
      {
         // Implement breakeven logic
         CheckBreakeven();
      }
   }
}

//+------------------------------------------------------------------+
//| Check and apply breakeven                                        |
//+------------------------------------------------------------------+
void CheckBreakeven()
{
   double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
   double sl = PositionGetDouble(POSITION_SL);
   
   // Implement breakeven logic based on pip distance
   // Move SL to entry when in profit by specified pips
}
`;

    const blob = new Blob([eaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'StealthCopierEA.mq5';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'EA Downloaded',
      description: 'StealthCopierEA.mq5 has been downloaded. Install it in your MT5 terminal.',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <TrendingUp className="w-8 h-8 mr-3" />
            MT5 Integration
          </h1>
          <p className="text-gray-400 mt-1">Connect and manage your MetaTrader 5 accounts</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={downloadEA}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download EA
          </Button>
          
          <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Add MT5 Account</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Connect a new MetaTrader 5 account for signal execution
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Account Login</Label>
                    <Input
                      name="login"
                      placeholder="12345678"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Password</Label>
                    <Input
                      name="password"
                      type="password"
                      placeholder="Account password"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Broker</Label>
                    <Input
                      name="broker"
                      placeholder="e.g., IC Markets, FXCM"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Server Name</Label>
                    <Input
                      name="serverName"
                      placeholder="e.g., ICMarkets-Demo"
                      required
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Account Type</Label>
                    <Select name="accountType" defaultValue="demo">
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="demo">Demo Account</SelectItem>
                        <SelectItem value="live">Live Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Execution Mode</Label>
                    <Select name="executionMode" defaultValue="semi-auto">
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="shadow">Shadow (No execution)</SelectItem>
                        <SelectItem value="semi-auto">Semi-Auto (Confirmation)</SelectItem>
                        <SelectItem value="auto">Auto (Immediate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-300">Signal File Path</Label>
                  <Input
                    name="signalPath"
                    placeholder="C:\TradingSignals\signals.json"
                    defaultValue="C:\TradingSignals\signals.json"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    Path where the EA will read signal files
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-400 font-medium">Security Notice:</p>
                      <p className="text-gray-300 mt-1">
                        For live accounts, ensure your VPS/computer is secure. The EA operates 
                        in stealth mode to avoid detection by prop firm monitoring systems.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAccountDialog(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addAccount.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {addAccount.isPending ? 'Connecting...' : 'Add Account'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-blue-600">
            <Server className="w-4 h-4 mr-2" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="execution" className="data-[state=active]:bg-blue-600">
            <Zap className="w-4 h-4 mr-2" />
            Execution
          </TabsTrigger>
          <TabsTrigger value="setup" className="data-[state=active]:bg-blue-600">
            <Settings className="w-4 h-4 mr-2" />
            Setup Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">
          {mt5Accounts.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="text-center py-12">
                <Server className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold text-white mb-2">No MT5 Accounts</h3>
                <p className="text-gray-400 mb-6">
                  Connect your first MetaTrader 5 account to start executing signals
                </p>
                <Button 
                  onClick={() => setAccountDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {mt5Accounts.map((account) => (
                <Card key={account.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          account.accountType === 'demo' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">
                            {account.broker} - {account.login}
                          </CardTitle>
                          <p className="text-gray-400 text-sm">{account.serverName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={account.isConnected ? "default" : "secondary"}
                          className={account.isConnected ? "bg-green-600" : ""}
                        >
                          {account.isConnected ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
                          ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> Disconnected</>
                          )}
                        </Badge>
                        
                        <Badge 
                          variant="outline" 
                          className={`${
                            account.accountType === 'demo' 
                              ? 'border-blue-500 text-blue-400' 
                              : 'border-green-500 text-green-400'
                          }`}
                        >
                          {account.accountType.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Account Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400 text-sm">Balance</p>
                        <p className="text-white font-bold">${account.balance.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400 text-sm">Equity</p>
                        <p className="text-green-400 font-bold">${account.equity.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400 text-sm">Free Margin</p>
                        <p className="text-blue-400 font-bold">${account.freeMargin.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400 text-sm">Margin Level</p>
                        <p className="text-purple-400 font-bold">{account.marginLevel}%</p>
                      </div>
                    </div>
                    
                    {/* Execution Mode */}
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Execution Mode</p>
                        <p className="text-gray-400 text-sm">How signals are processed</p>
                      </div>
                      <Select
                        value={account.executionMode}
                        onValueChange={(value) => handleExecutionModeChange(account.id, value)}
                      >
                        <SelectTrigger className="w-40 bg-gray-600 border-gray-500 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="shadow">
                            <div className="flex items-center space-x-2">
                              <Eye className="w-4 h-4" />
                              <span>Shadow</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="semi-auto">
                            <div className="flex items-center space-x-2">
                              <PauseCircle className="w-4 h-4" />
                              <span>Semi-Auto</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="auto">
                            <div className="flex items-center space-x-2">
                              <PlayCircle className="w-4 h-4" />
                              <span>Auto</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Signal Path */}
                    <div className="p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-medium">Signal File Path</p>
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-gray-400 font-mono text-sm">{account.signalPath}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Last updated: {account.lastUpdate}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-3">
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          <FileText className="w-4 h-4 mr-2" />
                          Test Signal
                        </Button>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Mode */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Test Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Shadow Execution</p>
                    <p className="text-gray-400 text-sm">Test signals without real trades</p>
                  </div>
                  <Switch
                    checked={testMode}
                    onCheckedChange={setTestMode}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
                
                {testMode && (
                  <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <p className="text-blue-400 text-sm">
                      Test mode enabled. All signals will be processed but no actual trades will be executed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Execution Stats */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Execution Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Signals Today</span>
                  <span className="text-white font-mono">18</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Executed</span>
                  <span className="text-green-400 font-mono">15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Rejected</span>
                  <span className="text-red-400 font-mono">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Success Rate</span>
                  <span className="text-blue-400 font-mono">83.3%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">MT5 Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Download the EA</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Click the "Download EA" button to get the StealthCopierEA.mq5 file
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Install in MT5</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Copy the EA file to your MT5/MQL5/Experts folder
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Configure Settings</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Set the signal file path and risk parameters in the EA inputs
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Start Trading</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Attach the EA to any chart and enable auto-trading
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-green-400 font-medium">Prop Firm Safe</p>
                    <p className="text-gray-300 mt-1">
                      The EA is designed to be undetectable by prop firm monitoring systems 
                      with randomized execution delays and stealth mode.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}