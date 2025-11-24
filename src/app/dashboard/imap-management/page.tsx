"use client";

import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import {
  Mail, 
  Server, 
  RefreshCw, 
  Play, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Upload,
  Settings,
  Shield,
  Activity,
  Clock,
  Filter,
  Search,
  MoreVertical,
  ChevronDown
} from "lucide-react";

type MailAccount = {
  id: number;
  name: string;
  email: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  provider?: string;
  active?: boolean;
  createdAt?: string;
  lastSync?: string;
  syncStatus?: 'success' | 'failed' | 'pending';
};

type IncomingEmail = {
  id: number;
  mailAccountId: number;
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  html?: string;
  messageId?: string;
  processed?: boolean;
  status?: string;
  createdAt?: string;
  hasAttachments?: boolean;
  read?: boolean;
};

export default function ImapManagementPage() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [viewingEmail, setViewingEmail] = useState<IncomingEmail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncProgress, setSyncProgress] = useState<{ [key: number]: boolean }>({});

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/mail-accounts/list");
      const j = await res.json();
      if (j.success) setAccounts(j.accounts || []);
      else console.error("Failed to load accounts:", j.error);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function handleTest(accountId: number) {
    setSyncProgress(prev => ({ ...prev, [accountId]: true }));
    try {
      const res = await fetch("/api/imap/test-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const j = await res.json();
      
      if (j.success) {
        // Update account status
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, syncStatus: 'success', lastSync: new Date().toISOString() }
            : acc
        ));
      } else {
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, syncStatus: 'failed' }
            : acc
        ));
      }
    } catch (error) {
      console.error("Test failed:", error);
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, syncStatus: 'failed' }
          : acc
      ));
    } finally {
      setSyncProgress(prev => ({ ...prev, [accountId]: false }));
    }
  }

  async function handleSync(accountId: number) {
    setSyncProgress(prev => ({ ...prev, [accountId]: true }));
    try {
      const res = await fetch("/api/imap/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const j = await res.json();
      
      if (j.success) {
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, syncStatus: 'success', lastSync: new Date().toISOString() }
            : acc
        ));
        
        if (selectedAccount === accountId) {
          await loadInbox(accountId);
        }
      } else {
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, syncStatus: 'failed' }
            : acc
        ));
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, syncStatus: 'failed' }
          : acc
      ));
    } finally {
      setSyncProgress(prev => ({ ...prev, [accountId]: false }));
    }
  }

  async function loadInbox(accountId: number) {
    setSelectedAccount(accountId);
    setLoading(true);
    try {
      const res = await fetch(`/api/imap/inbox?accountId=${accountId}`);
      const j = await res.json();
      if (j.success) setEmails(j.emails || []);
      else console.error("Failed to load inbox:", j.error);
    } catch (error) {
      console.error("Error loading inbox:", error);
    }
    setLoading(false);
  }

  function openEmail(e: IncomingEmail) {
    setViewingEmail(e);
  }

  // Filter emails based on search and status
  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'unread' && !email.read) ||
      (statusFilter === 'processed' && email.processed);
    
    return matchesSearch && matchesStatus;
  });

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 24) return date.toLocaleTimeString();
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#0D3B66] rounded-xl flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">IMAP Management</h1>
                <p className="text-gray-600">Manage your email accounts and monitor incoming messages</p>
              </div>
            </div>
            <button
              onClick={loadAccounts}
              className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Accounts Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">IMAP Accounts</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-[#0D3B66]">{accounts.length}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">
                    {accounts.filter(acc => acc.active).length}
                  </div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
              </div>
            </div>

            {/* Accounts List */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Connected Accounts</h3>
              </div>

              {loading && accounts.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No email accounts connected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-4 border rounded-xl transition-all duration-200 ${
                        selectedAccount === account.id
                          ? "border-[#0D3B66] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{account.name}</div>
                            <div className="text-sm text-gray-600">{account.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {account.syncStatus === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {account.syncStatus === 'failed' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mb-3">
                        {account.imapHost}:{account.imapPort}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            account.active ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs text-gray-600">
                            {account.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleTest(account.id)}
                            disabled={syncProgress[account.id]}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Test Connection"
                          >
                            {syncProgress[account.id] ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                          </button>

                          <button
                            onClick={() => handleSync(account.id)}
                            disabled={syncProgress[account.id]}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Sync Now"
                          >
                            {syncProgress[account.id] ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                          </button>

                          <button
                            onClick={() => loadInbox(account.id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Open Inbox"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                IMAP Tips
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Test connections after adding accounts</li>
                <li>• Use SSL/TLS for secure connections</li>
                <li>• Sync regularly to fetch new emails</li>
                <li>• Monitor sync status in dashboard</li>
              </ul>
            </div>
          </div>

          {/* Inbox Content */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              {/* Inbox Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Inbox {selectedAccount && `- ${accounts.find(a => a.id === selectedAccount)?.name}`}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedAccount 
                        ? `${emails.length} messages found` 
                        : 'Select an account to view inbox'
                      }
                    </p>
                  </div>
                  
                  {selectedAccount && (
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 appearance-none bg-white"
                        >
                          <option value="all">All Messages</option>
                          <option value="unread">Unread</option>
                          <option value="processed">Processed</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      </div>
                      
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search messages..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 w-64"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {selectedAccount && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Activity className="w-4 h-4" />
                      <span>Last sync: {accounts.find(a => a.id === selectedAccount)?.lastSync 
                        ? formatTime(accounts.find(a => a.id === selectedAccount)!.lastSync!)
                        : 'Never'
                      }</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{filteredEmails.length} messages</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inbox Content */}
              <div className="p-6">
                {!selectedAccount ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900">Select an Account</p>
                    <p className="text-sm text-gray-600 mt-1">Choose an email account to view its inbox</p>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900">No messages found</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'Click "Sync Now" to fetch emails from this account'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200 cursor-pointer"
                        onClick={() => openEmail(email)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 text-sm font-semibold">
                                {email.from?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="font-semibold text-gray-900 truncate">
                                  {email.from}
                                </div>
                                {!email.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                                {email.processed && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                              <div className="font-medium text-gray-800 text-sm truncate">
                                {email.subject || '(No Subject)'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTime(email.createdAt || '')}
                            </div>
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 line-clamp-2 ml-11">
                          {email.body?.replace(/<[^>]*>/g, '').substring(0, 150)}...
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-2 ml-11 text-xs text-gray-500">
                          {email.hasAttachments && (
                            <div className="flex items-center space-x-1">
                              <Paperclip className="w-3 h-3" />
                              <span>Attachment</span>
                            </div>
                          )}
                          {email.processed && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>Processed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Detail Modal */}
      {viewingEmail && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6 z-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {viewingEmail.from?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {viewingEmail.subject || "No subject"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      From: {viewingEmail.from} • {new Date(viewingEmail.createdAt || "").toLocaleString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingEmail(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {viewingEmail.processed && (
                  <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    <span>Processed by AI</span>
                  </div>
                )}
                {viewingEmail.hasAttachments && (
                  <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    <Paperclip className="w-3 h-3" />
                    <span>Has attachments</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                {viewingEmail.html ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewingEmail.html }} 
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                    {viewingEmail.body || "No content available"}
                  </pre>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end space-x-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Mark as Unread
              </button>
              <button className="px-4 py-2 bg-[#0D3B66] text-white rounded-lg hover:bg-[#0A2E4D] transition-colors">
                Reply with AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}