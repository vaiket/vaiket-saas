"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

interface Rule {
  id: number;
  keyword: string;
  replyText: string;
  priority: number;
}

export default function AutoReplyPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [priority, setPriority] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/auto-reply");
      const data = await res.json();
      if (data.success) setRules(data.rules || []);
    } catch (err) {
      console.error("Fetch rules failed:", err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSubmit = async () => {
    if (!keyword.trim() || !response.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auto-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, response, priority }),
    });

    setLoading(false);

    if (res.status === 401) {
      toast.error("Please login again");
      return;
    }

    const data = await res.json();
    if (data.success) {
      toast.success("Rule added successfully!");
      setKeyword("");
      setResponse("");
      setPriority(1);
      fetchRules();
    } else {
      toast.error(data.error || "Something went wrong");
    }
  };

  return (
    <div className="p-6 w-full max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">AI Auto Reply Rules</h1>
      <p className="text-gray-600 text-sm">Create rule-based instant replies for emails</p>

      {/* Form */}
      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>Keyword (ex: price, support)</Label>
          <Input
            placeholder="Enter keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Reply Text</Label>
          <Input
            placeholder="Enter response text"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Priority (1 is highest)</Label>
          <Input
            type="number"
            min={1}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </div>

        <Button disabled={loading} onClick={handleSubmit} className="w-full">
          {loading ? "Saving..." : "Save Rule"}
        </Button>
      </Card>

      {/* Saved Rules */}
      <div className="space-y-3">
        <h2 className="font-semibold">Existing Rules</h2>

        {rules.length === 0 && (
          <p className="text-sm text-gray-500">No rules added yet.</p>
        )}

        {rules.map((r) => (
          <Card
            key={r.id}
            className="p-4 flex justify-between items-center hover:bg-gray-50 transition rounded-xl"
          >
            <div>
              <p className="font-medium">Keyword: {r.keyword}</p>
              <p className="text-sm text-gray-600">
                Reply: {r.replyText}
              </p>
            </div>
            <span className="text-xs bg-blue-100 px-2 py-1 rounded-md text-blue-700">
              Priority: {r.priority}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
