import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  FileText,
  Zap,
  Target,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export default function ParserControlPanel() {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch parser settings
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["/api/parser/settings"],
    retry: false
  });

  // Fetch parser status
  const { data: status = {} } = useQuery({
    queryKey: ["/api/parser/status"],
    refetchInterval: 5000
  });

  // Update parser settings
  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const response = await apiRequest("PUT", "/api/parser/settings", newSettings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parser/settings"] });
      toast({
        title: "Settings Updated",
        description: "Parser settings have been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update parser settings",
        variant: "destructive",
      });
    },
  });

  // Control parser
  const controlParser = useMutation({
    mutationFn: async (action: string) => {
      const response = await apiRequest("POST", "/api/parser/control", { action });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parser/status"] });
      toast({
        title: "Parser Control",
        description: data.message || "Parser action completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to control parser",
        variant: "destructive",
      });
    },
  });

  // Generate weekly report
  const generateReport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/weekly", {});
      return response.json();
    },
    onSuccess: (data) => {
      setIsGeneratingReport(false);
      toast({
        title: "Report Generated",
        description: "Weekly report has been generated successfully",
      });
      // Trigger download
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    },
    onError: () => {
      setIsGeneratingReport(false);
      toast({
        title: "Error",
        description: "Failed to generate weekly report",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...(settings as any), [key]: value };
    updateSettings.mutate(newSettings);
  };

  const handleParserControl = (action: string) => {
    controlParser.mutate(action);
  };

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    generateReport.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading parser settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Parser Control Panel</h2>
          <p className="text-gray-400">Configure and monitor AI signal parsing engine</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="bg-green-600 hover:bg-green-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isGeneratingReport ? "Generating..." : "Weekly Report"}
          </Button>
        </div>
      </div>

      {/* Parser Status */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Parser Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Badge 
                  variant={status?.isActive ? "default" : "secondary"}
                  className={status?.isActive ? "bg-green-600" : ""}
                >
                  {status?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">Engine Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-white mb-1">
                {status?.accuracy || 89.2}%
              </div>
              <p className="text-sm text-gray-400">Parse Accuracy</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-white mb-1">
                {status?.processed || 247}
              </div>
              <p className="text-sm text-gray-400">Signals Today</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={() => handleParserControl(status?.isActive ? 'stop' : 'start')}
              variant={status?.isActive ? "destructive" : "default"}
              disabled={controlParser.isPending}
              className="flex-1"
            >
              {status?.isActive ? (
                <><Pause className="w-4 h-4 mr-2" /> Stop Parser</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Start Parser</>
              )}
            </Button>
            <Button
              onClick={() => handleParserControl('restart')}
              variant="outline"
              disabled={controlParser.isPending}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parser Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Accuracy Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-gray-300 mb-3 block">
                Minimum Confidence Threshold: {settings?.minConfidence || 85}%
              </Label>
              <Slider
                value={[settings?.minConfidence || 85]}
                onValueChange={([value]) => handleSettingChange('minConfidence', value)}
                max={100}
                min={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">
                Signals below this confidence will be rejected
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-gray-300">OCR Processing</Label>
              <Switch
                checked={settings?.enableOCR || false}
                onCheckedChange={(checked) => handleSettingChange('enableOCR', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Auto Rule Learning</Label>
              <Switch
                checked={settings?.autoLearning || true}
                onCheckedChange={(checked) => handleSettingChange('autoLearning', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-gray-300 mb-3 block">Processing Mode</Label>
              <Select
                value={settings?.processingMode || "balanced"}
                onValueChange={(value) => handleSettingChange('processingMode', value)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="fast">Fast (Lower accuracy)</SelectItem>
                  <SelectItem value="balanced">Balanced (Recommended)</SelectItem>
                  <SelectItem value="precise">Precise (Higher accuracy)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300 mb-3 block">
                Max Processing Rate: {settings?.maxRate || 10} signals/min
              </Label>
              <Slider
                value={[settings?.maxRate || 10]}
                onValueChange={([value]) => handleSettingChange('maxRate', value)}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Real-time Processing</Label>
              <Switch
                checked={settings?.realTime || true}
                onCheckedChange={(checked) => handleSettingChange('realTime', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Options */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Advanced Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-300 mb-3 block">Custom Stop Words</Label>
              <Textarea
                placeholder="Enter words to ignore (one per line)"
                value={settings?.stopWords || ""}
                onChange={(e) => handleSettingChange('stopWords', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={4}
              />
            </div>
            <div>
              <Label className="text-gray-300 mb-3 block">Custom Triggers</Label>
              <Textarea
                placeholder="Enter trigger phrases (one per line)"
                value={settings?.triggers || ""}
                onChange={(e) => handleSettingChange('triggers', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                rows={4}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-gray-300 font-medium">Debug Mode</p>
                <p className="text-xs text-gray-500">Enable detailed logging</p>
              </div>
            </div>
            <Switch
              checked={settings?.debugMode || false}
              onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-gray-300 font-medium">Scheduled Maintenance</p>
                <p className="text-xs text-gray-500">Auto-restart daily at 3 AM</p>
              </div>
            </div>
            <Switch
              checked={settings?.scheduledMaintenance || true}
              onCheckedChange={(checked) => handleSettingChange('scheduledMaintenance', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Parser Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {status?.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' : 
                    activity.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-gray-300">{activity.message}</span>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            )) || (
              <div className="text-center text-gray-500 py-4">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}