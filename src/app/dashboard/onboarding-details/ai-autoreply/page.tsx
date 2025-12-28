"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent
} from "@/components/ui/dialog";

interface Rule {
  id: number;
  keyword: string;
  replyText: string;
  priority: number;
}

export default function AiAutoReply() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [replyText, setReplyText] = useState("");
  const [priority, setPriority] = useState(1);

  const [editModal, setEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/auto-reply");
      const data = await res.json();
      setRules(Array.isArray(data) ? data : data.rules || []);
    } catch {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const saveRule = async () => {
    if (!keyword.trim() || !replyText.trim()) {
      toast.error("Keyword & Reply text required");
      return;
    }
    try {
      await fetch("/api/auto-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, replyText, priority }),
      });
      toast.success("Rule saved!");
      setKeyword("");
      setReplyText("");
      setPriority(1);
      fetchRules();
    } catch {
      toast.error("Error saving");
    }
  };

  const deleteRule = async (id: number) => {
    try {
      await fetch(`/api/auto-reply/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchRules();
    } catch {
      toast.error("Delete failed");
    }
  };

  const updateRule = async () => {
    if (!selectedRule) return;
    try {
      await fetch(`/api/auto-reply/${selectedRule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedRule),
      });
      toast.success("Updated!");
      setEditModal(false);
      fetchRules();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="p-6 w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">AI Auto Reply Rules</h2>

      <Card className="p-4 mb-8">
        <Label>Keyword</Label>
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="mb-3" />

        <Label>Reply Text</Label>
        <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} className="mb-3" />

        <Label>Priority (1 is highest)</Label>
        <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="mb-3" />

        <Button onClick={saveRule} className="w-full">Save Rule</Button>
      </Card>

      <h3 className="text-xl font-bold mb-3">Existing Rules</h3>

      {loading ? (
        <p>Loading...</p>
      ) : rules.length === 0 ? (
        <p>No rules created yet</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4 flex justify-between items-center">
              <div>
                <strong>{rule.keyword}</strong>
                <p className="text-sm text-gray-600">{rule.replyText}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRule(rule);
                    setEditModal(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => deleteRule(rule.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent>
          <h3 className="font-semibold text-lg mb-4">Edit Rule</h3>

          {selectedRule && (
            <>
              <Label>Keyword</Label>
              <Input className="mb-2"
                value={selectedRule.keyword}
                onChange={(e) => setSelectedRule({ ...selectedRule, keyword: e.target.value })}
              />

              <Label>Reply Text</Label>
              <Input className="mb-2"
                value={selectedRule.replyText}
                onChange={(e) => setSelectedRule({ ...selectedRule, replyText: e.target.value })}
              />

              <Label>Priority</Label>
              <Input className="mb-4"
                type="number"
                value={selectedRule.priority}
                onChange={(e) => setSelectedRule({ ...selectedRule, priority: Number(e.target.value) })}
              />

              <Button onClick={updateRule} className="w-full">Update</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
