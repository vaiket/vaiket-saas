"use client";

import { useEffect, useState } from "react";
import { 
  Brain, 
  Settings, 
  MessageCircle, 
  Cpu, 
  Zap, 
  DollarSign, 
  CheckCircle, 
  RotateCcw,
  Shield,
  Bot,
  Sparkles,
  Save,
  AlertCircle
} from "lucide-react";

export default function AiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

  const [settings, setSettings] = useState({
    aiPrimary: "openai",
    aiFallback: "deepseek,gemini",
    aiModel: "gpt-4o-mini",
    aiMode: "balanced",
    tone: "professional",
    autoReply: true,
    maxTokens: 1000,
    temperature: 0.7,
    enableFallback: true,
    costOptimization: true,
  });

  // Available options
  const aiProviders = [
    { value: "openai", label: "OpenAI GPT", icon: <Brain className="w-4 h-4" />, description: "Most capable, higher cost" },
    { value: "deepseek", label: "DeepSeek", icon: <Zap className="w-4 h-4" />, description: "Excellent performance, cost-effective" },
    { value: "gemini", label: "Google Gemini", icon: <Bot className="w-4 h-4" />, description: "Fast responses, reliable" },
    { value: "claude", label: "Anthropic Claude", icon: <Sparkles className="w-4 h-4" />, description: "Thoughtful, great for complex tasks" },
  ];

  const aiModels = {
    openai: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini", cost: "Low", speed: "Fast" },
      { value: "gpt-4o", label: "GPT-4o", cost: "Medium", speed: "Fast" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", cost: "High", speed: "Medium" },
    ],
    deepseek: [
      { value: "deepseek-chat", label: "DeepSeek Chat", cost: "Very Low", speed: "Very Fast" },
      { value: "deepseek-coder", label: "DeepSeek Coder", cost: "Very Low", speed: "Very Fast" },
    ],
    gemini: [
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", cost: "Low", speed: "Very Fast" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", cost: "Medium", speed: "Fast" },
    ],
    claude: [
      { value: "claude-3-haiku", label: "Claude 3 Haiku", cost: "Low", speed: "Very Fast" },
      { value: "claude-3-sonnet", label: "Claude 3 Sonnet", cost: "Medium", speed: "Fast" },
      { value: "claude-3-opus", label: "Claude 3 Opus", cost: "High", speed: "Slow" },
    ],
  };

  const replyModes = [
    { value: "cheap", label: "Cost Optimized", description: "Use cheapest models, faster responses", cost: "Low" },
    { value: "balanced", label: "Balanced", description: "Mix of quality and cost efficiency", cost: "Medium" },
    { value: "premium", label: "Premium Quality", description: "Best models for highest quality", cost: "High" },
  ];

  const tones = [
    { value: "professional", label: "Professional", description: "Formal and business-appropriate" },
    { value: "friendly", label: "Friendly", description: "Warm and approachable" },
    { value: "casual", label: "Casual", description: "Relaxed and conversational" },
    { value: "enthusiastic", label: "Enthusiastic", description: "Energetic and positive" },
    { value: "empathetic", label: "Empathetic", description: "Understanding and supportive" },
  ];

  // Load settings
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai/settings", { credentials: "include" });
        const json = await res.json();
        if (json.success) setSettings(json.data);
      } catch (e) {
        console.error("Failed to load AI settings");
      }
      setLoading(false);
    }
    load();
  }, []);

  // Save settings
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
      if (json.success) {
        // Show success feedback
        setTestResult({ success: true, message: "Settings saved successfully!" });
      } else {
        setTestResult({ success: false, message: json.error || "Failed to save settings" });
      }
    } catch (e) {
      setTestResult({ success: false, message: "Error saving settings" });
    }
    setSaving(false);
  }

  // Test AI configuration
  async function testConfiguration() {
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: settings.aiPrimary, model: settings.aiModel }),
      });
      const json = await res.json();
      setTestResult({ 
        success: json.success, 
        message: json.message || (json.success ? "AI configuration test passed!" : "Test failed") 
      });
    } catch (e) {
      setTestResult({ success: false, message: "Test failed - check your configuration" });
    }
  }

  // Update settings helper
  function updateSetting(field: string, value: any) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0D3B66] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-[#0D3B66] rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Settings</h1>
              <p className="text-gray-600">
                Configure your AI providers, models, and response behavior
              </p>
            </div>
          </div>
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-2xl border ${
            testResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Provider Selection */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <Brain className="w-5 h-5 text-[#0D3B66]" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">AI Provider</h2>
                  <p className="text-sm text-gray-600">Choose your primary AI provider and fallbacks</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Primary Provider */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Primary Provider</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiProviders.map((provider) => (
                      <label
                        key={provider.value}
                        className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          settings.aiPrimary === provider.value
                            ? 'border-[#0D3B66] bg-[#0D3B66]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aiPrimary"
                          value={provider.value}
                          checked={settings.aiPrimary === provider.value}
                          onChange={(e) => updateSetting("aiPrimary", e.target.value)}
                          className="mt-1 text-[#0D3B66] focus:ring-[#0D3B66]"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center space-x-2">
                            {provider.icon}
                            <span className="font-medium text-gray-900">{provider.label}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{provider.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fallback Providers */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Fallback Providers</label>
                  <div className="flex items-center space-x-4">
                    <input
                      placeholder="deepseek,gemini"
                      value={settings.aiFallback}
                      onChange={(e) => updateSetting("aiFallback", e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                    />
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.enableFallback}
                        onChange={(e) => updateSetting("enableFallback", e.target.checked)}
                        className="rounded text-[#0D3B66] focus:ring-[#0D3B66]"
                      />
                      <span className="text-sm text-gray-700">Enable</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Comma-separated list of backup providers if primary fails
                  </p>
                </div>
              </div>
            </div>

            {/* Model & Configuration */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <Cpu className="w-5 h-5 text-[#0D3B66]" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Model & Configuration</h2>
                  <p className="text-sm text-gray-600">Fine-tune AI model behavior and parameters</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Model */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">AI Model</label>
                  <select
                    value={settings.aiModel}
                    onChange={(e) => updateSetting("aiModel", e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                  >
                    {aiModels[settings.aiPrimary as keyof typeof aiModels]?.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label} ({model.cost}, {model.speed})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reply Mode */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Reply Mode</label>
                  <select
                    value={settings.aiMode}
                    onChange={(e) => updateSetting("aiMode", e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:border-[#0D3B66] focus:ring-2 focus:ring-[#0D3B66]/20 transition-all duration-300"
                  >
                    {replyModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label} ({mode.cost})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Temperature: {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Max Tokens: {settings.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={settings.maxTokens}
                    onChange={(e) => updateSetting("maxTokens", parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Short</span>
                    <span>Long</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Style */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <MessageCircle className="w-5 h-5 text-[#0D3B66]" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Response Style</h2>
                  <p className="text-sm text-gray-600">Customize how AI responds to emails</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Tone Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Communication Tone</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tones.map((tone) => (
                      <label
                        key={tone.value}
                        className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          settings.tone === tone.value
                            ? 'border-[#0D3B66] bg-[#0D3B66]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tone"
                          value={tone.value}
                          checked={settings.tone === tone.value}
                          onChange={(e) => updateSetting("tone", e.target.value)}
                          className="mt-1 text-[#0D3B66] focus:ring-[#0D3B66]"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{tone.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{tone.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Auto-Reply Settings */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-900">Auto-Reply System</div>
                    <div className="text-sm text-gray-600">Automatically respond to incoming emails</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoReply}
                      onChange={(e) => updateSetting("autoReply", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D3B66]"></div>
                  </label>
                </div>

                {/* Cost Optimization */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-900">Cost Optimization</div>
                    <div className="text-sm text-gray-600">Use cheaper models for simple queries</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.costOptimization}
                      onChange={(e) => updateSetting("costOptimization", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D3B66]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full bg-[#0D3B66] hover:bg-[#0A2E4D] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>

                <button
                  onClick={testConfiguration}
                  className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-xl transition-all duration-300 hover:border-gray-400 flex items-center justify-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Test Configuration</span>
                </button>
              </div>
            </div>

            {/* Cost Estimates */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-[#0D3B66]" />
                Cost Estimate
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Model</span>
                  <span className="text-sm font-medium text-gray-900">
                    {aiModels[settings.aiPrimary as keyof typeof aiModels]?.find(m => m.value === settings.aiModel)?.cost || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reply Mode</span>
                  <span className="text-sm font-medium text-gray-900">
                    {replyModes.find(m => m.value === settings.aiMode)?.cost || "Unknown"}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Estimated Cost</span>
                    <span className="text-lg font-bold text-[#0D3B66]">Low - Medium</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Best Practices
              </h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• Use GPT-4o Mini for most business emails</li>
                <li>• Enable fallback providers for reliability</li>
                <li>• Test configuration after changes</li>
                <li>• Monitor costs in dashboard regularly</li>
                <li>• Use cost optimization for simple queries</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #0D3B66;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #0D3B66;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}