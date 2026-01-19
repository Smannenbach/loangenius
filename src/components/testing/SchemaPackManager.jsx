import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Package, FileCode, Hash, Info, Shield, Loader2 } from 'lucide-react';

export default function SchemaPackManager() {
  const [selectedPack, setSelectedPack] = useState('PACK_A_GENERIC_MISMO_34_B324');

  const { data: packsData, isLoading } = useQuery({
    queryKey: ['schemaPacks'],
    queryFn: async () => {
      const response = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'list_packs'
      });
      return response.data;
    }
  });

  const { data: packInfo } = useQuery({
    queryKey: ['schemaPackInfo', selectedPack],
    queryFn: async () => {
      const response = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'get_pack_info',
        pack_id: selectedPack
      });
      return response.data;
    },
    enabled: !!selectedPack
  });

  const { data: extensionConfig } = useQuery({
    queryKey: ['extensionConfig'],
    queryFn: async () => {
      const response = await base44.functions.invoke('mismoSchemaPackManager', {
        action: 'get_extension_config'
      });
      return response.data;
    }
  });

  const packs = packsData?.packs || [];
  const pack = packInfo?.pack;
  const lgConfig = extensionConfig?.extension_config;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            MISMO Schema Pack Registry
          </CardTitle>
          <CardDescription>
            Pinned, versioned, and hashed schema packs for deterministic validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packs.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPack(p.id)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedPack === p.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">{p.name}</span>
                  </div>
                  {selectedPack === p.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-3">{p.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    v{p.mismo_version}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {p.build}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {p.validation_strictness}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Pack Details */}
      {pack && (
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Pack Details</TabsTrigger>
            <TabsTrigger value="schemas">Schema Files</TabsTrigger>
            <TabsTrigger value="extensions">Extensions</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>{pack.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">MISMO Version</p>
                    <p className="font-semibold">{pack.mismo_version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Build</p>
                    <p className="font-semibold">{pack.build}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">LDD Identifier</p>
                    <p className="font-mono text-sm">{pack.ldd_identifier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Root Element</p>
                    <p className="font-mono text-sm">{pack.root_element}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Pack Hash (Immutable)</p>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded font-mono text-xs">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <span className="break-all">{pack.pack_hash}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This hash is recorded on every export/import run for audit compliance
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Namespaces</p>
                  <div className="space-y-2">
                    {Object.entries(pack.namespaces).map(([prefix, uri]) => (
                      <div key={prefix} className="flex items-start gap-3 text-xs bg-gray-50 p-2 rounded">
                        <code className="font-bold text-blue-600">{prefix}:</code>
                        <code className="text-gray-700 break-all">{uri}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {pack.requires_du_wrapper && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">DU/ULAD Wrapper Required</p>
                      <p className="text-xs mt-1">This pack uses strict DU specification validation with wrapper schemas</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schemas">
            <Card>
              <CardHeader>
                <CardTitle>Schema Files ({pack.schema_files.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pack.schema_files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileCode className="h-4 w-4 text-blue-600" />
                      <span className="font-mono text-sm">{file}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Pinned:</strong> These schema files are version-locked and hashed. 
                    No "latest" or floating versions are used to ensure deterministic validation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extensions">
            <Card>
              <CardHeader>
                <CardTitle>LoanGenius Extension Configuration</CardTitle>
                <CardDescription>MEG-0025 compliant extension namespace</CardDescription>
              </CardHeader>
              <CardContent>
                {lgConfig && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Namespace URI</p>
                      <code className="block bg-gray-50 p-3 rounded text-sm break-all">
                        {lgConfig.namespace}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Prefix</p>
                        <p className="font-mono font-semibold">{lgConfig.prefix}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Version</p>
                        <p className="font-semibold">{lgConfig.version}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700">{lgConfig.description}</p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-semibold mb-2">DSCR & Business Purpose Fields</p>
                          <p className="text-xs mb-2">
                            All non-standard DSCR and business purpose loan fields are placed in EXTENSION/OTHER 
                            containers using the LG namespace, per MISMO Engineering Guideline MEG-0025.
                          </p>
                          <p className="text-xs font-mono">
                            Example: &lt;LG:DSCRatio xmlns:LG="{lgConfig.namespace}"&gt;1.25&lt;/LG:DSCRatio&gt;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}