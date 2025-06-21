import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, Save, Plus } from 'lucide-react';

// Custom Node Types
interface ConditionNodeData {
  type: 'condition';
  field: string;
  operator: string;
  value: string;
  label: string;
}

interface ActionNodeData {
  type: 'action';
  action: string;
  parameters: Record<string, any>;
  label: string;
}

interface TriggerNodeData {
  type: 'trigger';
  event: string;
  label: string;
}

type CustomNodeData = ConditionNodeData | ActionNodeData | TriggerNodeData;

// Condition Node Component
const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data, id }) => {
  const [field, setField] = useState(data.field || '');
  const [operator, setOperator] = useState(data.operator || '');
  const [value, setValue] = useState(data.value || '');

  const updateNodeData = (updates: Partial<ConditionNodeData>) => {
    // Update node data in parent component
    window.dispatchEvent(new CustomEvent('updateNodeData', { detail: { id, ...updates } }));
  };

  return (
    <Card className="min-w-[250px] bg-blue-50 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-blue-800">IF Condition</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={field} onValueChange={(val) => { setField(val); updateNodeData({ field: val }); }}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confidence">Confidence</SelectItem>
            <SelectItem value="pair">Trading Pair</SelectItem>
            <SelectItem value="entry">Entry Price</SelectItem>
            <SelectItem value="sl">Stop Loss</SelectItem>
            <SelectItem value="tp">Take Profit</SelectItem>
            <SelectItem value="risk">Risk %</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={operator} onValueChange={(val) => { setOperator(val); updateNodeData({ operator: val }); }}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="<">Less than</SelectItem>
            <SelectItem value=">">Greater than</SelectItem>
            <SelectItem value="=">Equals</SelectItem>
            <SelectItem value="!=">Not equals</SelectItem>
            <SelectItem value="<=">Less or equal</SelectItem>
            <SelectItem value=">=">Greater or equal</SelectItem>
          </SelectContent>
        </Select>
        
        <Input 
          placeholder="Value" 
          value={value}
          onChange={(e) => { setValue(e.target.value); updateNodeData({ value: e.target.value }); }}
          className="h-8"
        />
      </CardContent>
      
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </Card>
  );
};

// Action Node Component
const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data, id }) => {
  const [action, setAction] = useState(data.action || '');
  const [parameters, setParameters] = useState(data.parameters || {});

  const updateNodeData = (updates: Partial<ActionNodeData>) => {
    window.dispatchEvent(new CustomEvent('updateNodeData', { detail: { id, ...updates } }));
  };

  return (
    <Card className="min-w-[250px] bg-green-50 border-green-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-green-800">THEN Action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={action} onValueChange={(val) => { setAction(val); updateNodeData({ action: val }); }}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip_trade">Skip Trade</SelectItem>
            <SelectItem value="move_sl">Move Stop Loss</SelectItem>
            <SelectItem value="close_trade">Close Trade</SelectItem>
            <SelectItem value="reduce_lot">Reduce Lot Size</SelectItem>
            <SelectItem value="increase_lot">Increase Lot Size</SelectItem>
            <SelectItem value="set_tp">Set Take Profit</SelectItem>
            <SelectItem value="send_alert">Send Alert</SelectItem>
          </SelectContent>
        </Select>
        
        {action === 'move_sl' && (
          <Select 
            value={parameters.target || ''} 
            onValueChange={(val) => { 
              const newParams = { ...parameters, target: val };
              setParameters(newParams);
              updateNodeData({ parameters: newParams });
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Move to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry Price</SelectItem>
              <SelectItem value="breakeven">Breakeven</SelectItem>
              <SelectItem value="tp1">TP1 Level</SelectItem>
              <SelectItem value="custom">Custom Level</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {(action === 'reduce_lot' || action === 'increase_lot') && (
          <Input 
            placeholder="Multiplier (e.g., 0.5, 2.0)" 
            value={parameters.multiplier || ''}
            onChange={(e) => {
              const newParams = { ...parameters, multiplier: e.target.value };
              setParameters(newParams);
              updateNodeData({ parameters: newParams });
            }}
            className="h-8"
          />
        )}
      </CardContent>
      
      <Handle type="target" position={Position.Left} />
    </Card>
  );
};

// Trigger Node Component
const TriggerNode: React.FC<NodeProps<TriggerNodeData>> = ({ data, id }) => {
  const [event, setEvent] = useState(data.event || '');

  const updateNodeData = (updates: Partial<TriggerNodeData>) => {
    window.dispatchEvent(new CustomEvent('updateNodeData', { detail: { id, ...updates } }));
  };

  return (
    <Card className="min-w-[200px] bg-purple-50 border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-purple-800">Trigger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select value={event} onValueChange={(val) => { setEvent(val); updateNodeData({ event: val }); }}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select trigger" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="signal_received">Signal Received</SelectItem>
            <SelectItem value="tp1_hit">TP1 Hit</SelectItem>
            <SelectItem value="tp2_hit">TP2 Hit</SelectItem>
            <SelectItem value="sl_hit">SL Hit</SelectItem>
            <SelectItem value="trade_opened">Trade Opened</SelectItem>
            <SelectItem value="market_close">Market Close</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
      
      <Handle type="source" position={Position.Right} />
    </Card>
  );
};

const nodeTypes = {
  condition: ConditionNode,
  action: ActionNode,
  trigger: TriggerNode,
};

// Main StrategyBuilder Component
export const StrategyBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [strategyName, setStrategyName] = useState('');
  const [nodeIdCounter, setNodeIdCounter] = useState(1);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node data updates
  React.useEffect(() => {
    const handleNodeDataUpdate = (event: any) => {
      const { id, ...updates } = event.detail;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
    };

    window.addEventListener('updateNodeData', handleNodeDataUpdate);
    return () => window.removeEventListener('updateNodeData', handleNodeDataUpdate);
  }, [setNodes]);

  const addNode = (type: 'condition' | 'action' | 'trigger') => {
    const id = `${type}-${nodeIdCounter}`;
    let data: CustomNodeData;
    let position = { x: Math.random() * 400, y: Math.random() * 400 };

    switch (type) {
      case 'condition':
        data = {
          type: 'condition',
          field: '',
          operator: '',
          value: '',
          label: `Condition ${nodeIdCounter}`,
        };
        break;
      case 'action':
        data = {
          type: 'action',
          action: '',
          parameters: {},
          label: `Action ${nodeIdCounter}`,
        };
        break;
      case 'trigger':
        data = {
          type: 'trigger',
          event: '',
          label: `Trigger ${nodeIdCounter}`,
        };
        break;
    }

    const newNode: Node = {
      id,
      type,
      position,
      data,
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter((prev) => prev + 1);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const generateStrategyJSON = () => {
    const strategy = {
      name: strategyName || 'Untitled Strategy',
      created: new Date().toISOString(),
      rules: nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        position: node.position,
        config: node.data,
      })),
      connections: edges.map((edge) => ({
        from: edge.source,
        to: edge.target,
        id: edge.id,
      })),
    };

    return strategy;
  };

  const saveStrategy = async () => {
    const strategyJSON = generateStrategyJSON();
    
    try {
      const response = await fetch('/api/strategy/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategyJSON),
      });

      if (response.ok) {
        alert('Strategy saved successfully!');
      } else {
        alert('Failed to save strategy');
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Error saving strategy');
    }
  };

  const testStrategy = async () => {
    const strategyJSON = generateStrategyJSON();
    
    // Sample signal for testing
    const testSignal = {
      pair: 'EURUSD',
      action: 'buy',
      entry: 1.1000,
      sl: 1.0950,
      tp: 1.1100,
      confidence: 0.65, // Low confidence to test rules
      lot_size: 0.1
    };
    
    try {
      const response = await fetch('/api/strategy/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parsedSignal: testSignal,
          userStrategy: strategyJSON
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Test Result:\nExecution Allowed: ${result.modified_payload.execution_allowed}\nActions: ${result.modified_payload.strategy_actions.join(', ')}`);
      } else {
        alert('Strategy test failed');
      }
    } catch (error) {
      console.error('Error testing strategy:', error);
      alert('Error testing strategy');
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 bg-white border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Strategy Builder</h2>
          <div className="flex gap-2">
            <Button onClick={clearCanvas} variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button onClick={testStrategy} variant="outline" size="sm">
              Test Strategy
            </Button>
            <Button onClick={saveStrategy} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save Strategy
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Input
            placeholder="Strategy Name"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="max-w-xs"
          />
          
          <div className="flex gap-2">
            <Button onClick={() => addNode('trigger')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Trigger
            </Button>
            <Button onClick={() => addNode('condition')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              IF Condition
            </Button>
            <Button onClick={() => addNode('action')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              THEN Action
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <details>
          <summary className="cursor-pointer text-sm font-medium">Preview Strategy JSON</summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(generateStrategyJSON(), null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default StrategyBuilder;