import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Download, Upload, FileText, Eye, CheckCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface StrategyRule {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  position: { x: number; y: number };
  config: {
    type: string;
    [key: string]: any;
  };
}

interface StrategyConnection {
  from: string;
  to: string;
  id: string;
}

interface Strategy {
  name: string;
  created: string;
  rules: StrategyRule[];
  connections: StrategyConnection[];
  description?: string;
  version?: string;
}

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  ruleId?: string;
}

const StrategyPreview: React.FC<{ strategy: Strategy; errors: ValidationError[] }> = ({ strategy, errors }) => {
  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-purple-100 text-purple-800';
      case 'condition': return 'bg-blue-100 text-blue-800';
      case 'action': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRuleLabel = (rule: StrategyRule) => {
    const config = rule.config;
    switch (rule.type) {
      case 'trigger':
        return `Trigger: ${config.event || 'Unknown'}`;
      case 'condition':
        return `IF ${config.field || 'field'} ${config.operator || '='} ${config.value || 'value'}`;
      case 'action':
        return `THEN ${config.action || 'action'}`;
      default:
        return rule.id;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Strategy Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <p className="text-sm text-muted-foreground">{strategy.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Version</label>
            <p className="text-sm text-muted-foreground">{strategy.version || '1.0.0'}</p>
          </div>
        </div>

        {strategy.description && (
          <div>
            <label className="text-sm font-medium">Description</label>
            <p className="text-sm text-muted-foreground">{strategy.description}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Rules ({strategy.rules.length})</label>
          <div className="space-y-2 mt-2">
            {strategy.rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{formatRuleLabel(rule)}</span>
                <Badge className={getRuleTypeColor(rule.type)}>
                  {rule.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Connections ({strategy.connections.length})</label>
          <div className="space-y-1 mt-2">
            {strategy.connections.map((conn) => (
              <div key={conn.id} className="text-sm text-muted-foreground font-mono">
                {conn.from} → {conn.to}
              </div>
            ))}
          </div>
        </div>

        {errors.length > 0 && (
          <div>
            <label className="text-sm font-medium text-red-600">Validation Issues</label>
            <div className="space-y-1 mt-2">
              {errors.map((error, index) => (
                <div key={index} className={`flex items-center gap-2 text-sm p-2 rounded ${
                  error.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
                }`}>
                  {error.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {error.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const Strategy: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewStrategy, setPreviewStrategy] = useState<Strategy | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const validateStrategy = (strategy: Strategy): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Basic validation
    if (!strategy.name || strategy.name.trim().length === 0) {
      errors.push({ type: 'error', message: 'Strategy name is required' });
    }

    if (!strategy.rules || strategy.rules.length === 0) {
      errors.push({ type: 'error', message: 'Strategy must have at least one rule' });
    }

    // Rule validation
    strategy.rules?.forEach((rule) => {
      if (!rule.id || !rule.type) {
        errors.push({ type: 'error', message: `Rule ${rule.id || 'unknown'} is missing required fields`, ruleId: rule.id });
      }

      if (rule.type === 'condition') {
        if (!rule.config.field || !rule.config.operator || rule.config.value === undefined) {
          errors.push({ type: 'error', message: `Condition rule ${rule.id} is incomplete`, ruleId: rule.id });
        }
      }

      if (rule.type === 'action') {
        if (!rule.config.action) {
          errors.push({ type: 'error', message: `Action rule ${rule.id} is missing action type`, ruleId: rule.id });
        }
      }

      if (rule.type === 'trigger') {
        if (!rule.config.event) {
          errors.push({ type: 'error', message: `Trigger rule ${rule.id} is missing event type`, ruleId: rule.id });
        }
      }
    });

    // Connection validation
    const ruleIds = new Set(strategy.rules?.map(r => r.id) || []);
    strategy.connections?.forEach((conn) => {
      if (!ruleIds.has(conn.from)) {
        errors.push({ type: 'error', message: `Connection references non-existent rule: ${conn.from}` });
      }
      if (!ruleIds.has(conn.to)) {
        errors.push({ type: 'error', message: `Connection references non-existent rule: ${conn.to}` });
      }
    });

    // Check for orphaned rules (warnings)
    const connectedRules = new Set();
    strategy.connections?.forEach((conn) => {
      connectedRules.add(conn.from);
      connectedRules.add(conn.to);
    });

    strategy.rules?.forEach((rule) => {
      if (rule.type !== 'trigger' && !connectedRules.has(rule.id)) {
        errors.push({ type: 'warning', message: `Rule ${rule.id} is not connected to any other rules`, ruleId: rule.id });
      }
    });

    return errors;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    setSelectedFile(file);

    try {
      const text = await file.text();
      const strategy: Strategy = JSON.parse(text);
      
      const errors = validateStrategy(strategy);
      setValidationErrors(errors);
      setPreviewStrategy(strategy);
    } catch (error) {
      alert('Invalid JSON file format');
      setSelectedFile(null);
      setPreviewStrategy(null);
      setValidationErrors([]);
    }
  };

  const exportStrategy = (strategy: Strategy) => {
    const dataStr = JSON.stringify(strategy, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${strategy.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_strategy.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importStrategy = async () => {
    if (!previewStrategy || validationErrors.some(e => e.type === 'error')) {
      alert('Cannot import strategy with validation errors');
      return;
    }

    try {
      setImporting(true);

      const response = await fetch('/api/strategy/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewStrategy),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Strategy imported successfully!');
          setSelectedFile(null);
          setPreviewStrategy(null);
          setValidationErrors([]);
          fetchStrategies();
        } else {
          alert('Import failed: ' + result.error);
        }
      } else {
        alert('Import failed: Server error');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: Network error');
    } finally {
      setImporting(false);
    }
  };

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/strategy/list');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStrategies(data.strategies);
        }
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Management</h1>
          <p className="text-muted-foreground">
            Import, export, and manage your trading strategies
          </p>
        </div>
        <Button onClick={fetchStrategies} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Strategy JSON File</label>
            <Input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
            />
            <p className="text-xs text-muted-foreground">
              Select a JSON file exported from the Strategy Builder
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </div>
              
              {previewStrategy && (
                <Button 
                  onClick={importStrategy} 
                  disabled={importing || validationErrors.some(e => e.type === 'error')}
                  className="flex items-center gap-2"
                >
                  {importing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {importing ? 'Importing...' : 'Import Strategy'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {previewStrategy && (
        <StrategyPreview strategy={previewStrategy} errors={validationErrors} />
      )}

      {/* Existing Strategies */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Saved Strategies</h2>
        
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading strategies...</p>
            </CardContent>
          </Card>
        ) : strategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {strategy.name}
                    </CardTitle>
                    <Badge variant="outline">
                      v{strategy.version || '1.0.0'}
                    </Badge>
                  </div>
                  {strategy.description && (
                    <p className="text-sm text-muted-foreground">{strategy.description}</p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Rules:</span> {strategy.rules.length}
                    </div>
                    <div>
                      <span className="font-medium">Connections:</span> {strategy.connections.length}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(strategy.created).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportStrategy(strategy)}
                      className="flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Export JSON
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const errors = validateStrategy(strategy);
                        setValidationErrors(errors);
                        setPreviewStrategy(strategy);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Strategies Found</h3>
              <p className="text-muted-foreground">
                Create strategies using the Strategy Builder or import existing ones.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Strategy;