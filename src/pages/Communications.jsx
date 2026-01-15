import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  User,
} from 'lucide-react';

export default function Communications() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.CommunicationsLog.list(),
  });

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-700',
      delivered: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      bounced: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Mail className="h-7 w-7 text-blue-600" />
            Communications
          </h1>
          <p className="text-gray-500 mt-1">Email, SMS, and call history</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Search */}
          <Card className="border-gray-200 mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search communications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Communications List */}
          <Card className="border-gray-200">
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No communications yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start by sending an email or SMS to a borrower
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                      <div className={`p-2 rounded-lg ${
                        log.channel === 'email' ? 'bg-blue-100' :
                        log.channel === 'sms' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {getChannelIcon(log.channel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {log.direction === 'outbound' ? 'To: ' : 'From: '}
                            {log.to_address || log.from_address}
                          </span>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        {log.subject && (
                          <p className="text-sm font-medium text-gray-700 mt-1">{log.subject}</p>
                        )}
                        <p className="text-sm text-gray-500 truncate mt-1">{log.body}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Mail className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No email communications</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No SMS communications</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone">
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Phone className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No phone calls logged</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}