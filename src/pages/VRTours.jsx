import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Sparkles, Camera, Home, Video } from 'lucide-react';

export default function VRTours() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-cyan-100 mb-4">
          <Eye className="h-8 w-8 text-cyan-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">VR Property Tours</h1>
        <Badge className="bg-green-100 text-green-700 mb-4">Coming Soon</Badge>
        <p className="text-gray-500">Virtual reality property walkthroughs for borrowers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <Camera className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium text-gray-900">360° Views</p>
            <p className="text-sm text-gray-500 mt-1">Immersive property tours</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <Video className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
            <p className="font-medium text-gray-900">Live Tours</p>
            <p className="text-sm text-gray-500 mt-1">Real-time guided walkthroughs</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <Home className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium text-gray-900">Property Library</p>
            <p className="text-sm text-gray-500 mt-1">Saved tours and media</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">This feature is currently in development.</p>
          <p className="text-sm text-gray-400">
            VR tours will allow borrowers to virtually visit properties from anywhere, streamlining the lending process.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}