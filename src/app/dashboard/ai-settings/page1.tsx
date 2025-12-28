"use client";

import { useEffect, useState } from "react";

export default function AiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    aiPrimary: "openai",
    aiFallback: "deepseek,gemini",
    aiModel: "gpt-4o-mini",
    aiMode: "balanced",
    tone: "professional",
    autoReply: true,
  });

  // Load settings on first render
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai/settings", { credentials: "include" });
        const json = await res.json();
        if (json.success) setSettings(json.data);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (json.success) alert("Saved successfully!");
      else alert(json.error || "Failed");
    } catch (e) {
      alert("Error saving settings");
    }
    setSaving(false);
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">AI Settings</h1>
      <p className="text-gray-500 mb-6">
        Manage AI provider, fallback, tone, and reply mode for this tenant.
      </p>

      <div className="space-y-6 bg-white p-6 rounded-xl shadow">

        {/* AI PROVIDER */}
        <div>
          <label className="font-medium">Primary AI Provider</label>
          <select
            className="mt-2 w-full border p-2 rounded"
            value={settings.aiPrimary}
            onChange={(e) => setSettings({ ...settings, aiPrimary: e.target.value })}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
          </select>
        </div>

        {/* FALLBACKS */}
        <div>
          <label className="font-medium">Fallback Providers (comma separated)</label>
          <input
            className="mt-2 w-full border p-2 rounded"
            value={settings.aiFallback}
            onChange={(e) => setSettings({ ...settings, aiFallback: e.target.value })}
          />
        </div>

        {/* MODEL */}
        <div>
          <label className="font-medium">AI Model</label>
          <select
            className="mt-2 w-full border p-2 rounded"
            value={settings.aiModel}
            onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
          >
            {/* OpenAI */}
            <option value="gpt-4o-mini">gpt-4o-mini (OpenAI)</option>
            <option value="gpt-4o">gpt-4o (OpenAI)</option>

            {/* DeepSeek */}
            <option value="deepseek-chat">deepseek-chat</option>

            {/* Gemini */}
            <option value="gemini-1.5-flash">gemini-1.5-flash</option>

            {/* Claude */}
            <option value="claude-3-haiku">claude-3-haiku</option>
            <option value="claude-3-sonnet">claude-3-sonnet</option>
          </select>
        </div>

        {/* MODE */}
        <div>
          <label className="font-medium">Reply Mode</label>
          <select
            className="mt-2 w-full border p-2 rounded"
            value={settings.aiMode}
            onChange={(e) => setSettings({ ...settings, aiMode: e.target.value })}
          >
            <option value="cheap">Cheap (low cost)</option>
            <option value="balanced">Balanced (recommended)</option>
            <option value="premium">Premium (best quality)</option>
          </select>
        </div>

        {/* TONE */}
        <div>
          <label className="font-medium">Tone</label>
          <select
            className="mt-2 w-full border p-2 rounded"
            value={settings.tone}
            onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="aggressive">Aggressive</option>
            <option value="chill">Chill</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>

        {/* AUTO REPLY */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoReply}
            onChange={(e) => setSettings({ ...settings, autoReply: e.target.checked })}
          />
          <label>Enable Auto-Reply</label>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
