import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Mail, MessageSquare, Plus, Play, Pause, Trash2, 
  Clock, Users, CheckCircle2, AlertCircle, Settings,
  Zap, Timer, ArrowRight, Edit, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export default function EmailSequences() {
  const [activeTab, setActiveTab] = useState('sequences');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['emailSequences'],
    queryFn: () => base44.entities.EmailSequence.list('-created_date')
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['sequenceEnrollments'],
    queryFn: () => base44.entities.SequenceEnrollment.list('-created_date', 100)
  });

  const { data: smsConfigs = [] } = useQuery({
    queryKey: ['smsConfigs'],
    queryFn: () => base44.entities.SMSNotificationConfig.list()
  });

  const [newSequence, setNewSequence] = useState({
    name: '',
    description: '',
    trigger_type: 'lead_inactivity',
    trigger_config: {},
    is_active: true,
    steps: []
  });

  const [newStep, setNewStep] = useState({
    channel: 'email',
    delay_minutes: 1440,
    subject: '',
    body: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => editingSequence 
      ? base44.entities.EmailSequence.update(editingSequence.id, data)
      : base44.entities.EmailSequence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['emailSequences']);
      setIsCreateOpen(false);
      setEditingSequence(null);
      resetForm();
      toast.success(editingSequence ? 'Sequence updated' : 'Sequence created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailSequence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['emailSequences']);
      toast.success('Sequence deleted');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.EmailSequence.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['emailSequences'])
  });

  const resetForm = () => {
    setNewSequence({
      name: '',
      description: '',
      trigger_type: 'lead_inactivity',
      trigger_config: {},
      is_active: true,
      steps: []
    });
  };

  const handleEdit = (sequence) => {
    setEditingSequence(sequence);
    setNewSequence({
      name: sequence.name,
      description: sequence.description || '',
      trigger_type: sequence.trigger_type,
      trigger_config: sequence.trigger_config || {},
      is_active: sequence.is_active,
      steps: sequence.steps || []
    });
    setIsCreateOpen(true);
  };

  const handleAddStep = () => {
    setCurrentStepIndex(null);
    setNewStep({ channel: 'email', delay_minutes: 1440, subject: '', body: '' });
    setIsStepModalOpen(true);
  };

  const handleEditStep = (index) => {
    setCurrentStepIndex(index);
    setNewStep(newSequence.steps[index]);
    setIsStepModalOpen(true);
  };

  const handleSaveStep = () => {
    const steps = [...newSequence.steps];
    if (currentStepIndex !== null) {
      steps[currentStepIndex] = newStep;
    } else {
      steps.push(newStep);
    }
    setNewSequence({ ...newSequence, steps });
    setIsStepModalOpen(false);
  };

  const handleRemoveStep = (index) => {
    const steps = newSequence.steps.filter((_, i) => i !== index);
    setNewSequence({ ...newSequence, steps });
  };

  const triggerTypeLabels = {
    'lead_inactivity': 'Lead Inactivity',
    'lead_status_change': 'Lead Status Change',
    'deal_status_change': 'Deal Status Change',
    'document_event': 'Document Event',
    'manual': 'Manual Enrollment'
  };

  const formatDelay = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation Center</h1>
          <p className="text-gray-500">Email sequences & SMS notifications</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingSequence(null); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sequences">Email Sequences</TabsTrigger>
          <TabsTrigger value="enrollments">Active Enrollments</TabsTrigger>
          <TabsTrigger value="sms">SMS Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : sequences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="font-semibold mb-2">No sequences yet</h3>
                <p className="text-gray-500 mb-4">Create automated email sequences to nurture leads</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Sequence
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sequences.map((sequence) => (
                <Card key={sequence.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          sequence.is_active ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Mail className={`h-5 w-5 ${
                            sequence.is_active ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{sequence.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Badge variant="outline">
                              <Zap className="h-3 w-3 mr-1" />
                              {triggerTypeLabels[sequence.trigger_type]}
                            </Badge>
                            <span>•</span>
                            <span>{sequence.steps?.length || 0} steps</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="font-medium">{sequence.total_enrolled || 0}</div>
                          <div className="text-gray-500">enrolled</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sequence.is_active}
                            onCheckedChange={(checked) => 
                              toggleMutation.mutate({ id: sequence.id, is_active: checked })
                            }
                          />
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(sequence)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteMutation.mutate(sequence.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {sequence.steps?.length > 0 && (
                      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                        {sequence.steps.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <div className="flex-shrink-0 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                {step.channel === 'email' ? (
                                  <Mail className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <MessageSquare className="h-4 w-4 text-green-500" />
                                )}
                                <span className="font-medium">Step {idx + 1}</span>
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                <Timer className="h-3 w-3 inline mr-1" />
                                {formatDelay(step.delay_minutes)}
                              </div>
                            </div>
                            {idx < sequence.steps.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments.filter(e => e.status === 'active').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active enrollments
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.filter(e => e.status === 'active').slice(0, 20).map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{enrollment.contact_email}</div>
                        <div className="text-sm text-gray-500">
                          Step {enrollment.current_step + 1} • Next: {enrollment.next_action_at ? new Date(enrollment.next_action_at).toLocaleString() : 'Pending'}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Notification Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['document_submitted', 'document_approved', 'document_rejected', 'deal_stage_change', 'loan_approved'].map((eventType) => {
                  const config = smsConfigs.find(c => c.event_type === eventType);
                  return (
                    <div key={eventType} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="capitalize">{eventType.replace(/_/g, ' ')}</Label>
                        <Switch checked={config?.is_active || false} />
                      </div>
                      <Textarea 
                        placeholder={`SMS template for ${eventType}...`}
                        value={config?.template || ''}
                        className="text-sm"
                        rows={2}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available: {'{{first_name}}, {{status}}, {{document_name}}, {{deal_number}}'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSequence ? 'Edit Sequence' : 'Create Email Sequence'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sequence Name</Label>
                <Input
                  value={newSequence.name}
                  onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
                  placeholder="e.g., New Lead Follow-up"
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={newSequence.trigger_type}
                  onValueChange={(v) => setNewSequence({ ...newSequence, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_inactivity">Lead Inactivity</SelectItem>
                    <SelectItem value="lead_status_change">Lead Status Change</SelectItem>
                    <SelectItem value="deal_status_change">Deal Status Change</SelectItem>
                    <SelectItem value="manual">Manual Enrollment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newSequence.description}
                onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
                placeholder="Describe when and why this sequence runs..."
                rows={2}
              />
            </div>

            {newSequence.trigger_type === 'lead_inactivity' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Target Status</Label>
                  <Select
                    value={newSequence.trigger_config.target_status || 'new'}
                    onValueChange={(v) => setNewSequence({
                      ...newSequence,
                      trigger_config: { ...newSequence.trigger_config, target_status: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inactivity Days</Label>
                  <Input
                    type="number"
                    value={newSequence.trigger_config.inactivity_days || 1}
                    onChange={(e) => setNewSequence({
                      ...newSequence,
                      trigger_config: { ...newSequence.trigger_config, inactivity_days: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
            )}

            {newSequence.trigger_type === 'lead_status_change' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>From Status (optional)</Label>
                  <Select
                    value={newSequence.trigger_config.from_status || ''}
                    onValueChange={(v) => setNewSequence({
                      ...newSequence,
                      trigger_config: { ...newSequence.trigger_config, from_status: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Any</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Status</Label>
                  <Select
                    value={newSequence.trigger_config.to_status || 'new'}
                    onValueChange={(v) => setNewSequence({
                      ...newSequence,
                      trigger_config: { ...newSequence.trigger_config, to_status: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sequence Steps</Label>
                <Button variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>
              
              {newSequence.steps.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-lg text-center text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No steps yet. Add your first step to the sequence.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newSequence.steps.map((step, idx) => (
                    <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {step.channel === 'email' ? '📧 Email' : '💬 SMS'}
                            {step.subject && `: ${step.subject}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            Delay: {formatDelay(step.delay_minutes)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditStep(idx)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStep(idx)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(newSequence)} disabled={!newSequence.name}>
              {editingSequence ? 'Save Changes' : 'Create Sequence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Modal */}
      <Dialog open={isStepModalOpen} onOpenChange={setIsStepModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentStepIndex !== null ? 'Edit Step' : 'Add Step'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={newStep.channel}
                  onValueChange={(v) => setNewStep({ ...newStep, channel: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delay (minutes)</Label>
                <Select
                  value={String(newStep.delay_minutes)}
                  onValueChange={(v) => setNewStep({ ...newStep, delay_minutes: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Immediately</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="1440">1 day</SelectItem>
                    <SelectItem value="2880">2 days</SelectItem>
                    <SelectItem value="4320">3 days</SelectItem>
                    <SelectItem value="10080">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newStep.channel === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={newStep.subject}
                  onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                  placeholder="Email subject line..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{newStep.channel === 'email' ? 'Body' : 'Message'}</Label>
              <Textarea
                value={newStep.body}
                onChange={(e) => setNewStep({ ...newStep, body: e.target.value })}
                placeholder="Message content..."
                rows={6}
              />
              <p className="text-xs text-gray-500">
                Variables: {'{{first_name}}, {{last_name}}, {{email}}, {{phone}}, {{property_address}}, {{loan_amount}}, {{status}}'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStep}>Save Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}