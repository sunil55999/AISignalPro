import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye } from "lucide-react";
import { useState } from "react";
import type { Signal } from "@shared/schema";

export default function ParseHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: signals = [], isLoading } = useQuery<Signal[]>({
    queryKey: ["/api/signals"],
  });

  const filteredSignals = signals.filter(signal => 
    signal.rawText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    signal.pair?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.9) return "default";
    if (confidence >= 0.8) return "secondary";
    return "destructive";
  };

  const getIntentBadgeVariant = (intent: string) => {
    switch (intent) {
      case "open_trade":
        return "default";
      case "modify_sl":
        return "secondary";
      case "close_partial":
        return "outline";
      case "cancel":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <header className="bg-surface border-b border-border px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Parse History</h2>
          <p className="text-muted-foreground">View all parsed trading signals</p>
        </div>
      </header>

      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Signal History</CardTitle>
              <div className="relative w-80">
                <Input
                  placeholder="Search signals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading signals...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>TP</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignals.map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {signal.createdAt ? new Date(signal.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {signal.pair || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getIntentBadgeVariant(signal.intent)}>
                          {signal.intent.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="uppercase text-sm">
                        {signal.action || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {signal.entry || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {signal.sl || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {signal.tp && signal.tp.length > 0 ? signal.tp.join(', ') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getConfidenceBadgeVariant(signal.confidence || 0)}>
                          {Math.round((signal.confidence || 0) * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {signal.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredSignals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No signals match your search.' : 'No signals found. Try parsing some signals first.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
