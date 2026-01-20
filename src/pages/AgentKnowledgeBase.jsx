import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus, Search, Edit, Trash2, FileText, Tag } from 'lucide-react';
import { toast } from 'sonner';
import AddKnowledgeItemModal from '@/components/knowledge/AddKnowledgeItemModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AgentKnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [items, setItems] = useState([
    { 
      id: 1, 
      title: 'DSCR Calculation Standards', 
      category: 'Underwriting',
      tags: ['DSCR', 'Calculation', 'Guidelines'],
      content: 'Standard DSCR calculation formula: Net Operating Income / Total Debt Service. Minimum ratio: 1.00 for most programs, 1.25 for optimal pricing.',
      lastUpdated: '2026-01-15'
    },
    { 
      id: 2, 
      title: 'Document Requirements by Loan Type', 
      category: 'Documentation',
      tags: ['Documents', 'Requirements', 'Checklist'],
      content: 'DSCR loans require: 12-24 months bank statements, current lease agreement, rent roll (if applicable), property insurance.',
      lastUpdated: '2026-01-14'
    },
    { 
      id: 3, 
      title: 'LTV Guidelines', 
      category: 'Underwriting',
      tags: ['LTV', 'Guidelines', 'Limits'],
      content: 'Maximum LTV ratios: SFR Investment 80%, 2-4 Unit 75%, 5+ Unit 70%. Lower LTVs may qualify for better rates.',
      lastUpdated: '2026-01-13'
    },
    { 
      id: 4, 
      title: 'MISMO 3.4 Export Requirements', 
      category: 'Compliance',
      tags: ['MISMO', 'Export', 'XML'],
      content: 'All MISMO 3.4 exports must include proper AssetBase types, borrower demographics, and property details. Use OWNED_PROPERTY for subject property.',
      lastUpdated: '2026-01-12'
    },
  ]);

  const handleAddItem = async (newItem) => {
    setItems([...items, newItem]);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDelete = (itemId) => {
    setItems(items.filter(i => i.id !== itemId));
    setDeletingItem(null);
    toast.success('Knowledge item deleted');
  };

  const filteredItems = items.filter(item =>
    !searchTerm || 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-purple-600" />
            Agent Knowledge Base
          </h1>
          <p className="text-gray-500 mt-1">Manage training data and knowledge for AI agents</p>
        </div>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 gap-2"
          onClick={() => {
            setEditingItem(null);
            setShowAddModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Knowledge Item
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Items ({items.length})</TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {cat} ({items.filter(i => i.category === cat).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No knowledge items found</p>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map(item => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{item.category}</Badge>
                        {item.tags.map(tag => (
                          <Badge key={tag} className="bg-purple-100 text-purple-700 text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-3">Last updated: {item.lastUpdated}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            {items.filter(i => i.category === category).map(item => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    {item.tags.map(tag => (
                      <Badge key={tag} className="bg-purple-100 text-purple-700 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-3">Last updated: {item.lastUpdated}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <AddKnowledgeItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAddItem}
      />

      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this knowledge item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deletingItem)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}