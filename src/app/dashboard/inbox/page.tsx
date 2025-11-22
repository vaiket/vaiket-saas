"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  MoreVertical, 
  Filter, 
  RefreshCw, 
  Mail, 
  User, 
  Clock, 
  Paperclip,
  Star,
  Archive,
  Trash2,
  Reply,
  MoreHorizontal,
  ChevronLeft,
  Menu,
  CheckCircle2
} from "lucide-react";

export default function InboxPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail' | 'accounts'
  const [activeFilter, setActiveFilter] = useState('all');

  // Load user's mail accounts
  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/mail-accounts/list");
      const json = await res.json();
      if (json.success) {
        setAccounts(json.accounts);
        if (json.accounts.length === 1) {
          setSelectedAccount(json.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load accounts", error);
    } finally {
      setLoading(false);
    }
  }

  // Load inbox emails
  async function loadEmails(accountId: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/imap/inbox?accountId=${accountId}`);
      const json = await res.json();
      if (json.success) {
        setEmails(json.emails);
      } else {
        setEmails([]);
      }
    } catch (error) {
      console.error("Failed to load emails", error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter emails based on search
  const filteredEmails = emails.filter(email => 
    email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.body?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initial accounts load
  useEffect(() => {
    loadAccounts();
  }, []);

  // When account changes -> load emails
  useEffect(() => {
    if (selectedAccount) {
      loadEmails(selectedAccount);
      setMobileView('list');
    }
  }, [selectedAccount]);

  // Select email handler
  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    setMobileView('detail');
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Get account name by ID
  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0D3B66] text-white p-4 z-10 flex items-center justify-between">
        {mobileView === 'detail' ? (
          <div className="flex items-center space-x-4 w-full">
            <button 
              onClick={() => setMobileView('list')}
              className="p-1"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="font-semibold truncate">
                {selectedEmail?.from?.split('<')[0]?.trim() || 'Unknown Sender'}
              </div>
              <div className="text-xs text-blue-200">Back to messages</div>
            </div>
          </div>
        ) : mobileView === 'accounts' ? (
          <div className="flex items-center space-x-4 w-full">
            <button 
              onClick={() => setMobileView('list')}
              className="p-1"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="font-semibold">Select Account</div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button 
              onClick={() => setMobileView('accounts')}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">
                  {selectedAccount ? getAccountName(selectedAccount) : 'Select Account'}
                </div>
                <div className="text-xs text-blue-200">Tap to switch</div>
              </div>
            </button>
            <button className="p-2">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Left Sidebar - Accounts & Email List */}
      <div className={`
        flex flex-col w-full md:w-1/3 lg:w-1/4 xl:w-1/5 bg-white border-r border-gray-200
        ${mobileView !== 'list' && mobileView !== 'accounts' ? 'hidden md:flex' : ''}
        ${mobileView === 'accounts' ? 'flex' : ''}
      `}>
        
        {/* Accounts List - Show on mobile when in accounts view */}
        {(mobileView === 'accounts' || window.innerWidth >= 768) && (
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
              <span>Your Email Accounts</span>
              <button 
                onClick={loadAccounts}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </h2>
            
            <div className="space-y-2">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccount(acc.id);
                    setMobileView('list');
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedAccount === acc.id 
                      ? "bg-[#0D3B66] text-white" 
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedAccount === acc.id ? "bg-white/20" : "bg-blue-100"
                    }`}>
                      <Mail className={selectedAccount === acc.id ? "w-5 h-5" : "w-5 h-5 text-blue-600"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${
                        selectedAccount === acc.id ? "text-white" : "text-gray-900"
                      }`}>
                        {acc.name}
                      </div>
                      <div className={`text-xs truncate ${
                        selectedAccount === acc.id ? "text-blue-200" : "text-gray-500"
                      }`}>
                        {acc.email}
                      </div>
                    </div>
                    {selectedAccount === acc.id && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email List - Show when not in accounts view on mobile */}
        {mobileView !== 'accounts' && (
          <>
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300 text-sm"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              {['all', 'unread', 'important'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                    activeFilter === filter 
                      ? 'text-[#0D3B66] border-b-2 border-[#0D3B66]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <Mail className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-sm">No emails found</p>
                </div>
              ) : (
                filteredEmails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`border-b border-gray-100 p-4 cursor-pointer transition-all duration-200 ${
                      selectedEmail?.id === email.id 
                        ? "bg-blue-50 border-l-4 border-l-[#0D3B66]" 
                        : "hover:bg-gray-50"
                    } ${email.unread ? "bg-blue-25" : ""}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-semibold">
                          {email.from?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-gray-900 text-sm truncate">
                            {email.from?.split('<')[0]?.trim() || 'Unknown Sender'}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(email.date)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-gray-800 text-sm truncate">
                            {email.subject || '(No Subject)'}
                          </div>
                          {email.attachments && email.attachments.length > 0 && (
                            <Paperclip className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-600 truncate">
                          {email.body?.substring(0, 60)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar - Email Detail */}
      <div className={`
        flex-1 bg-white
        ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            {/* Email Header */}
            <div className="border-b border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <button 
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1 text-gray-500"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-semibold text-gray-900 flex-1 md:flex-none">
                  {selectedEmail.subject || '(No Subject)'}
                </h1>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Reply className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {selectedEmail.from?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="font-semibold text-gray-900">
                      {selectedEmail.from?.split('<')[0]?.trim() || 'Unknown Sender'}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Primary
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    to me • {formatTime(selectedEmail.date)}
                  </div>
                </div>
                <button className="p-2 text-gray-500 hover:text-yellow-500 rounded-lg hover:bg-gray-100">
                  <Star className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                    {selectedEmail.body}
                  </pre>
                </div>
                
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attachments ({selectedEmail.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                            <div className="text-xs text-gray-500">{attachment.size}</div>
                          </div>
                          <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reply Area */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <textarea 
                      placeholder="Type a reply..."
                      rows="3"
                      className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-300">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <button className="p-1 hover:text-gray-700">
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:text-gray-700">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <button className="bg-[#0D3B66] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0A2E4D] transition-colors">
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Select an email to read</p>
              <p className="text-sm text-gray-600">Choose a message from your inbox</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}