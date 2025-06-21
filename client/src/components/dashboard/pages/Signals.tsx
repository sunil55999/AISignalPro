import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { useToast } from '../../../hooks/use-toast';
import { apiRequest } from '../../../lib/queryClient';
import { 
  RotateCcw, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Loader2,
  Activity
} from 'lucide-react';
import type { Signal } from '@shared/schema';

interface ReplayResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const Signals: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pairFilter, setPairFilter] = useState<string>('all');
  const [replayingSignals, setReplayingSignals] = useState<Set<number>>(new Set());

  // Fetch signals
  const { data: signals = [], isLoading, error } = useQuery<Signal[]>({
    queryKey: ['/api/signals'],
  });

  // Replay signal mutation
  const replayMutation = useMutation({
    mutationFn: async (signalId: number): Promise<ReplayResponse> => {
      return await apiRequest(`/api/signal/replay`, {
        method: 'POST',
        body: JSON.stringify({ signal_id: signalId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onMutate: (signalId: number) => {
      setReplayingSignals(prev => new Set(prev.add(signalId)));
    },
    onSuccess: (data: ReplayResponse, signalId: number) => {
      setReplayingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signalId);
        return newSet;
      });

      if (data.success) {
        toast({
          title: "Signal Replayed",
          description: data.message || "Signal has been sent to desktop app for re-execution",
        });
        // Refresh signals to show updated status
        queryClient.invalidateQueries({ queryKey: ['/api/signals'] });
      } else {
        toast({
          title: "Replay Failed",
          description: data.error || "Failed to replay signal",
          variant: "destructive",
        });
      }
    },
    onError: (error: any, signalId: number) => {
      setReplayingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signalId);
        return newSet;
      });

      toast({
        title: "Replay Error",
        description: "Network error occurred while replaying signal",
        variant: "destructive",
      });
    },
  });

  // Filter signals based on search and filters
  const filteredSignals = signals.filter((signal: Signal) => {
    const matchesSearch = !searchTerm || 
      signal.pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signal.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signal.rawText?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || signal.status === statusFilter;
    const matchesPair = pairFilter === 'all' || signal.pair === pairFilter;

    return matchesSearch && matchesStatus && matchesPair;
  });

  // Get unique pairs for filter
  const uniquePairs = Array.from(new Set(signals.map((s: Signal) => s.pair).filter(Boolean)));

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'executed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Executed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const confidencePercent = Math.round(confidence * 100);
    if (confidencePercent >= 85) {
      return <Badge className="bg-green-100 text-green-800">{confidencePercent}%</Badge>;
    } else if (confidencePercent >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">{confidencePercent}%</Badge>;
    } else {
      return <Badge variant="destructive">{confidencePercent}%</Badge>;
    }
  };

  const handleReplay = (signalId: number) => {
    replayMutation.mutate(signalId);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Signals</h3>
          <p className="text-muted-foreground">Failed to load signal history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Signal History</h1>
          <p className="text-muted-foreground">
            View and replay trading signals from all channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            {filteredSignals.length} signals
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search signals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trading Pair</Label>
              <Select value={pairFilter} onValueChange={setPairFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All pairs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pairs</SelectItem>
                  {uniquePairs.map((pair) => (
                    <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Signal History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading signals...</p>
            </div>
          ) : filteredSignals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((signal: Signal) => (
                  <TableRow key={signal.id}>
                    <TableCell className="text-sm">
                      {signal.createdAt ? new Date(signal.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium">{signal.pair || 'Unknown'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={signal.action?.toLowerCase() === 'buy' ? 'default' : 'secondary'}>
                        {signal.action?.toUpperCase() || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {signal.entry || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {signal.sl || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {signal.tp || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(signal.confidence || 0)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(signal.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReplay(signal.id)}
                          disabled={replayingSignals.has(signal.id)}
                          className="flex items-center gap-1"
                        >
                          {replayingSignals.has(signal.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Replay
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || pairFilter !== 'all' 
                ? 'No signals match your filters.' 
                : 'No signals found. Signals will appear here once channels start sending data.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Signals;