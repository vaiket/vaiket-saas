"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import SmtpPasswordModal from "@/components/SmtpPasswordModal";
import { Mail, Send, RefreshCcw } from "lucide-react";

export default function BulkMailPage() {
  const [emails, setEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);

  // 🔹 Sync SMTP
  const syncSmtp = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const auth = await authRes.json();

      if (!auth.success) {
        alert("Not logged in");
        return;
      }

      setTenantId(auth.user.tenantId);

      const res = await fetch("/api/smtp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: auth.user.tenantId }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPasswordModal(true);
      } else {
        alert(data.error || "SMTP sync failed");
      }
    } catch (err) {
      console.error(err);
      alert("SMTP sync error");
    }
  };

  // 🔹 Send Mail
  const sendMail = async () => {
    if (!emails || !subject || !html) {
      alert("All fields required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emails.split(",").map((e) => e.trim()),
          subject,
          html,
        }),
      });

      const data = await res.json();
      setResult(data.results || []);
    } catch {
      alert("Mail sending failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold">Bulk Mail System</h1>
        </div>

        <button
          onClick={syncSmtp}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          <RefreshCcw size={18} />
          Sync SMTP
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-5">

        {/* Emails */}
        <div>
          <label className="font-semibold">Recipients</label>
          <textarea
            className="w-full mt-1 border rounded-md p-3"
            rows={3}
            placeholder="user1@gmail.com, user2@yahoo.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>

        {/* Subject */}
        <div>
          <label className="font-semibold">Subject</label>
          <input
            className="w-full mt-1 border rounded-md p-3"
            placeholder="Enter subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Editor */}
        <div>
          <label className="font-semibold mb-1 block">Email Content</label>
          <RichTextEditor value={html} onChange={setHtml} />
        </div>

        {/* Send Button */}
        <div className="flex justify-end">
          <button
            onClick={sendMail}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            <Send size={18} />
            {loading ? "Sending..." : "Send Mail"}
          </button>
        </div>
      </div>

      {/* Result */}
      {result.length > 0 && (
        <div className="mt-6 bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">📊 Delivery Report</h3>
          {result.map((r, i) => (
            <div
              key={i}
              className={`text-sm ${
                r.status === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {r.status === "success" ? "✅" : "❌"} {r.email}
            </div>
          ))}
        </div>
      )}

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
