"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import SmtpPasswordModal from "@/components/SmtpPasswordModal";
import { Mail, Send, RefreshCcw, Users, Hash, CheckCircle2, AlertCircle, Copy, Trash2 } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function BulkMailPage() {
  const [emails, setEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [emailCount, setEmailCount] = useState(0);

  // Update email count
  const handleEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEmails(value);
    const count = value.split(",").filter(email => email.trim()).length;
    setEmailCount(count);
  };

  // Clear all fields
  const clearAll = () => {
    setEmails("");
    setSubject("");
    setHtml("");
    setResult([]);
    setEmailCount(0);
    toast.success("Form cleared");
  };

  // Copy results
  const copyResults = () => {
    const text = result.map(r => 
      `${r.status === "success" ? "✅" : "❌"} ${r.email}: ${r.message || r.status}`
    ).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Results copied to clipboard");
  };

  // 🔹 Sync SMTP
  const syncSmtp = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const auth = await authRes.json();

      if (!auth.success) {
        toast.error("Please login first");
        return;
      }

      setTenantId(auth.user.tenantId);
      const toastId = toast.loading("Syncing SMTP configuration...");

      const res = await fetch("/api/smtp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: auth.user.tenantId }),
      });

      const data = await res.json();
      toast.dismiss(toastId);
      
      if (data.success) {
        setShowPasswordModal(true);
        toast.success("SMTP configured successfully");
      } else {
        toast.error(data.error || "SMTP sync failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync SMTP configuration");
    }
  };

  // 🔹 Send Mail
  const sendMail = async () => {
    if (!emails || !subject || !html) {
      toast.error("Please fill all required fields");
      return;
    }

    if (emailCount === 0) {
      toast.error("Please enter at least one valid email");
      return;
    }

    try {
      setLoading(true);
      const toastId = toast.loading(`Sending to ${emailCount} recipients...`);

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emails.split(",").map((e) => e.trim()).filter(e => e),
          subject,
          html,
        }),
      });

      const data = await res.json();
      toast.dismiss(toastId);
      
      if (data.results) {
        setResult(data.results);
        const successCount = data.results.filter((r: any) => r.status === "success").length;
        toast.success(`Sent ${successCount}/${emailCount} emails successfully`);
      } else {
        toast.error("Failed to send emails");
      }
    } catch {
      toast.error("Mail sending failed - check your connection");
    } finally {
      setLoading(false);
    }
  };

  const successCount = result.filter(r => r.status === "success").length;
  const failedCount = result.length - successCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Mail className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Mail System</h1>
              <p className="text-gray-600">Send professional emails to multiple recipients</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
            >
              <Trash2 size={18} />
              Clear All
            </button>
            <button
              onClick={syncSmtp}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RefreshCcw size={18} />
              Sync SMTP
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Email List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                {/* Email Recipients Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-800 flex items-center gap-2">
                      <Users size={18} />
                      Recipients
                    </label>
                    <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                      {emailCount} {emailCount === 1 ? 'recipient' : 'recipients'}
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full border-2 border-gray-300 rounded-xl p-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                      rows={4}
                      placeholder="user1@example.com, user2@example.com, user3@example.com"
                      value={emails}
                      onChange={handleEmailsChange}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                      Separate with commas
                    </div>
                  </div>
                </div>

                {/* Subject Section */}
                <div className="space-y-3">
                  <label className="font-semibold text-gray-800 flex items-center gap-2">
                    <Hash size={18} />
                    Subject
                  </label>
                  <input
                    className="w-full border-2 border-gray-300 rounded-xl p-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    placeholder="Enter your email subject here..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Editor Section */}
                <div className="space-y-3">
                  <label className="font-semibold text-gray-800 mb-2 block">
                    Email Content
                  </label>
                  <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
                    <RichTextEditor value={html} onChange={setHtml} />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-gray-50 px-6 md:px-8 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Make sure all fields are filled before sending</span>
                </div>
                <button
                  onClick={sendMail}
                  disabled={loading || emailCount === 0}
                  className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl min-w-[180px] justify-center"
                >
                  <Send size={20} />
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </span>
                  ) : (
                    `Send to ${emailCount} ${emailCount === 1 ? 'person' : 'people'}`
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Results */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} />
                Sending Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-700">Total Recipients</span>
                  <span className="font-bold text-blue-700">{emailCount}</span>
                </div>
                {result.length > 0 && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Successful</span>
                      <span className="font-bold text-green-700">{successCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Failed</span>
                      <span className="font-bold text-red-700">{failedCount}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Results Card */}
            {result.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Delivery Report</h3>
                    <button
                      onClick={copyResults}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Copy size={16} />
                      Copy Report
                    </button>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-4">
                  <div className="space-y-2">
                    {result.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          r.status === "success"
                            ? "bg-green-50 border border-green-100"
                            : "bg-red-50 border border-red-100"
                        }`}
                      >
                        <div className={`p-1.5 rounded-full ${
                          r.status === "success" ? "bg-green-100" : "bg-red-100"
                        }`}>
                          {r.status === "success" ? (
                            <CheckCircle2 className="text-green-600" size={16} />
                          ) : (
                            <AlertCircle className="text-red-600" size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{r.email}</p>
                          <p className={`text-sm ${
                            r.status === "success" ? "text-green-600" : "text-red-600"
                          }`}>
                            {r.message || (r.status === "success" ? "Delivered successfully" : "Delivery failed")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 p-6">
              <h4 className="font-bold text-gray-800 mb-3">📌 Quick Tips</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  Use commas to separate multiple emails
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  Sync SMTP before sending your first email
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  Test with 1-2 recipients first for bulk sending
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {tenantId && (
        <SmtpPasswordModal
          open={showPasswordModal}
          tenantId={tenantId}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
}