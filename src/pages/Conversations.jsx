import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Search, Plus, User, Clock, CheckCircle, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Conversations() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['communications', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          return await base44.entities.CommunicationsLog.filter({ org_id: orgId });
        }
        return await base44.entities.CommunicationsLog.list();
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  // Group communications by deal/contact
  const conversations = communications.reduce((acc, comm) => {
    const key = comm.deal_id || comm.to || comm.from;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        deal_id: comm.deal_id,
        contact: comm.to || comm.from,
        messages: [],
        lastMessage: comm.created_date,
        unread: 0,
      };
    }
    acc[key].messages.push(comm);
    acc[key].lastMessage = new Date(Math.max(new Date(acc[key].lastMessage), new Date(comm.created_date)));
    return acc;
  }, {});

  const conversationList = Object.values(conversations).sort((a, b) => 
    new Date(b.lastMessage) - new Date(a.lastMessage)
  );

  const filteredConversations = conversationList.filter(conv =>
    !searchTerm ||
    conv.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.deal_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            Conversations
          </h1>
          <p className="text-gray-500 mt-1">All communications with borrowers and team members</p>
        </div>
        <Button 
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            // Navigate to Communications page for composing messages
            window.location.href = createPageUrl('Communications');
          }}
        >
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500 mb-4">Start communicating with borrowers</p>
            </CardContent>
          </Card>
        ) : (
          filteredConversations.map((conv) => (
            <Card key={conv.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{conv.contact}</h3>
                        {conv.deal_id && (
                          <Badge variant="outline" className="text-xs">{conv.deal_id}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conv.messages[conv.messages.length - 1]?.subject || 
                         conv.messages[conv.messages.length - 1]?.body?.substring(0, 60)}...
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(conv.lastMessage).toLocaleDateString()}
                        </span>
                        <Badge className={`text-xs ${
                          conv.messages[0]?.channel === 'email' ? 'bg-purple-100 text-purple-700' :
                          conv.messages[0]?.channel === 'sms' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {conv.messages[0]?.channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {conv.messages[0]?.channel === 'sms' && <Phone className="h-3 w-3 mr-1" />}
                          {conv.messages[0]?.channel || 'Portal'}
                        </Badge>
                        <span className="text-xs text-gray-500">{conv.messages.length} messages</span>
                      </div>
                    </div>
                  </div>
                  {conv.unread > 0 && (
                    <Badge className="bg-blue-600 ml-2">{conv.unread} new</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}