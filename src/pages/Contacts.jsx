import React, { useState, useEffect } from 'react';

// Simple debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
import { base44 } from '@/api/base44Client';
import { useOrgId, useOrgScopedQuery } from '@/components/useOrgId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SkeletonTable } from '@/components/ui/skeleton-cards';
import { EmptyContacts, EmptySearchResults } from '@/components/ui/empty-states';

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [contactType, setContactType] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Use canonical org resolver
  const { isLoading: orgLoading } = useOrgId();

  // Use org-scoped query - NEVER falls back to list()
  const { data: contacts = [], isLoading: contactsLoading } = useOrgScopedQuery('Contact');

  const isLoading = orgLoading || contactsLoading;

  // Filter contacts using debounced search term
  const filtered = contacts.filter(c => {
    const matchSearch = !debouncedSearchTerm ||
      (c.first_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (c.last_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (c.entity_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (c.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (c.phone?.includes(debouncedSearchTerm));

    const matchType = contactType === 'all' || c.contact_type === contactType;
    const matchFilter = filterType === 'all' || 
      (filterType === 'leads' && c.is_lead) ||
      (filterType === 'entities' && c.contact_type === 'entity');

    return matchSearch && matchType && matchFilter;
  });

  const getContactName = (contact) => {
    if (contact.contact_type === 'entity') return contact.entity_name;
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  };

  const quickFilters = [
    { label: 'All', value: 'all' },
    { label: 'Leads', value: 'leads' },
    { label: 'Entities', value: 'entities' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        <Link to={createPageUrl('ContactCreate')}>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2" data-testid="cta:Contacts:AddContact">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={contactType} onValueChange={setContactType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="entity">Entity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {quickFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                filterType === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : filtered.length === 0 && debouncedSearchTerm ? (
          <EmptySearchResults
            query={debouncedSearchTerm}
            onClear={() => setSearchTerm('')}
          />
        ) : contacts.length === 0 ? (
          <EmptyContacts
            onAction={() => window.location.href = createPageUrl('ContactCreate')}
          />
        ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Assigned To</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No contacts match your filters. Try adjusting your search criteria.
                </td>
              </tr>
            ) : (
              filtered.map(contact => (
                <tr key={contact.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {getContactName(contact)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {contact.email || contact.phone || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contact.contact_type === 'individual'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {contact.contact_type === 'individual' ? 'Individual' : 'Entity'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {contact.is_lead ? (
                      <span className="text-yellow-600 font-medium">Lead</span>
                    ) : (
                      <span className="text-green-600 font-medium">Borrower</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {contact.assigned_to ? 'Assigned' : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={createPageUrl(`ContactDetail?id=${contact.id}`)}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-6">
        <Button 
          variant="outline" 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="px-4 py-2 text-sm text-gray-600">
          Page {currentPage}
        </span>
        <Button 
          variant="outline"
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={filtered.length < 20}
        >
          Next
        </Button>
      </div>
    </div>
  );
}