import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Underwriting', 'Documentation', 'Compliance', 'Pricing', 'Processing', 'General'];

export default function AddKnowledgeItemModal({ open, onOpenChange, onAdd }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    tags: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    const newItem = {
      id: Date.now(),
      title: formData.title,
      category: formData.category,
      content: formData.content,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    // Call onAdd callback
    if (onAdd) {
      await onAdd(newItem);
    }

    toast.success('Knowledge item added successfully');
    setFormData({ title: '', category: '', content: '', tags: '' });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-600" />
            Add Knowledge Item
          </DialogTitle>
          <DialogDescription>
            Add training data or guidelines for AI agents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., DSCR Calculation Standards"
            />
          </div>

          <div>
            <Label>Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Content *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter the knowledge content..."
              rows={8}
            />
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., DSCR, Calculation, Guidelines"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Knowledge Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}