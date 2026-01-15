import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Users2,
  Plus,
  Search,
  Mail,
  Shield,
  MoreVertical,
  UserPlus,
} from 'lucide-react';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'loan_officer',
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['orgMemberships'],
    queryFn: () => base44.entities.OrgMembership.list(),
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      await base44.users.inviteUser(data.email, data.role);
    },
    onSuccess: () => {
      setIsInviteOpen(false);
      setInviteData({ email: '', role: 'loan_officer' });
      alert('Invitation sent successfully!');
    },
    onError: (error) => {
      alert('Error sending invitation: ' + error.message);
    },
  });

  const handleInvite = async () => {
    if (!inviteData.email) return;
    inviteMutation.mutate(inviteData);
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      loan_officer: 'bg-blue-100 text-blue-700 border-blue-200',
      processor: 'bg-green-100 text-green-700 border-green-200',
      realtor: 'bg-pink-100 text-pink-700 border-pink-200',
      underwriter: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      viewer: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const roleDescriptions = {
    admin: 'Full system access, manage users and settings',
    loan_officer: 'Manage deals, borrowers, documents, and communications',
    processor: 'Process documents, update deal status',
    realtor: 'View deals, referral tracking',
    underwriter: 'Underwriting decisions, deal approval',
    manager: 'Team oversight, reporting and analytics',
    viewer: 'Read-only access to deals',
  };

  const filteredMembers = memberships.filter(m => {
    if (!searchTerm) return true;
    return m.user_id?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Users2 className="h-7 w-7 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-500 mt-1">Manage team members and permissions</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role & Permissions</Label>
                <div className="space-y-2">
                  {[
                    { value: 'admin', label: '👨‍💼 Admin', desc: 'Full system access' },
                    { value: 'manager', label: '📊 Manager', desc: 'Team oversight & reporting' },
                    { value: 'loan_officer', label: '💼 Loan Officer', desc: 'Manage deals & borrowers' },
                    { value: 'processor', label: '📋 Processor', desc: 'Process documents' },
                    { value: 'underwriter', label: '✅ Underwriter', desc: 'Underwriting decisions' },
                    { value: 'realtor', label: '🏠 Realtor', desc: 'View deals & referrals' },
                    { value: 'viewer', label: '👁️ Viewer', desc: 'Read-only access' },
                  ].map(role => (
                    <label key={role.value} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50">
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={inviteData.role === role.value}
                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{role.label}</p>
                        <p className="text-xs text-gray-500">{role.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-500"
                onClick={handleInvite}
                disabled={!inviteData.email || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="border-gray-200 mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle>Team Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users2 className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p>No team members found</p>
              <Button 
                variant="link" 
                className="text-blue-600"
                onClick={() => setIsInviteOpen(true)}
              >
                Invite your first team member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {member.user_id?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.user_id}</p>
                      <p className="text-sm text-gray-500">{roleDescriptions[member.role] || 'Team member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`border ${getRoleColor(member.role)}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role?.replace(/_/g, ' ')}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}