import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import type { TrainingData } from "@shared/schema";

export default function TrainingDataComponent() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: trainingData = [], isLoading } = useQuery<TrainingData[]>({
    queryKey: ["/api/training-data"],
  });

  const createTrainingData = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/training-data", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-data"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Training data created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create training data",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      message: formData.get("message") as string,
      intent: formData.get("intent") as string,
      pair: formData.get("pair") as string,
      action: formData.get("action") as string,
      entry: parseFloat(formData.get("entry") as string) || null,
      sl: parseFloat(formData.get("sl") as string) || null,
      tp: (formData.get("tp") as string)?.split(',').map(tp => parseFloat(tp.trim())).filter(Boolean) || [],
      source: formData.get("source") as string,
      isVerified: formData.get("isVerified") === "on",
    };

    createTrainingData.mutate(data);
  };

  const filteredData = trainingData.filter(data => 
    data.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.pair?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <header className="bg-surface border-b border-border px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Training Data</h2>
          <p className="text-muted-foreground">Manage labeled data for AI model training</p>
        </div>
      </header>

      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Dataset</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="relative w-80">
                  <Input
                    placeholder="Search training data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Training Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Training Data</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="message">Signal Message</Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="GOLD BUY NOW @1985, SL 1975, TP 1995 2005"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="intent">Intent</Label>
                          <Input
                            id="intent"
                            name="intent"
                            placeholder="open_trade"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="pair">Trading Pair</Label>
                          <Input
                            id="pair"
                            name="pair"
                            placeholder="XAUUSD"
                          />
                        </div>
                        <div>
                          <Label htmlFor="action">Action</Label>
                          <Input
                            id="action"
                            name="action"
                            placeholder="buy"
                          />
                        </div>
                        <div>
                          <Label htmlFor="source">Source</Label>
                          <select
                            id="source"
                            name="source"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                          >
                            <option value="text">Text</option>
                            <option value="ocr">OCR</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="entry">Entry Price</Label>
                          <Input
                            id="entry"
                            name="entry"
                            type="number"
                            step="0.01"
                            placeholder="1985.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sl">Stop Loss</Label>
                          <Input
                            id="sl"
                            name="sl"
                            type="number"
                            step="0.01"
                            placeholder="1975.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tp">Take Profits</Label>
                          <Input
                            id="tp"
                            name="tp"
                            placeholder="1995.0, 2005.0"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isVerified"
                          name="isVerified"
                          className="w-4 h-4"
                        />
                        <Label htmlFor="isVerified">Mark as verified</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createTrainingData.isPending}>
                          {createTrainingData.isPending ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading training data...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((data) => (
                    <TableRow key={data.id}>
                      <TableCell className="max-w-xs truncate">
                        {data.message}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {data.intent.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {data.pair || 'N/A'}
                      </TableCell>
                      <TableCell className="uppercase text-sm">
                        {data.action || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {data.entry || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {data.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {data.isVerified ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No training data matches your search.' : 'No training data found. Add some data to get started.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
