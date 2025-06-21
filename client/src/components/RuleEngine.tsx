import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { useState } from "react";
import type { ManualRule } from "@shared/schema";

export default function RuleEngine() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ManualRule | null>(null);

  const { data: rules = [], isLoading } = useQuery<ManualRule[]>({
    queryKey: ["/api/manual-rules"],
  });

  const createRule = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/manual-rules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manual-rules"] });
      setIsDialogOpen(false);
      setEditingRule(null);
      toast({
        title: "Success",
        description: "Rule created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/manual-rules/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manual-rules"] });
      setIsDialogOpen(false);
      setEditingRule(null);
      toast({
        title: "Success",
        description: "Rule updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive",
      });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/manual-rules/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manual-rules"] });
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      pattern: formData.get("pattern") as string,
      action: formData.get("action") as string,
      channelName: formData.get("channelName") as string,
      isActive: formData.get("isActive") === "on",
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data });
    } else {
      createRule.mutate(data);
    }
  };

  const handleEdit = (rule: ManualRule) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteRule.mutate(id);
    }
  };

  const toggleRuleStatus = (rule: ManualRule) => {
    updateRule.mutate({
      id: rule.id,
      data: { ...rule, isActive: !rule.isActive }
    });
  };

  return (
    <>
      <header className="bg-surface border-b border-border px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Rule Engine</h2>
          <p className="text-muted-foreground">Manage manual rules for signal parsing fallback</p>
        </div>
      </header>

      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Manual Rules</CardTitle>
                <p className="text-muted-foreground">Fallback rules for low-confidence parsing</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingRule(null);
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRule ? "Edit Rule" : "Add New Rule"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="pattern">Pattern</Label>
                      <Input
                        id="pattern"
                        name="pattern"
                        placeholder="SL to BE"
                        defaultValue={editingRule?.pattern || ""}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Text pattern to match in messages
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="action">Action</Label>
                      <Input
                        id="action"
                        name="action"
                        placeholder="Set SL to Entry Price"
                        defaultValue={editingRule?.action || ""}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Action to take when pattern matches
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="channelName">Channel Name</Label>
                      <Input
                        id="channelName"
                        name="channelName"
                        placeholder="All Channels"
                        defaultValue={editingRule?.channelName || ""}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Specific channel or "All Channels" for global rule
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        name="isActive"
                        defaultChecked={editingRule?.isActive ?? true}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                        {(createRule.isPending || updateRule.isPending) ? "Saving..." : 
                         editingRule ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading rules...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{rule.pattern}</div>
                        <div className="text-sm text-muted-foreground">Contains pattern</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.action}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.channelName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.usageCount || 0} times this week
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Paused"}
                          </Badge>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => toggleRuleStatus(rule)}
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No rules found. Create your first rule to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
