"use client";

import { useState, useEffect } from "react";
import { 
  Mail, 
  Server, 
  Lock, 
  Edit, 
  Trash2, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Shield,
  Network,
  User,
  Settings
} from "lucide-react";

export default function MailAccountsPage() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<{[key: number]: {smtp: boolean, imap: boolean}}>({});

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    smtpSecure: "ssl",
    imapHost: "",
    imapPort: "",
    imapUser: "",
    imapPass: "",
    imapSecure: "ssl"
  });

  // Load accounts
  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/mail-accounts/list");
      const data = await res.json();
      if (data.success) setAccounts(data.accounts || []);
      else setAccounts([]);
    } catch (err) {
      console.error("Load accounts error", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  // Update form field
  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Save account
  async function saveAccount() {
    setLoading(true);

    // Build payload but omit empty password fields so backend keeps existing ones
    const payload: any = {
      id: editingId,
      name: form.name,
      email: form.email,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
      smtpUser: form.smtpUser,
      smtpSecure: form.smtpSecure === "ssl",
      imapHost: form.imapHost,
      imapPort: form.imapPort ? Number(form.imapPort) : null,
      imapUser: form.imapUser,
      imapSecure: form.imapSecure === "ssl",
    };

    // Only attach passwords if the user provided them (non-empty)
    if (form.smtpPass && form.smtpPass.trim() !== "") payload.smtpPass = form.smtpPass.trim();
    if (form.imapPass && form.imapPass.trim() !== "") payload.imapPass = form.imapPass.trim();

    const url = editingId ? "/api/mail-accounts/update" : "/api/mail-accounts/add";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to save account");
        return;
      }
      
      await loadAccounts();
      resetForm();
    } catch (err) {
      console.error("Save error", err);
      alert("Server error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Reset form
  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: "",
      smtpSecure: "ssl",
      imapHost: "",
      imapPort: "",
      imapUser: "",
      imapPass: "",
      imapSecure: "ssl"
    });
  }

  // Edit account
  function editAccount(acc: any) {
    setEditingId(acc.id);
    setForm({
      name: acc.name || "",
      email: acc.email || "",
      smtpHost: acc.smtpHost || "",
      smtpPort: acc.smtpPort ? String(acc.smtpPort) : "",
      smtpUser: acc.smtpUser || "",
      // IMPORTANT: do NOT populate the password field with stored password
      smtpPass: "",
      smtpSecure: acc.smtpSecure ? "ssl" : "none",
      imapHost: acc.imapHost || "",
      imapPort: acc.imapPort ? String(acc.imapPort) : "",
      imapUser: acc.imapUser || "",
      // IMPORTANT: keep empty so the user must re-enter to change
      imapPass: "",
      imapSecure: acc.imapSecure ? "ssl" : "none"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete account
  async function deleteAccount(id: number) {
    if (!confirm("Are you sure you want to delete this mail account? This action cannot be undone.")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/mail-accounts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to delete account");
        return;
      }
      await loadAccounts();
    } catch (err) {
      console.error("Delete error", err);
      alert("Server error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Test connection
  async function testConnection(id: number) {
    try {
      const res = await fetch("/api/mail-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      
      setTestResults(prev => ({
        ...prev,
        [id]: data
      }));
    } catch (err) {
      console.error("Test connection error", err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {editingId ? "Edit Mail Account" : "Mail Accounts"}
              </h1>
              <p className="text-gray-600">
                {editingId 
                  ? "Update your email account settings" 
                  : "Manage your connected email accounts for AI automation"
                }
              </p>
            </div>
            <button
              onClick={resetForm}
              className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Account</span>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-[#0D3B66] rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingId ? "Edit Account" : "Add New Account"}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Configure SMTP and IMAP settings for your email account
                  </p>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-[#0D3B66]" />
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Account Name</label>
                      <input
                        placeholder="e.g., Work Email"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email Address</label>
                      <input
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* SMTP Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Server className="w-5 h-5 mr-2 text-[#0D3B66]" />
                    SMTP Settings (Sending)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">SMTP Host</label>
                      <input
                        placeholder="smtp.gmail.com"
                        value={form.smtpHost}
                        onChange={(e) => updateForm("smtpHost", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">SMTP Port</label>
                      <input
                        placeholder="587"
                        value={form.smtpPort}
                        onChange={(e) => updateForm("smtpPort", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">SMTP Username</label>
                      <input
                        placeholder="your@email.com"
                        value={form.smtpUser}
                        onChange={(e) => updateForm("smtpUser", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">SMTP Password</label>
                      <input
                        type="password"
                        placeholder="•••••••• (leave blank to keep existing)"
                        value={form.smtpPass}
                        onChange={(e) => updateForm("smtpPass", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave blank to keep current password.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Security</label>
                      <select
                        value={form.smtpSecure}
                        onChange={(e) => updateForm("smtpSecure", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      >
                        <option value="ssl">Secure (SSL/TLS)</option>
                        <option value="none">Non-Secure</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* IMAP Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Network className="w-5 h-5 mr-2 text-[#0D3B66]" />
                    IMAP Settings (Receiving)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">IMAP Host</label>
                      <input
                        placeholder="imap.gmail.com"
                        value={form.imapHost}
                        onChange={(e) => updateForm("imapHost", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">IMAP Port</label>
                      <input
                        placeholder="993"
                        value={form.imapPort}
                        onChange={(e) => updateForm("imapPort", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">IMAP Username</label>
                      <input
                        placeholder="your@email.com"
                        value={form.imapUser}
                        onChange={(e) => updateForm("imapUser", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">IMAP Password</label>
                      <input
                        type="password"
                        placeholder="•••••••• (leave blank to keep existing)"
                        value={form.imapPass}
                        onChange={(e) => updateForm("imapPass", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      />
                      <p className="text-xs text-gray-400 mt-1">Leave blank to keep current password.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Security</label>
                      <select
                        value={form.imapSecure}
                        onChange={(e) => updateForm("imapSecure", e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                      >
                        <option value="ssl">Secure (SSL/TLS)</option>
                        <option value="none">Non-Secure</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={saveAccount}
                    disabled={loading}
                    className="flex-1 bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-[#0D3B66]/25"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    <span>
                      {loading 
                        ? "Saving..." 
                        : editingId 
                          ? "Update Account" 
                          : "Save Account"
                      }
                    </span>
                  </button>
                  
                  <button
                    onClick={resetForm}
                    disabled={loading}
                    className="px-6 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-xl transition-all duration-300 hover:border-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Accounts List */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Accounts</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-[#0D3B66]">{accounts.length}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
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
                <h3 className="text-lg font-semibold text-gray-900">Your Accounts</h3>
                <button
                  onClick={loadAccounts}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading accounts...</p>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No mail accounts connected</p>
                    <p className="text-sm text-gray-400">Add your first email account to get started</p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-200"
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
                          <button
                            onClick={() => editAccount(account)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteAccount(account.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-1 text-sm ${
                            account.active ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              account.active ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span>{account.active ? 'Active' : 'Inactive'}</span>
                          </div>
                          
                          {testResults[account.id] && (
                            <div className="flex items-center space-x-2 text-xs">
                              <div className={`flex items-center space-x-1 ${
                                testResults[account.id].smtp ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {testResults[account.id].smtp ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                <span>SMTP</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${
                                testResults[account.id].imap ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {testResults[account.id].imap ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                <span>IMAP</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => testConnection(account.id)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors"
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Security Tips
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use app passwords for Gmail/Outlook</li>
                <li>• Enable 2-factor authentication</li>
                <li>• Test connections after saving</li>
                <li>• Keep credentials secure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
