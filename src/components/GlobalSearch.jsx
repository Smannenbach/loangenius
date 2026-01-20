import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search,
  X,
  Briefcase,
  Users,
  FileText,
  Clock,
  ArrowRight,
  Command,
  CornerDownLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Global search component with command palette functionality
 * Open with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
 */
export default function GlobalSearch({ isOpen, onClose, onSearch }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ loans: [], contacts: [], documents: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('loangenius_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults({ loans: [], contacts: [], documents: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Mock search function - replace with actual API call
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ loans: [], contacts: [], documents: [] });
      return;
    }

    setIsSearching(true);

    // Simulate API delay - replace with actual search
    await new Promise(resolve => setTimeout(resolve, 200));

    const q = searchQuery.toLowerCase();

    // Mock results - these would come from your Base44 entities
    const mockLoans = [
      { id: '1', loan_number: 'LG-000123', borrower_name: 'John Smith', amount: 450000, status: 'Processing' },
      { id: '2', loan_number: 'LG-000124', borrower_name: 'Jane Doe', amount: 320000, status: 'Underwriting' },
      { id: '3', loan_number: 'LG-000125', borrower_name: 'Bob Johnson', amount: 550000, status: 'Approved' },
    ].filter(l =>
      l.loan_number.toLowerCase().includes(q) ||
      l.borrower_name.toLowerCase().includes(q)
    );

    const mockContacts = [
      { id: '1', name: 'John Smith', email: 'john@example.com', type: 'Borrower' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com', type: 'Borrower' },
      { id: '3', name: 'Mike Wilson', email: 'mike@titleco.com', type: 'Title Company' },
    ].filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );

    const mockDocuments = [
      { id: '1', name: 'Bank Statement - Smith', type: 'Bank Statement', loan_number: 'LG-000123' },
      { id: '2', name: 'Appraisal Report', type: 'Appraisal', loan_number: 'LG-000124' },
      { id: '3', name: 'Title Commitment', type: 'Title', loan_number: 'LG-000125' },
    ].filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q)
    );

    setResults({
      loans: mockLoans.slice(0, 3),
      contacts: mockContacts.slice(0, 3),
      documents: mockDocuments.slice(0, 3),
    });

    setIsSearching(false);
    setSelectedIndex(0);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Get all results as flat array for keyboard navigation
  const allResults = [
    ...results.loans.map(l => ({ ...l, _type: 'loan' })),
    ...results.contacts.map(c => ({ ...c, _type: 'contact' })),
    ...results.documents.map(d => ({ ...d, _type: 'document' })),
  ];

  // Save to recent searches
  const saveRecentSearch = (item) => {
    try {
      const recent = [item, ...recentSearches.filter(r => r.id !== item.id)].slice(0, 5);
      setRecentSearches(recent);
      localStorage.setItem('loangenius_recent_searches', JSON.stringify(recent));
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  // Handle result selection
  const handleSelect = (item) => {
    saveRecentSearch({ id: item.id, name: item.name || item.borrower_name || item.loan_number, type: item._type });

    switch (item._type) {
      case 'loan':
        navigate(createPageUrl('LoanDetails') + `?id=${item.id}`);
        break;
      case 'contact':
        navigate(createPageUrl('Contacts') + `?id=${item.id}`);
        break;
      case 'document':
        navigate(createPageUrl('Documents') + `?id=${item.id}`);
        break;
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allResults[selectedIndex]) {
            handleSelect(allResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allResults, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search loans, contacts, documents..."
              className="flex-1 text-lg outline-none placeholder-gray-400"
              aria-label="Search"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isSearching ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-2">Searching...</p>
              </div>
            ) : query ? (
              <>
                {allResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No results found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Loans */}
                    {results.loans.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          Loans
                        </div>
                        {results.loans.map((loan, idx) => {
                          const globalIdx = idx;
                          return (
                            <button
                              key={loan.id}
                              onClick={() => handleSelect({ ...loan, _type: 'loan' })}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                                selectedIndex === globalIdx && 'bg-blue-50'
                              )}
                            >
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Briefcase className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {loan.loan_number} - {loan.borrower_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(loan.amount)} • {loan.status}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Contacts */}
                    {results.contacts.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          Contacts
                        </div>
                        {results.contacts.map((contact, idx) => {
                          const globalIdx = results.loans.length + idx;
                          return (
                            <button
                              key={contact.id}
                              onClick={() => handleSelect({ ...contact, _type: 'contact' })}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                                selectedIndex === globalIdx && 'bg-blue-50'
                              )}
                            >
                              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{contact.name}</div>
                                <div className="text-sm text-gray-500">{contact.email} • {contact.type}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Documents */}
                    {results.documents.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          Documents
                        </div>
                        {results.documents.map((doc, idx) => {
                          const globalIdx = results.loans.length + results.contacts.length + idx;
                          return (
                            <button
                              key={doc.id}
                              onClick={() => handleSelect({ ...doc, _type: 'document' })}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                                selectedIndex === globalIdx && 'bg-blue-50'
                              )}
                            >
                              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{doc.name}</div>
                                <div className="text-sm text-gray-500">{doc.type} • {doc.loan_number}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Recent Searches & Quick Actions */
              <div className="py-2">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                      Recent
                    </div>
                    {recentSearches.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.type === 'loan') navigate(createPageUrl('LoanDetails') + `?id=${item.id}`);
                          else if (item.type === 'contact') navigate(createPageUrl('Contacts') + `?id=${item.id}`);
                          else navigate(createPageUrl('Documents') + `?id=${item.id}`);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-xs text-gray-400 capitalize">{item.type}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    Quick Actions
                  </div>
                  <button
                    onClick={() => { navigate(createPageUrl('LoanApplicationWizard')); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-700">New Loan Application</span>
                    <kbd className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">N</kbd>
                  </button>
                  <button
                    onClick={() => { navigate(createPageUrl('Leads')); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">View Leads</span>
                    <kbd className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">L</kbd>
                  </button>
                  <button
                    onClick={() => { navigate(createPageUrl('Pipeline')); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span className="text-gray-700">View Pipeline</span>
                    <kbd className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">P</kbd>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded flex items-center">
                  <CornerDownLeft className="h-3 w-3" />
                </kbd>
                <span>Select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>K to open search</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage global search state and keyboard shortcuts
 */
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
