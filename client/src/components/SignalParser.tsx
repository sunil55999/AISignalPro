import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Upload } from "lucide-react";

export default function SignalParser() {
  const { toast } = useToast();
  const [signalText, setSignalText] = useState("");
  const [inputType, setInputType] = useState("text");
  const [isParsingSignal, setIsParsingSignal] = useState(false);
  const [parseResults, setParseResults] = useState<any[]>([]);

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
      setParseResults(prev => [result, ...prev].slice(0, 10));
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

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.9) return "default";
    if (confidence >= 0.8) return "secondary";
    return "destructive";
  };

  return (
    <>
      <header className="bg-surface border-b border-border px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Signal Parser</h2>
          <p className="text-muted-foreground">Parse trading signals from text or images</p>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Parser Form */}
          <Card>
            <CardHeader>
              <CardTitle>Parse Signal</CardTitle>
              <p className="text-muted-foreground">Enter your trading signal to extract structured data</p>
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
                    placeholder="Examples:
- GOLD BUY NOW @1985, SL 1975, TP 1995 2005
- EURUSD SELL @ 1.0920, SL 1.0950, TP 1.0890
- Close 50% of GBPJPY position
- SL to BE on XAUUSD trade"
                    rows={6}
                    value={signalText}
                    onChange={(e) => setSignalText(e.target.value)}
                    className="resize-none"
                  />
                </div>

                {inputType === "image" && (
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">Upload Signal Image</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, JPEG</p>
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

          {/* Parse Results */}
          <Card>
            <CardHeader>
              <CardTitle>Parse Results</CardTitle>
              <p className="text-muted-foreground">Recent parsing results and structured output</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {parseResults.map((result, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getConfidenceBadgeVariant(result.parsed.confidence)}>
                          {Math.round(result.parsed.confidence * 100)}%
                        </Badge>
                        <span className="text-sm font-medium">
                          {result.parsed.pair || 'Unknown'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {result.parsed.action?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.parsed.source}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      Raw: "{result.parsed.raw_text}"
                    </div>
                    
                    <details className="text-xs">
                      <summary className="cursor-pointer text-primary hover:text-primary/80">
                        View JSON Output
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.parsed, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
                
                {parseResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No parse results yet. Try parsing a signal above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
