import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Target,
  Activity,
  BarChart3
} from 'lucide-react';

interface WeeklyReportModalProps {
  trigger?: React.ReactNode;
}

export default function WeeklyReportModal({ trigger }: WeeklyReportModalProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/reports/weekly', {});
      return response.json();
    },
    onSuccess: (data) => {
      setReportData(data.report);
      toast({
        title: 'Report Generated',
        description: 'Weekly report has been generated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate weekly report',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateReport = () => {
    generateReport.mutate();
  };

  const downloadReport = () => {
    if (reportData) {
      const reportText = `
AI Trading Signal Parser - Weekly Report
${reportData.period}

OVERVIEW
- Total Signals Processed: ${reportData.totalSignals}
- Total Trades Executed: ${reportData.totalTrades}
- Average Confidence: ${reportData.averageConfidence}%

CHANNEL PERFORMANCE
${reportData.channels.map((c: any) => 
  `- ${c.name}: ${c.signals} signals (${c.accuracy}% accuracy)`
).join('\n')}

TOP TRADING PAIRS
${reportData.topPairs.join(', ')}

Generated: ${new Date(reportData.generated).toLocaleString()}
      `;
      
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-${reportData.period.replace(' to ', '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-green-600 hover:bg-green-700">
            <FileText className="w-4 h-4 mr-2" />
            Weekly Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Weekly Performance Report
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate and download comprehensive weekly analytics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!reportData ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">
                Generate Weekly Report
              </h3>
              <p className="text-gray-400 mb-6">
                Create a comprehensive report of signal parsing performance, channel analytics, and trading insights for the past week.
              </p>
              <Button
                onClick={handleGenerateReport}
                disabled={generateReport.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateReport.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Report Header */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Report Period: {reportData.period}
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {reportData.totalSignals}
                    </div>
                    <p className="text-gray-300 text-sm">Signals Processed</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {reportData.totalTrades}
                    </div>
                    <p className="text-gray-300 text-sm">Trades Executed</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">
                      {reportData.averageConfidence}%
                    </div>
                    <p className="text-gray-300 text-sm">Avg Confidence</p>
                  </CardContent>
                </Card>
              </div>

              {/* Channel Performance */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Channel Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportData.channels.map((channel: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{channel.name}</p>
                        <p className="text-gray-400 text-sm">{channel.signals} signals processed</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={channel.accuracy >= 85 ? "default" : "secondary"}
                          className={channel.accuracy >= 85 ? "bg-green-600" : ""}
                        >
                          {channel.accuracy}% accuracy
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Trading Pairs */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Top Trading Pairs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {reportData.topPairs.map((pair: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-blue-400 border-blue-400">
                        {pair}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={downloadReport}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  onClick={() => setReportData(null)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Generate New
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}