import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Settings
} from "lucide-react";

export default function ChannelManager() {
  const { toast } = useToast();
  const [newChannelDialog, setNewChannelDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: 1, isAdmin: true }); // Demo user session

  // Fetch channels
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["/api/admin/channels"],
  });

  // Fetch current user session
  const { data: userSession } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false
  });

  // Create channel mutation
  const createChannel = useMutation({
    mutationFn: async (channelData: any) => {
      const response = await apiRequest("POST", "/api/admin/channels", {
        ...channelData,
        userId: currentUser.id,
        isActive: true
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      setNewChannelDialog(false);
      toast({
        title: "Channel Created",
        description: "New channel has been added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Channel creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create channel. Please check your input.",
        variant: "destructive",
      });
    },
  });

  // Update channel mutation
  const updateChannel = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/channels/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/channels"] });
      toast({
        title: "Channel Updated",
        description: "Channel has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive",
      });
    },
  });

  const handleChannelToggle = (channelId: number, isActive: boolean) => {
    updateChannel.mutate({ id: channelId, data: { isActive } });
  };

  const handleNewChannel = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const channelData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      confidenceThreshold: parseFloat(formData.get("confidenceThreshold") as string) || 85,
    };

    // Validate required fields
    if (!channelData.name || !channelData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    if (!channelData.name.startsWith('@')) {
      channelData.name = '@' + channelData.name;
    }

    createChannel.mutate(channelData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading channels...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Channel Management</h2>
          <p className="text-gray-400">Add and manage Telegram channels for signal parsing</p>
        </div>
        <Dialog open={newChannelDialog} onOpenChange={setNewChannelDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Channel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNewChannel} className="space-y-4">
              <div>
                <Label className="text-gray-300">Channel Name *</Label>
                <Input 
                  name="name" 
                  placeholder="SignalChannel (@ will be added automatically)" 
                  required 
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Enter channel username without @</p>
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea 
                  name="description" 
                  placeholder="Channel description..." 
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-gray-300">Confidence Threshold (%)</Label>
                <Input 
                  name="confidenceThreshold" 
                  type="number" 
                  defaultValue="85" 
                  min="50" 
                  max="100" 
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum confidence for signal acceptance</p>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setNewChannelDialog(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createChannel.isPending}
                >
                  {createChannel.isPending ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Session Info */}
      {userSession && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {userSession.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">Logged in as: {userSession.username}</p>
                  <p className="text-gray-400 text-sm">
                    {userSession.isAdmin ? "Administrator" : "User"} • 
                    {userSession.isActive ? " Active" : " Inactive"}
                  </p>
                </div>
              </div>
              <Badge variant={userSession.isActive ? "default" : "secondary"}>
                {userSession.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channels Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Active Channels ({channels.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {channels.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No channels configured yet.</p>
              <p className="text-sm mt-2">Add your first Telegram channel to start parsing signals.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Channel</TableHead>
                  <TableHead className="text-gray-300">Description</TableHead>
                  <TableHead className="text-gray-300">Confidence</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Created</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel: any) => (
                  <TableRow key={channel.id} className="border-gray-700">
                    <TableCell className="font-medium text-white">
                      {channel.name}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {channel.description || 'No description'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {Math.round((channel.confidenceThreshold || 0.85) * 100)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={channel.isActive}
                          onCheckedChange={(checked) => handleChannelToggle(channel.id, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <Badge 
                          variant={channel.isActive ? 'default' : 'secondary'}
                          className={channel.isActive ? 'bg-green-600' : ''}
                        >
                          {channel.isActive ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(channel.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}