"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 🔹 Utility: website → clean domain
function extractDomain(website: string) {
  return website
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

export default function EmailActivationPage() {
  const router = useRouter();

  const [domain, setDomain] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  // 🔥 Bootstrap user + tenant + domain (RLS-safe)
  useEffect(() => {
    async function bootstrap() {
      try {
        setError("");

        // 1️⃣ Logged-in user
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const meData = await meRes.json();

        if (!meData.success || !meData.user?.email) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        // 2️⃣ Internal bootstrap (creates tenant/user if missing)
        const bootRes = await fetch("/api/internal/bootstrap-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: meData.user.email,
            name: meData.user.name || "User",
          }),
        });

        const bootData = await bootRes.json();

        if (!bootData.success) {
          setError("Failed to initialize account.");
          setLoading(false);
          return;
        }

        if (!bootData.website) {
          setError("Domain not found. Please complete onboarding.");
          setLoading(false);
          return;
        }

        setDomain(extractDomain(bootData.website));
        setLoading(false);
      } catch (err) {
        setError("Something went wrong while loading email setup.");
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  // 🔥 REAL MAILBOX CREATION
  const handleActivate = async () => {
    setError("");

    if (!username || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!domain) {
      setError("Domain not available.");
      return;
    }

    setActivating(true);

    try {
      const res = await fetch("/api/mail/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          domain,
          password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError("Failed to create mailbox.");
        setActivating(false);
        return;
      }

      // ✅ SUCCESS → redirect to Mail Accounts
      router.push("/dashboard/mail-accounts?created=1");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading email setup...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-16 bg-white p-8 rounded-lg border">
      <h1 className="text-2xl font-semibold mb-2">
        Activate Your Email Service
      </h1>
      <p className="text-gray-600 mb-6">
        Create your mailbox for IMAP & SMTP access.
      </p>

      {/* EMAIL */}
      <label className="block text-sm font-medium mb-1">
        Email Address
      </label>
      <div className="flex items-center border rounded-md mb-4">
        <input
          type="text"
          placeholder="info"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          className="flex-1 px-3 py-2 outline-none"
        />
        <span className="px-3 text-gray-500">
          @{domain}
        </span>
      </div>

      {/* PASSWORD */}
      <label className="block text-sm font-medium mb-1">
        Mailbox Password
      </label>
      <input
        type="password"
        className="w-full border px-3 py-2 rounded-md mb-3"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <input
        type="password"
        className="w-full border px-3 py-2 rounded-md mb-4"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      {error && (
        <p className="text-red-600 text-sm mb-3">{error}</p>
      )}

      <button
        onClick={handleActivate}
        disabled={!domain || activating}
        className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-900 transition disabled:opacity-60"
      >
        {activating ? "Creating Mailbox..." : "Activate Email"}
      </button>

      <p className="text-xs text-gray-500 mt-4">
        This email will be used for IMAP & SMTP login.
      </p>
    </div>
  );
}
