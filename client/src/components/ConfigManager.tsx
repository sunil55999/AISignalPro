import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Download, 
  Upload,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';

interface ConfigSection {
  [key: string]: any;
}

const ConfigManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('mt5');
  const [showSensitive, setShowSensitive] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  const sections = [
    { id: 'mt5', label: 'MT5 Settings', icon: '📊' },
    { id: 'telegram', label: 'Telegram Bot', icon: '💬' },
    { id: 'parser', label: 'Signal Parser', icon: '🤖' },
    { id: 'risk_management', label: 'Risk Management', icon: '🛡️' },
    { id: 'alerts', label: 'Alerts & Notifications', icon: '🔔' },
    { id: 'sync', label: 'Auto Sync', icon: '🔄' },
    { id: 'logging', label: 'Logging', icon: '📝' },
    { id: 'security', label: 'Security', icon: '🔒' }
  ];

  // Fetch configuration section
  const { data: configData, isLoading, error } = useQuery({
    queryKey: ['/api/config', activeSection],
    enabled: !!activeSection,
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ section, updates }: { section: string; updates: any }) => {
      return await apiRequest(`/api/config/${section}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Configuration Updated",
        description: `${variables.section} settings have been saved successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/config', variables.section] });
      setPendingChanges({});
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (key: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast({
        title: "No Changes",
        description: "No configuration changes to save",
      });
      return;
    }

    updateConfigMutation.mutate({
      section: activeSection,
      updates: pendingChanges
    });
  };

  const renderConfigInput = (key: string, value: any, label?: string) => {
    const displayLabel = label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const currentValue = pendingChanges[key] !== undefined ? pendingChanges[key] : value;
    const isSensitive = key.includes('token') || key.includes('password') || key.includes('secret');

    if (typeof value === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between">
          <Label className="text-sm font-medium">{displayLabel}</Label>
          <Switch
            checked={currentValue}
            onCheckedChange={(checked) => handleInputChange(key, checked)}
          />
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm font-medium">{displayLabel}</Label>
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => handleInputChange(key, parseFloat(e.target.value) || 0)}
            className="w-full"
          />
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={key} className="space-y-2">
          <Label className="text-sm font-medium">{displayLabel}</Label>
          <Textarea
            value={Array.isArray(currentValue) ? currentValue.join(', ') : currentValue}
            onChange={(e) => handleInputChange(key, e.target.value.split(',').map((s: string) => s.trim()))}
            placeholder="Comma-separated values"
            className="w-full"
          />
        </div>
      );
    }

    // String input
    return (
      <div key={key} className="space-y-2">
        <Label className="text-sm font-medium">{displayLabel}</Label>
        <div className="relative">
          <Input
            type={isSensitive && !showSensitive ? "password" : "text"}
            value={currentValue}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full"
          />
          {isSensitive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowSensitive(!showSensitive)}
            >
              {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderConfigSection = (config: ConfigSection) => {
    if (!config) return null;

    return (
      <div className="space-y-4">
        {Object.entries(config).map(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">
                    {key.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(value).map(([subKey, subValue]) => 
                    renderConfigInput(`${key}.${subKey}`, subValue)
                  )}
                </CardContent>
              </Card>
            );
          }
          
          return renderConfigInput(key, value);
        })}
      </div>
    );
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Configuration Error</h3>
          <p className="text-muted-foreground">Failed to load configuration settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuration Manager</h1>
          <p className="text-muted-foreground">
            Manage system settings and service configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPendingChanges && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasPendingChanges || updateConfigMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateConfigMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Configuration changes are applied immediately to the system. 
          Some changes may require service restart to take effect.
        </AlertDescription>
      </Alert>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1">
          {sections.map((section) => (
            <TabsTrigger 
              key={section.id} 
              value={section.id}
              className="text-xs flex flex-col items-center gap-1 h-auto py-2"
            >
              <span>{section.icon}</span>
              <span className="hidden sm:block">{section.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{section.icon}</span>
                  {section.label} Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading configuration...</p>
                  </div>
                ) : (
                  renderConfigSection(configData?.config)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ConfigManager;