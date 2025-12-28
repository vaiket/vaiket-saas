"use client";

import { useEffect, useState } from "react";

export default function EmailActivationPage() {
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* 🔹 Fetch tenant domain from onboarding */
  useEffect(() => {
    const loadDomain = async () => {
      try {
        const res = await fetch("/api/onboarding/get");
        const data = await res.json();

        if (!data?.website) {
          setError("Domain not configured. Please complete onboarding.");
          return;
        }

        const cleanDomain = data.website
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/.*$/, "")
          .toLowerCase();

        setDomain(cleanDomain);
      } catch (err) {
        setError("Failed to load tenant domain");
      }
    };

    loadDomain();
  }, []);

  /* 🔹 Submit mailbox creation */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/mail/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Mailbox creation failed");
      }

      setSuccess("Mailbox created successfully 🎉");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-center">
          Activate Your Email Service
        </h2>
        <p className="text-sm text-gray-500 text-center mt-1">
          Create your mailbox for IMAP & SMTP access.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <div className="flex mt-1 rounded-md border overflow-hidden">
              <input
                type="text"
                className="flex-1 px-3 py-2 outline-none"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <span className="px-3 py-2 bg-gray-100 text-sm text-gray-600">
                @{domain || "domain.com"}
              </span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium">Mailbox Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 outline-none"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Activate Email"}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-3">
          This email will be used for IMAP & SMTP login.
        </p>
      </div>
    </div>
  );
}
