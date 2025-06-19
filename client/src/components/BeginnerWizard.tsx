import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Bot,
  TrendingUp,
  Shield,
  Zap,
  Target,
  AlertTriangle,
  Star
} from 'lucide-react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const wizardSteps: WizardStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with AI signal copying',
    icon: Star
  },
  {
    id: 'telegram',
    title: 'Connect Telegram',
    description: 'Link your Telegram account',
    icon: MessageSquare
  },
  {
    id: 'channels',
    title: 'Choose Channels',
    description: 'Select signal providers to follow',
    icon: Bot
  },
  {
    id: 'mt5',
    title: 'Add MT5 Account',
    description: 'Connect your trading terminal',
    icon: TrendingUp
  },
  {
    id: 'risk',
    title: 'Risk Settings',
    description: 'Configure your risk level',
    icon: Shield
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Start copying signals',
    icon: CheckCircle
  }
];

const riskProfiles = [
  {
    id: 'low',
    name: 'Conservative',
    description: 'Low risk, steady growth',
    maxLot: 0.01,
    riskPercent: 1,
    maxTrades: 5,
    color: 'green',
    recommended: false
  },
  {
    id: 'medium',
    name: 'Balanced',
    description: 'Moderate risk, good returns',
    maxLot: 0.1,
    riskPercent: 2,
    maxTrades: 10,
    color: 'blue',
    recommended: true
  },
  {
    id: 'high',
    name: 'Aggressive',
    description: 'Higher risk, potential for big gains',
    maxLot: 0.5,
    riskPercent: 5,
    maxTrades: 20,
    color: 'red',
    recommended: false
  }
];

export default function BeginnerWizard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    telegramConnected: false,
    selectedChannels: [] as string[],
    mt5Config: {
      login: '',
      broker: '',
      serverPath: ''
    },
    riskProfile: 'medium'
  });
  const { toast } = useToast();

  const setupMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest('POST', '/api/setup/complete', config);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Setup Complete!',
        description: 'Your signal copier is now ready to use.',
      });
      onComplete();
    },
    onError: () => {
      toast({
        title: 'Setup Error',
        description: 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const progress = ((currentStep + 1) / wizardSteps.length) * 100;
  const currentStepData = wizardSteps[currentStep];

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSetup = () => {
    const selectedRisk = riskProfiles.find(r => r.id === wizardData.riskProfile);
    
    const setupConfig = {
      mode: 'beginner',
      telegram: {
        connected: wizardData.telegramConnected,
        channels: wizardData.selectedChannels
      },
      mt5: wizardData.mt5Config,
      riskSettings: {
        maxLot: selectedRisk?.maxLot || 0.1,
        riskPercent: selectedRisk?.riskPercent || 2,
        maxDailyTrades: selectedRisk?.maxTrades || 10,
        executionMode: 'semi-auto'
      }
    };

    setupMutation.mutate(setupConfig);
  };

  const renderStepContent = () => {
    switch (wizardSteps[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to AI Signal Copier</h2>
              <p className="text-gray-400 text-lg">
                We'll help you set up automated signal copying in just a few simple steps.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-white font-medium">Connect Telegram</p>
                <p className="text-gray-400 text-sm">Link your account</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-white font-medium">Add MT5</p>
                <p className="text-gray-400 text-sm">Connect trading terminal</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-white font-medium">Start Trading</p>
                <p className="text-gray-400 text-sm">Copy signals automatically</p>
              </div>
            </div>
          </div>
        );

      case 'telegram':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Connect Your Telegram</h2>
              <p className="text-gray-400">
                Connect your Telegram account to receive trading signals
              </p>
            </div>
            
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Telegram Account</p>
                        <p className="text-gray-400 text-sm">
                          {wizardData.telegramConnected ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setWizardData(prev => ({ 
                        ...prev, 
                        telegramConnected: !prev.telegramConnected 
                      }))}
                      variant={wizardData.telegramConnected ? "secondary" : "default"}
                      className={wizardData.telegramConnected ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {wizardData.telegramConnected ? 'Connected' : 'Connect'}
                    </Button>
                  </div>
                  
                  {wizardData.telegramConnected && (
                    <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Successfully Connected!</span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1">
                        Your Telegram account is now linked and ready to receive signals.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'channels':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Bot className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Choose Signal Channels</h2>
              <p className="text-gray-400">
                Select trusted signal providers to follow
              </p>
            </div>

            <div className="space-y-3">
              {['@ForexPro', '@XAUUSDChannel', '@CryptoSignals', '@EURUSDExpert'].map((channel) => (
                <div key={channel} className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg">
                  <Checkbox
                    checked={wizardData.selectedChannels.includes(channel)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setWizardData(prev => ({
                          ...prev,
                          selectedChannels: [...prev.selectedChannels, channel]
                        }));
                      } else {
                        setWizardData(prev => ({
                          ...prev,
                          selectedChannels: prev.selectedChannels.filter(c => c !== channel)
                        }));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{channel}</p>
                    <p className="text-gray-400 text-sm">Professional trading signals</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                    Verified
                  </Badge>
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-400 font-medium">Recommendation</p>
                  <p className="text-gray-300">
                    Start with 1-2 channels to test the system. You can add more channels later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mt5':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Connect MT5 Terminal</h2>
              <p className="text-gray-400">
                Add your MetaTrader 5 account details
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">MT5 Login</Label>
                <Input
                  value={wizardData.mt5Config.login}
                  onChange={(e) => setWizardData(prev => ({
                    ...prev,
                    mt5Config: { ...prev.mt5Config, login: e.target.value }
                  }))}
                  placeholder="Your MT5 account number"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Broker Name</Label>
                <Input
                  value={wizardData.mt5Config.broker}
                  onChange={(e) => setWizardData(prev => ({
                    ...prev,
                    mt5Config: { ...prev.mt5Config, broker: e.target.value }
                  }))}
                  placeholder="e.g., Forex.com, FXCM, IC Markets"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Signal File Path (Optional)</Label>
                <Input
                  value={wizardData.mt5Config.serverPath}
                  onChange={(e) => setWizardData(prev => ({
                    ...prev,
                    mt5Config: { ...prev.mt5Config, serverPath: e.target.value }
                  }))}
                  placeholder="C:\TradingSignals\"
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-gray-500 text-sm mt-1">
                  Leave empty to use default path
                </p>
              </div>
            </div>
          </div>
        );

      case 'risk':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Choose Risk Level</h2>
              <p className="text-gray-400">
                Select a risk profile that matches your trading style
              </p>
            </div>

            <RadioGroup
              value={wizardData.riskProfile}
              onValueChange={(value) => setWizardData(prev => ({ ...prev, riskProfile: value }))}
              className="space-y-4"
            >
              {riskProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                    wizardData.riskProfile === profile.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-600 bg-gray-700/50'
                  }`}
                >
                  <RadioGroupItem value={profile.id} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">{profile.name}</p>
                      {profile.recommended && (
                        <Badge className="bg-green-600 text-white">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{profile.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Max Lot: {profile.maxLot}</span>
                      <span>Risk: {profile.riskPercent}%</span>
                      <span>Daily Trades: {profile.maxTrades}</span>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Setup Complete!</h2>
              <p className="text-gray-400 text-lg">
                Your AI Signal Copier is now configured and ready to start trading.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700/50 rounded-lg text-left">
                <h3 className="text-white font-medium mb-2">What happens next?</h3>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li>• Signals will be parsed automatically</li>
                  <li>• Trades will be executed on your MT5</li>
                  <li>• You'll receive confirmations</li>
                  <li>• Monitor performance on dashboard</li>
                </ul>
              </div>
              
              <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg text-left">
                <h3 className="text-blue-400 font-medium mb-2">Need help?</h3>
                <ul className="space-y-1 text-gray-300 text-sm">
                  <li>• Check the user guide</li>
                  <li>• Join our support community</li>
                  <li>• Watch tutorial videos</li>
                  <li>• Contact support team</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Setup Wizard</h1>
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              Step {currentStep + 1} of {wizardSteps.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{currentStepData.title}</span>
              <span className="text-gray-400">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Step Navigation */}
          <div className="flex items-center justify-center mt-6 space-x-2 overflow-x-auto pb-2">
            {wizardSteps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const StepIcon = step.icon;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep === wizardSteps.length - 1 ? (
            <Button
              onClick={completeSetup}
              disabled={setupMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {setupMutation.isPending ? 'Setting up...' : 'Start Trading'}
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}