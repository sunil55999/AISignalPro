import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Upload, Download, RefreshCw, FileCode, Wifi, Clock, Hash, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface ParserDeployment {
  id: string;
  filename: string;
  originalName: string;
  fileHash: string;
  fileSize: number;
  version: string;
  deployTimestamp: string;
  uploadedBy: string;
  status: 'uploaded' | 'broadcasting' | 'deployed' | 'failed';
  notifiedTerminals: string[];
  totalTerminals: number;
}

interface ConnectedTerminal {
  id: string;
  version: string;
  lastSeen: string;
  connected: boolean;
}

const StatusBadge: React.FC<{ status: ParserDeployment['status'] }> = ({ status }) => {
  const variants = {
    uploaded: { variant: 'secondary' as const, icon: Upload, color: 'text-blue-600' },
    broadcasting: { variant: 'default' as const, icon: Wifi, color: 'text-yellow-600' },
    deployed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    failed: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' }
  };

  const { variant, icon: Icon, color } = variants[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className={`w-3 h-3 ${color}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const DeploymentCard: React.FC<{ deployment: ParserDeployment }> = ({ deployment }) => {
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            {deployment.originalName}
          </CardTitle>
          <StatusBadge status={deployment.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>v{deployment.version}</span>
          <span>•</span>
          <span>{formatFileSize(deployment.fileSize)}</span>
          <span>•</span>
          <span>by {deployment.uploadedBy}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Deploy Time
            </div>
            <div className="text-sm text-muted-foreground">
              {formatTime(deployment.deployTimestamp)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-1">
              <Hash className="w-4 h-4" />
              File Hash
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              {deployment.fileHash.substring(0, 16)}...
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1">
              <Users className="w-4 h-4" />
              Terminal Notification
            </span>
            <Badge variant="outline">
              {deployment.notifiedTerminals.length}/{deployment.totalTerminals}
            </Badge>
          </div>
          
          {deployment.notifiedTerminals.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Notified: {deployment.notifiedTerminals.join(', ')}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          {deployment.status !== 'broadcasting' && (
            <Button variant="outline" size="sm">
              <Wifi className="w-4 h-4 mr-1" />
              Re-broadcast
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const TerminalStatus: React.FC<{ terminals: ConnectedTerminal[] }> = ({ terminals }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Connected Terminals ({terminals.filter(t => t.connected).length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {terminals.map((terminal) => (
            <div key={terminal.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${terminal.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium">{terminal.id}</div>
                  <div className="text-sm text-muted-foreground">v{terminal.version}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(terminal.lastSeen).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {terminals.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No terminals connected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ParserManager: React.FC = () => {
  const [deployments, setDeployments] = useState<ParserDeployment[]>([]);
  const [terminals, setTerminals] = useState<ConnectedTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [deploymentsResponse, terminalsResponse] = await Promise.all([
        fetch('/api/parser/deployments'),
        fetch('/api/parser/terminals')
      ]);

      if (deploymentsResponse.ok && terminalsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json();
        const terminalsData = await terminalsResponse.json();

        if (deploymentsData.success) {
          setDeployments(deploymentsData.deployments);
        }
        
        if (terminalsData.success) {
          setTerminals(terminalsData.terminals);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !version) {
      alert('Please select a file and enter a version number');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('parserFile', selectedFile);
      formData.append('version', version);
      formData.append('description', `Parser update v${version}`);

      const response = await fetch('/api/parser/push', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`Parser uploaded successfully! Broadcasted to ${result.deployment.broadcastCount} terminals.`);
          setSelectedFile(null);
          setVersion('');
          fetchData(); // Refresh the list
        } else {
          alert('Upload failed: ' + result.error);
        }
      } else {
        alert('Upload failed: Server error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: Network error');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parser Management</h1>
          <p className="text-muted-foreground">
            Upload and deploy parser updates to all connected terminals
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Parser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Parser File</label>
              <Input
                type="file"
                accept=".py,.zip,.tar.gz"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: .py, .zip, .tar.gz (max 50MB)
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Version</label>
              <Input
                type="text"
                placeholder="e.g., 2.1.6"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={handleFileUpload} 
              disabled={!selectedFile || !version || uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload & Deploy'}
            </Button>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployments List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Recent Deployments</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading deployments...</span>
            </div>
          ) : deployments.length > 0 ? (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <DeploymentCard key={deployment.id} deployment={deployment} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Deployments</h3>
                <p className="text-muted-foreground">
                  No parser files have been deployed yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Terminal Status */}
        <div>
          <TerminalStatus terminals={terminals} />
        </div>
      </div>
    </div>
  );
};

export default ParserManager;