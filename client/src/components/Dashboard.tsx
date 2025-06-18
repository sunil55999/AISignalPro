import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Signal, 
  Activity, 
  CheckCircle, 
  Settings, 
  Eye,
  Brain,
  Search,
  Bell
} from "lucide-react";
import type { Signal as SignalType } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [signalText, setSignalText] = useState("");
  const [inputType, setInputType] = useState("text");
  const [isParsingSignal, setIsParsingSignal] = useState(false);
  const [latestParsedSignal, setLatestParsedSignal] = useState<any>(null);

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Fetch recent signals
  const { data: recentSignals = [] } = useQuery<SignalType[]>({
    queryKey: ["/api/signals", 10],
  });

  const handleSignalParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalText.trim()) {
      toast({
        title: "Error",
        description: "Please enter signal text to parse",
        variant: "destructive",
      });
      return;
    }

    setIsParsingSignal(true);
    try {
      const response = await apiRequest("POST", "/api/parse-signal", {
        rawText: signalText,
        source: inputType,
      });
      
      const result = await response.json();
      setLatestParsedSignal(result.parsed);
      setSignalText("");
      
      toast({
        title: "Success",
        description: "Signal parsed successfully",
      });
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "Error",
        description: "Failed to parse signal",
        variant: "destructive",
      });
    } finally {
      setIsParsingSignal(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-success";
    if (confidence >= 0.8) return "text-warning";
    return "text-error";
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.9) return "default";
    if (confidence >= 0.8) return "secondary";
    return "destructive";
  };

  return (
    <>
      {/* Header */}
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">Monitor your AI signal parsing performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search signals..."
                className="pl-10 pr-4 py-2 w-80"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </Button>
            <div className="w-8 h-8 bg-muted rounded-full"></div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Signals Parsed Today</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.todayCount || 0}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Signal className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-success font-medium">+12%</span>
                <span className="text-muted-foreground ml-2">vs yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Confidence</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.avgConfidence || 0}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-success text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-success font-medium">+2.1%</span>
                <span className="text-muted-foreground ml-2">this week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Manual Rules Used</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.manualRulesUsed || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Settings className="text-warning text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-error font-medium">-5</span>
                <span className="text-muted-foreground ml-2">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">OCR Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.ocrSuccessRate || 0}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Eye className="text-warning text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-success font-medium">+3.2%</span>
                <span className="text-muted-foreground ml-2">improvement</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Signal Parser */}
          <Card>
            <CardHeader>
              <CardTitle>Signal Parser</CardTitle>
              <p className="text-muted-foreground">Test your signal parsing with live messages</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignalParse} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Input Type</Label>
                  <RadioGroup value={inputType} onValueChange={setInputType} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="text" />
                      <Label htmlFor="text">Text Message</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="image" id="image" />
                      <Label htmlFor="image">Image (OCR)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Signal Message</Label>
                  <Textarea
                    placeholder="GOLD BUY NOW @1985, SL 1975, TP 1995 2005"
                    rows={4}
                    value={signalText}
                    onChange={(e) => setSignalText(e.target.value)}
                    className="resize-none"
                  />
                </div>

                {inputType === "image" && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">Upload Signal Image</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <div className="text-3xl text-muted-foreground mb-2">📁</div>
                      <p className="text-muted-foreground">Drag & drop or click to upload</p>
                      <input type="file" accept="image/*" className="hidden" />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isParsingSignal}>
                  <Brain className="w-4 h-4 mr-2" />
                  {isParsingSignal ? "Parsing..." : "Parse Signal"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Parse Results</CardTitle>
                  <p className="text-muted-foreground">Latest signal parsing outcomes</p>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSignals.slice(0, 3).map((signal) => (
                  <div key={signal.id} className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      (signal.confidence || 0) > 0.9 ? 'bg-success' : 
                      (signal.confidence || 0) > 0.8 ? 'bg-warning' : 'bg-error'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {signal.pair || 'Unknown'}
                        </span>
                        <Badge variant={getConfidenceBadgeVariant(signal.confidence || 0)}>
                          {Math.round((signal.confidence || 0) * 100)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {signal.action?.toUpperCase()} @ {signal.entry}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {signal.createdAt ? new Date(signal.createdAt).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
                
                {recentSignals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent signals found. Try parsing a signal above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest Parsed Signal */}
        {latestParsedSignal && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Latest Parsed Signal</CardTitle>
              <p className="text-muted-foreground">Structured JSON output from AI parser</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Raw Input</h4>
                  <div className="bg-muted rounded-lg p-4 border">
                    <p className="text-sm text-foreground font-mono">
                      "{latestParsedSignal.raw_text}"
                    </p>
                  </div>
                  <div className="mt-4 flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        Source: {latestParsedSignal.source}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        Confidence: {Math.round(latestParsedSignal.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Parsed Output</h4>
                  <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-100 font-mono overflow-x-auto">
                    <pre>{JSON.stringify(latestParsedSignal, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
