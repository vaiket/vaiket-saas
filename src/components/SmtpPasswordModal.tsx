"use client";

import { useState } from "react";

export default function SmtpPasswordModal({
  open,
  onClose,
  tenantId,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: number;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const savePassword = async () => {
    if (!password) return alert("Enter password");

    try {
      setLoading(true);

      const res = await fetch("/api/smtp/save-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, password }),
      });

      const data = await res.json();

      if (data.success) {
        alert("SMTP password saved");
        setPassword("");
        onClose(); // ✅ CLOSE MODAL
      } else {
        alert(data.error);
      }
    } catch {
      alert("Failed to save password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[360px]">
        <h3 className="font-semibold text-lg mb-3">
          🔐 Enter Mailbox Password
        </h3>

        <input
          type="password"
          className="w-full border px-3 py-2 rounded mb-4"
          placeholder="Enter mailbox password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border"
          >
            Cancel
          </button>

          <button
            onClick={savePassword}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
