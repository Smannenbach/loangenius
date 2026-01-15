import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MessageSquare, Plus, Filter } from 'lucide-react';
import SendMessageModal from './SendMessageModal';

export default function CommunicationsTab({ dealId }) {
  const [filterChannel, setFilterChannel] = useState('all');
  const [showSendModal, setShowSendModal] = useState(false);

  const { data: communications = [] } = useQuery({
    queryKey: ['communications', dealId],
    queryFn: () => base44.entities.Communication.filter({ loan_file_id: dealId }),
  });

  const filtered = communications.filter(c => 
    filterChannel === 'all' || c.channel === filterChannel
  );

  const getChannelIcon = (channel) => {
    return channel === 'SMS' ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Sent': 'bg-blue-100 text-blue-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800',
      'Read': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Messages</h3>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 gap-2"
          onClick={() => setShowSendModal(true)}
        >
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="SMS">SMS</SelectItem>
            <SelectItem value="Portal_Message">Portal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="p-6 text-center text-gray-500">
              No messages yet
            </CardContent>
          </Card>
        ) : (
          filtered.map((comm) => (
            <Card key={comm.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getChannelIcon(comm.channel)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comm.channel} ({comm.direction})
                        </span>
                        <Badge className={getStatusColor(comm.status)}>
                          {comm.status}
                        </Badge>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {comm.subject}
                        </p>
                      )}
                      {comm.channel === 'Email' && comm.to && (
                        <p className="text-xs text-gray-500">To: {comm.to}</p>
                      )}
                      {comm.channel === 'SMS' && comm.to && (
                        <p className="text-xs text-gray-500">To: {comm.to}</p>
                      )}
                      {comm.body && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {comm.body.replace(/<[^>]*>/g, '')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-gray-500">
                      {new Date(comm.created_date).toLocaleDateString()} {new Date(comm.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showSendModal && (
        <SendMessageModal
          dealId={dealId}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </div>
  );
}