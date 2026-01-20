import React from 'react';
import { Button } from '@/components/ui/button';
import {
  FileText, Users, Home, DollarSign, MessageSquare,
  Calendar, Bell, Search, Plus, Upload, FolderOpen,
  Inbox, ClipboardList, TrendingUp, Building2
} from 'lucide-react';

const icons = {
  documents: FileText,
  contacts: Users,
  properties: Home,
  loans: DollarSign,
  messages: MessageSquare,
  tasks: ClipboardList,
  calendar: Calendar,
  notifications: Bell,
  search: Search,
  files: FolderOpen,
  inbox: Inbox,
  pipeline: TrendingUp,
  lenders: Building2,
};

export function EmptyState({
  icon = 'inbox',
  title = 'No data yet',
  description = 'Get started by creating your first item.',
  actionLabel,
  onAction,
  actionIcon = Plus,
  className = '',
}) {
  const IconComponent = typeof icon === 'string' ? icons[icon] || Inbox : icon;
  const ActionIcon = actionIcon;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <IconComponent className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function EmptyLoans({ onAction }) {
  return (
    <EmptyState
      icon="loans"
      title="No loans yet"
      description="Start by creating a new loan application or importing from your pipeline."
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Briefcase, 
  Search, 
  FolderOpen, 
  MessageSquare,
  Plus,
  RefreshCw
} from 'lucide-react';

function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionIcon: ActionIcon = Plus }) {
  return (
    <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
      <CardContent className="py-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
        {onAction && (
          <Button onClick={onAction} className="gap-2">
            <ActionIcon className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyLoans({ onAction }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No loans yet"
      description="Start building your loan portfolio by creating your first deal."
      actionLabel="Create New Loan"
      onAction={onAction}
    />
  );
}

export function EmptyContacts({ onAction }) {
  return (
    <EmptyState
      icon="contacts"
      title="No contacts found"
      description="Add borrowers, real estate agents, and other contacts to your database."
      actionLabel="Add Contact"
export function EmptyLeads({ onAction }) {
  return (
    <EmptyState
      icon={Users}
      title="No leads found"
      description="Add your first lead to start tracking potential borrowers."
      actionLabel="Add New Lead"
      onAction={onAction}
    />
  );
}

export function EmptyDocuments({ onAction }) {
  return (
    <EmptyState
      icon="documents"
      title="No documents uploaded"
      description="Upload loan documents, ID verification, income statements, and more."
      actionLabel="Upload Documents"
      actionIcon={Upload}
export function EmptyContacts({ onAction }) {
  return (
    <EmptyState
      icon={Users}
      title="No contacts yet"
      description="Add contacts to build your network and manage relationships."
      actionLabel="Add Contact"
      onAction={onAction}
    />
  );
}

export function EmptyMessages({ onAction }) {
  return (
    <EmptyState
      icon="messages"
      title="No messages"
      description="Start a conversation with your borrower or team members."
      actionLabel="Send Message"
export function EmptyDocuments({ onAction }) {
  return (
    <EmptyState
      icon={FileText}
      title="No documents uploaded"
      description="Upload documents to keep all your loan paperwork organized."
      actionLabel="Upload Document"
      onAction={onAction}
    />
  );
}

export function EmptyTasks({ onAction }) {
  return (
    <EmptyState
      icon="tasks"
      title="All caught up!"
      description="You have no pending tasks. Great job staying on top of things!"
      icon={FolderOpen}
      title="No tasks pending"
      description="You're all caught up! Create a new task to track your work."
      actionLabel="Create Task"
      onAction={onAction}
    />
  );
}

export function EmptySearchResults({ query, onClear }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search or filters.`}
      actionLabel="Clear Search"
      actionIcon={Search}
      onAction={onClear}
    />
  );
}

export function EmptyPipeline({ onAction }) {
  return (
    <EmptyState
      icon="pipeline"
      title="Pipeline is empty"
      description="No deals in your pipeline yet. Start by creating a new loan application."
      actionLabel="Create Deal"
      onAction={onAction}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="notifications"
      title="No notifications"
      description="You're all caught up! Check back later for updates."
    />
  );
}

export function EmptyLenders({ onAction }) {
  return (
    <EmptyState
      icon="lenders"
      title="No lenders configured"
      description="Add lender integrations to submit loans directly from LoanGenius."
      actionLabel="Add Lender"
      onAction={onAction}
    />
  );
}
    <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
      <CardContent className="py-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          No items match "{query}". Try adjusting your search or filters.
        </p>
        {onClear && (
          <Button variant="outline" onClick={onClear} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Clear Search
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyActivity() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No recent activity"
      description="Activity will appear here as you and your team work on deals."
    />
  );
}

export function EmptyDeals({ onAction }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No deals in pipeline"
      description="Create your first deal to start tracking your loan pipeline."
      actionLabel="Create New Deal"
      onAction={onAction}
    />
  );
}
