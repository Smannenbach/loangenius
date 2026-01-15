import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from 'lucide-react';

export default function SendMessageModal({ dealId, onClose }) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState('Email');
  const [templateId, setTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [additionalVars, setAdditionalVars] = useState({});
  const [error, setError] = useState(null);

  const { data: deal } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => base44.entities.Deal.get(dealId),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.MessageTemplate.filter({ is_active: true }),
  });

  const { data: borrower } = useQuery({
    queryKey: ['borrower', deal?.primary_borrower_id],
    queryFn: () => base44.entities.Borrower.get(deal.primary_borrower_id),
    enabled: !!deal?.primary_borrower_id,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('communicationService', {
        action: 'sendTemplate',
        templateId,
        loanFileId: dealId,
        borrowerId: deal.primary_borrower_id,
        additionalVars: {
          email: borrower?.email,
          phone: borrower?.phone,
          ...additionalVars,
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', dealId] });
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Failed to send message');
    },
  });

  const handleTemplateChange = async (id) => {
    setTemplateId(id);
    if (id) {
      try {
        const response = await base44.functions.invoke('communicationService', {
          action: 'renderTemplate',
          templateId: id,
          loanFileId: dealId,
          additionalVars,
        });
        setEmailSubject(response.subject || '');
        setEmailBody(response.emailHtml || '');
        setSmsBody(response.smsBody || '');
      } catch (err) {
        setError('Failed to load template');
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Borrower Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm">
              <strong>To:</strong> {borrower?.first_name} {borrower?.last_name} ({borrower?.email})
            </p>
          </div>

          {/* Channel Selection */}
          <div>
            <Label className="mb-2 block">Channel</Label>
            <RadioGroup value={channel} onValueChange={setChannel}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Email" id="email" />
                <Label htmlFor="email" className="font-normal cursor-pointer">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SMS" id="sms" />
                <Label htmlFor="sms" className="font-normal cursor-pointer">SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Both" id="both" />
                <Label htmlFor="both" className="font-normal cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Template Selection */}
          <div>
            <Label htmlFor="template" className="mb-2 block">Message Template</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Content */}
          {(channel === 'Email' || channel === 'Both') && (
            <div className="space-y-2 border-t pt-4">
              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="body">Email Body</Label>
                <Textarea
                  id="body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="mt-1 min-h-[200px] font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* SMS Content */}
          {(channel === 'SMS' || channel === 'Both') && (
            <div className="space-y-2 border-t pt-4">
              <div>
                <Label htmlFor="sms">SMS Message</Label>
                <Textarea
                  id="sms"
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  className="mt-1"
                  maxLength={1600}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {smsBody.length}/1600 characters
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-500"
              onClick={() => sendMutation.mutate()}
              disabled={!templateId || sendMutation.isPending}
            >
              {sendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {sendMutation.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}