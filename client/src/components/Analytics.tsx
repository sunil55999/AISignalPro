import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  Signal, 
  CheckCircle, 
  Settings, 
  Eye,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";

export default function Analytics() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const analyticsCards = [
    {
      title: "Total Signals Parsed",
      value: "1,247",
      change: "+8.2%",
      changeType: "positive" as const,
      icon: Signal,
      description: "All time"
    },
    {
      title: "Average Confidence Score",
      value: `${stats?.avgConfidence || 0}%`,
      change: "+2.1%",
      changeType: "positive" as const,
      icon: CheckCircle,
      description: "This month"
    },
    {
      title: "OCR Success Rate",
      value: `${stats?.ocrSuccessRate || 0}%`,
      change: "+5.3%",
      changeType: "positive" as const,
      icon: Eye,
      description: "Image parsing"
    },
    {
      title: "Manual Rule Usage",
      value: `${stats?.manualRulesUsed || 0}`,
      change: "-12%",
      changeType: "negative" as const,
      icon: Settings,
      description: "This week"
    }
  ];

  const performanceMetrics = [
    { label: "High Confidence (90%+)", value: "68%", color: "bg-success" },
    { label: "Medium Confidence (80-90%)", value: "24%", color: "bg-warning" },
    { label: "Low Confidence (<80%)", value: "8%", color: "bg-error" },
  ];

  const topTradingPairs = [
    { pair: "XAUUSD", count: 342, percentage: 28 },
    { pair: "EURUSD", count: 289, percentage: 24 },
    { pair: "GBPJPY", count: 198, percentage: 16 },
    { pair: "USDJPY", count: 156, percentage: 13 },
    { pair: "GBPUSD", count: 134, percentage: 11 },
    { pair: "Others", count: 128, percentage: 8 },
  ];

  return (
    <>
      <header className="bg-surface border-b border-border px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Detailed performance metrics and insights</p>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analyticsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="text-primary text-xl" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${
                      card.changeType === 'positive' ? 'text-success' : 'text-error'
                    }`}>
                      {card.changeType === 'positive' ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                      {card.change}
                    </span>
                    <span className="text-muted-foreground ml-2">{card.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Confidence Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Confidence Score Distribution</CardTitle>
              <p className="text-muted-foreground">Breakdown of parsing confidence levels</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${metric.color}`}></div>
                      <span className="text-sm font-medium text-foreground">{metric.label}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{metric.value}</span>
                  </div>
                ))}
                
                <div className="mt-6 space-y-2">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center">
                      <span className="text-xs text-muted-foreground w-32">{metric.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 mx-3">
                        <div 
                          className={`h-2 rounded-full ${metric.color}`}
                          style={{ width: metric.value }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium w-8">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Trading Pairs */}
          <Card>
            <CardHeader>
              <CardTitle>Most Parsed Trading Pairs</CardTitle>
              <p className="text-muted-foreground">Frequency of different currency pairs</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTradingPairs.map((pair, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{pair.pair}</span>
                        <div className="text-xs text-muted-foreground">{pair.count} signals</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${pair.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground w-8">{pair.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <p className="text-muted-foreground">Key metrics over time</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">↑ 12%</div>
                <div className="text-sm text-muted-foreground">Parsing Accuracy</div>
                <div className="text-xs text-muted-foreground mt-1">vs last month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">2.3s</div>
                <div className="text-sm text-muted-foreground">Avg Parse Time</div>
                <div className="text-xs text-muted-foreground mt-1">per signal</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">↓ 8%</div>
                <div className="text-sm text-muted-foreground">Rule Fallbacks</div>
                <div className="text-xs text-muted-foreground mt-1">AI improving</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
