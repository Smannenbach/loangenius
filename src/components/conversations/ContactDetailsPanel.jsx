import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Phone,
  Mail,
  Star,
  Tag,
  MapPin,
  Calendar,
  User,
  FileText,
  Search,
  ChevronDown,
  Info,
} from 'lucide-react';

export default function ContactDetailsPanel({ contact }) {
  const [expandedSection, setExpandedSection] = useState('contact');

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Contact Details</h3>
        <Button size="icon" variant="ghost" className="text-gray-600 h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Name & Avatar */}
        <div className="p-4 border-b border-gray-200 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            {contact.substring(0, 2).toUpperCase()}
          </div>
          <p className="font-semibold text-gray-900">{contact}</p>
          <p className="text-sm text-gray-500 mt-1">Contact</p>
        </div>

        {/* Contact Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'contact' ? null : 'contact')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <h4 className="font-semibold text-gray-900 text-sm">CONTACT</h4>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedSection === 'contact' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'contact' && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-xs text-gray-600 block mb-1">Email</Label>
                <p className="text-sm text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {contact}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-600 block mb-1">Phone</Label>
                <div className="flex gap-2">
                  <Input placeholder="+1 (555) 000-0000" className="text-sm h-8" disabled />
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'tags' ? null : 'tags')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <h4 className="font-semibold text-gray-900 text-sm">TAGS (0)</h4>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedSection === 'tags' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'tags' && (
            <div className="px-4 pb-4">
              <Input placeholder="Search tags and folders" className="text-sm h-8 mb-3" />
              <p className="text-xs text-gray-500">No tags assigned</p>
            </div>
          )}
        </div>

        {/* All Fields Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'fields' ? null : 'fields')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <h4 className="font-semibold text-gray-900 text-sm">ALL FIELDS</h4>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedSection === 'fields' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'fields' && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <Search className="h-3 w-3" />
                Search Fields and Folders
              </div>
              <div>
                <Label className="text-xs text-gray-600 block mb-1">First Name</Label>
                <Input className="text-sm h-8" disabled value={contact.split('@')[0]} />
              </div>
              <div>
                <Label className="text-xs text-gray-600 block mb-1">Last Name</Label>
                <Input className="text-sm h-8" disabled />
              </div>
              <div>
                <Label className="text-xs text-gray-600 block mb-1">Phone</Label>
                <Input className="text-sm h-8" placeholder="(555) 577-8373" />
              </div>
            </div>
          )}
        </div>

        {/* DNO Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'dno' ? null : 'dno')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <h4 className="font-semibold text-gray-900 text-sm">DNO</h4>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedSection === 'dno' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'dno' && (
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-500">No do-not-optimize settings</p>
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <h4 className="font-semibold text-gray-900 text-sm">ACTIONS</h4>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandedSection === 'actions' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'actions' && (
            <div className="px-4 pb-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                <Phone className="h-3 w-3 mr-1" /> Call
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                <Mail className="h-3 w-3 mr-1" /> Email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}