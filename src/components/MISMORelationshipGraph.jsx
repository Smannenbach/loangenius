import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { 
  Network, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  GitBranch
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * MISMO Relationship Graph Debug View
 * Shows xlink:labels, xlink:from/to, and arcroles for developers
 */
export default function MISMORelationshipGraph({ xmlContent, onValidate }) {
  const [graph, setGraph] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [pastedXml, setPastedXml] = useState('');

  const analyzeXml = async (xml) => {
    setLoading(true);
    try {
      const [graphRes, validationRes] = await Promise.all([
        base44.functions.invoke('mismoSequenceManager', {
          action: 'relationship_graph',
          xml_content: xml,
        }),
        base44.functions.invoke('mismoSequenceManager', {
          action: 'validate_relationships',
          xml_content: xml,
        }),
      ]);

      setGraph(graphRes.data?.graph);
      setValidation(validationRes.data);
      
      if (validationRes.data?.validation_passed) {
        toast.success('All relationships valid');
      } else if (validationRes.data?.invalid_relationships > 0) {
        toast.error(`${validationRes.data.invalid_relationships} invalid relationships found`);
      }
      
      if (onValidate) {
        onValidate(validationRes.data);
      }
    } catch (error) {
      toast.error('Failed to analyze XML: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    const xml = xmlContent || pastedXml;
    if (!xml) {
      toast.error('Please provide XML content');
      return;
    }
    analyzeXml(xml);
  };

  const exportGraph = () => {
    if (!graph) return;
    const json = JSON.stringify({ graph, validation }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mismo-relationship-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getNodeColor = (type) => {
    const colors = {
      'PARTY': 'bg-blue-100 text-blue-700 border-blue-300',
      'LOAN': 'bg-green-100 text-green-700 border-green-300',
      'COLLATERAL': 'bg-purple-100 text-purple-700 border-purple-300',
      'SERVICE': 'bg-orange-100 text-orange-700 border-orange-300',
      'ASSET': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'RELATIONSHIP': 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[type] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Relationship Graph Debug</CardTitle>
              <CardDescription>Analyze xlink:labels, hrefs, and arcroles</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {graph && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportGraph}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* XML Input (if no xmlContent prop) */}
        {!xmlContent && (
          <div className="space-y-2">
            <Textarea
              placeholder="Paste MISMO XML here..."
              value={pastedXml}
              onChange={(e) => setPastedXml(e.target.value)}
              className="font-mono text-xs h-32"
            />
            <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Analyze Relationships
            </Button>
          </div>
        )}

        {/* Auto-analyze button for provided XML */}
        {xmlContent && !graph && (
          <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            Analyze Relationships
          </Button>
        )}

        {/* Validation Summary */}
        {validation && (
          <div className={`p-4 rounded-lg ${validation.validation_passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {validation.validation_passed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {validation.validation_passed ? 'All Relationships Valid' : 'Validation Issues Found'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-2 font-medium">{validation.total_relationships}</span>
              </div>
              <div>
                <span className="text-green-600">Valid:</span>
                <span className="ml-2 font-medium">{validation.valid_relationships}</span>
              </div>
              <div>
                <span className="text-red-600">Invalid:</span>
                <span className="ml-2 font-medium">{validation.invalid_relationships}</span>
              </div>
            </div>

            {/* Issues List */}
            {validation.issues?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-red-700">Issues:</p>
                {validation.issues.map((issue, idx) => (
                  <div key={idx} className="text-xs bg-white p-2 rounded border border-red-200">
                    <span className="text-gray-500">Seq {issue.sequence}:</span> {issue.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Graph Nodes */}
        {graph && (
          <div className="space-y-4">
            {/* Nodes Section */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Nodes ({graph.nodes?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {graph.nodes?.map((node) => (
                  <div
                    key={node.id}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${getNodeColor(node.type)}`}
                  >
                    {showLabels ? node.id : `${node.type} #${node.sequence}`}
                  </div>
                ))}
              </div>
            </div>

            {/* Edges Section */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Edges ({graph.edges?.length || 0})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {graph.edges?.map((edge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded-lg"
                  >
                    <Badge variant="outline" className="font-mono">
                      {showLabels ? edge.from : graph.labels[edge.from]?.type || edge.from}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <Badge variant="outline" className="font-mono">
                      {showLabels ? edge.to : graph.labels[edge.to]?.type || edge.to}
                    </Badge>
                    <span className="ml-auto text-gray-500 truncate max-w-[200px]" title={edge.arcrole}>
                      {edge.arcrole_short}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Label Map */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Label Map</h4>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto">
                {Object.entries(graph.labels || {}).map(([label, info]) => (
                  <div key={label} className="flex justify-between py-0.5">
                    <span className="text-blue-600">{label}</span>
                    <span className="text-gray-500">{info.type} #{info.seq}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}