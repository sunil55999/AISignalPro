import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Calendar,
  Activity,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface ApiKey {
  id: number;
  keyName: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsed: string | null;
  expiresAt: string | null;
  rateLimit: number;
  createdAt: string;
}

const ApiKeyManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);

  // Form state for new API key
  const [newKey, setNewKey] = useState({
    keyName: '',
    permissions: [] as string[],
    expiresAt: '',
    rateLimit: 1000,
    ipWhitelist: [] as string[]
  });

  const availablePermissions = [
    { id: 'sync', label: 'Sync Operations', description: 'Terminal synchronization and status updates' },
    { id: 'parser', label: 'Parser Management', description: 'Download and deploy parser updates' },
    { id: 'signals', label: 'Signal Operations', description: 'Receive and execute trading signals' },
    { id: 'admin', label: 'Admin Access', description: 'Full administrative privileges' }
  ];

  // Fetch API keys
  const { data: apiKeysData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/api-keys'],
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (keyData: any) => {
      return await apiRequest('/api/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify(keyData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Created",
        description: "New API key has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
      setNewKeyVisible(data.apiKey.key);
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Update API key mutation
  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest(`/api/auth/api-keys/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "API Key Updated",
        description: "API key has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/auth/api-keys/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "API Key Deleted",
        description: "API key has been permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewKey({
      keyName: '',
      permissions: [],
      expiresAt: '',
      rateLimit: 1000,
      ipWhitelist: []
    });
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setNewKey(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const handleCreateKey = () => {
    if (!newKey.keyName || newKey.permissions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Key name and at least one permission are required",
        variant: "destructive",
      });
      return;
    }

    createApiKeyMutation.mutate(newKey);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    });
  };

  const toggleKeyStatus = (key: ApiKey) => {
    updateApiKeyMutation.mutate({
      id: key.id,
      updates: { isActive: !key.isActive }
    });
  };

  const getPermissionBadgeColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'sync': return 'bg-blue-100 text-blue-800';
      case 'parser': return 'bg-green-100 text-green-800';
      case 'signals': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastUsed = (lastUsed: string | null) => {
    if (!lastUsed) return 'Never';
    return new Date(lastUsed).toLocaleString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading API Keys</h3>
          <p className="text-muted-foreground">Failed to load API key management</p>
        </CardContent>
      </Card>
    );
  }

  const apiKeys = apiKeysData?.apiKeys || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Key Management</h1>
          <p className="text-muted-foreground">
            Manage API keys for secure desktop application sync
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  value={newKey.keyName}
                  onChange={(e) => setNewKey(prev => ({ ...prev, keyName: e.target.value }))}
                  placeholder="e.g., Desktop Terminal 1"
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {availablePermissions.map((perm) => (
                    <div key={perm.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={perm.id}
                        checked={newKey.permissions.includes(perm.id)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(perm.id, checked as boolean)
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={perm.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {perm.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expires At (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={newKey.expiresAt}
                  onChange={(e) => setNewKey(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Rate Limit (requests/hour)</Label>
                <Input
                  type="number"
                  value={newKey.rateLimit}
                  onChange={(e) => setNewKey(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 1000 }))}
                  min="100"
                  max="10000"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={createApiKeyMutation.isPending}
                >
                  {createApiKeyMutation.isPending ? 'Creating...' : 'Create Key'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Display */}
      {newKeyVisible && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">API Key Created Successfully!</p>
              <p className="text-sm">Save this key securely - it won't be shown again:</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="bg-white px-2 py-1 rounded text-sm font-mono">
                  {newKeyVisible}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(newKeyVisible)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewKeyVisible(null)}
                >
                  <EyeOff className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading API keys...</p>
            </CardContent>
          </Card>
        ) : apiKeys.length > 0 ? (
          apiKeys.map((key: ApiKey) => (
            <Card key={key.id} className={isExpired(key.expiresAt) ? 'border-red-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5" />
                    <div>
                      <CardTitle className="text-lg">{key.keyName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {key.keyPrefix}••••••••••••••••••••••••••••
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpired(key.expiresAt) && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                    <Badge variant={key.isActive ? 'default' : 'secondary'}>
                      {key.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Used</Label>
                    <p className="text-sm font-medium">{formatLastUsed(key.lastUsed)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Expires</Label>
                    <p className="text-sm font-medium">
                      {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate Limit</Label>
                    <p className="text-sm font-medium">{key.rateLimit}/hour</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created</Label>
                    <p className="text-sm font-medium">{new Date(key.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Permissions</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {key.permissions.map((permission) => (
                      <Badge 
                        key={permission} 
                        variant="outline" 
                        className={getPermissionBadgeColor(permission)}
                      >
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleKeyStatus(key)}
                      disabled={updateApiKeyMutation.isPending}
                    >
                      {key.isActive ? (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteApiKeyMutation.mutate(key.id)}
                    disabled={deleteApiKeyMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create API keys to enable secure desktop application sync
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First API Key
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ApiKeyManager;