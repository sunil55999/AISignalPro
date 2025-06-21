import { useState } from 'react';
import { useUserMode } from '@/contexts/UserModeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Zap, 
  GraduationCap, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Cog
} from 'lucide-react';

export default function ModeToggle() {
  const { mode, setMode, isBeginnerMode, isProMode } = useUserMode();
  const [showModeDialog, setShowModeDialog] = useState(false);

  const handleModeChange = (newMode: 'beginner' | 'pro') => {
    setMode(newMode);
    setShowModeDialog(false);
  };

  return (
    <>
      {/* Mode Toggle Button */}
      <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
          >
            {isBeginnerMode ? (
              <GraduationCap className="w-4 h-4" />
            ) : (
              <Cog className="w-4 h-4" />
            )}
            <span>{isBeginnerMode ? 'Beginner Mode' : 'Pro Mode'}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Choose Your Experience Mode
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select the interface mode that best suits your trading experience level
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Beginner Mode Card */}
            <Card 
              className={`cursor-pointer transition-all duration-200 border-2 ${
                isBeginnerMode 
                  ? 'border-blue-500 bg-blue-900/20' 
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
              onClick={() => handleModeChange('beginner')}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-3">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white flex items-center justify-center">
                  Beginner Mode
                  {isBeginnerMode && <CheckCircle className="w-5 h-5 ml-2 text-green-500" />}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Perfect for new traders who want guided setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Step-by-step guided wizard</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Auto-configured trading rules</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Simplified interface</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Trade confirmations</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Risk management presets</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-500">
                    Recommended for beginners
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Pro Mode Card */}
            <Card 
              className={`cursor-pointer transition-all duration-200 border-2 ${
                isProMode 
                  ? 'border-blue-500 bg-blue-900/20' 
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
              onClick={() => handleModeChange('pro')}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white flex items-center justify-center">
                  Pro Mode
                  {isProMode && <CheckCircle className="w-5 h-5 ml-2 text-green-500" />}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Full control for experienced traders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    <span>Advanced rule builder</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    <span>Parser customization</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    <span>Multi-TP management</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    <span>Strategy scoring & backtesting</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-purple-500" />
                    <span>Manual EA tuning</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-500">
                    Advanced features
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mode Comparison */}
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-yellow-400 mb-1">Quick Tip:</p>
                <p>
                  You can switch between modes anytime. Beginners can upgrade to Pro Mode 
                  when ready, and pros can use Beginner Mode for quick setups.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mode-aware component wrapper
export function ModeAware({ 
  children, 
  beginnerOnly = false, 
  proOnly = false 
}: { 
  children: React.ReactNode;
  beginnerOnly?: boolean;
  proOnly?: boolean;
}) {
  const { isBeginnerMode, isProMode } = useUserMode();
  
  if (beginnerOnly && !isBeginnerMode) return null;
  if (proOnly && !isProMode) return null;
  
  return <>{children}</>;
}