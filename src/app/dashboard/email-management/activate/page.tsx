"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ActivateMailPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/mail/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Activation failed");
      }

      setMessage("🎉 Mailbox activated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-xl font-semibold">Activate Business Email</h2>

          <p className="text-sm text-muted-foreground">
            This free mailbox is included with your active Automation Subscription.
          </p>

          <Input
            placeholder="Email address (eg: info@yourdomain.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Set mailbox password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          <Button
            onClick={handleActivate}
            disabled={loading || !email || !password}
            className="w-full"
          >
            {loading ? "Activating..." : "Activate Mailbox"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Password is encrypted and cannot be recovered later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
