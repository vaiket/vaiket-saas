"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Save,
  Sparkles,
} from "lucide-react";

type ProfileState = {
  name: string;
  displayName: string;
  supportEmail: string;
  phone: string;
  website: string;
  timezone: string;
  country: string;
  billingAddress: string;
  taxId: string;
  invoicePrefix: string;
  senderName: string;
  replyToEmail: string;
};

type CountryOption = {
  iso2: string;
  name: string;
  flag: string;
  dialCode: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { iso2: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { iso2: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
  { iso2: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { iso2: "AE", name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  { iso2: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
  { iso2: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { iso2: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { iso2: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49" },
  { iso2: "FR", name: "France", flag: "🇫🇷", dialCode: "+33" },
  { iso2: "ES", name: "Spain", flag: "🇪🇸", dialCode: "+34" },
  { iso2: "IT", name: "Italy", flag: "🇮🇹", dialCode: "+39" },
  { iso2: "NL", name: "Netherlands", flag: "🇳🇱", dialCode: "+31" },
  { iso2: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55" },
  { iso2: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27" },
  { iso2: "JP", name: "Japan", flag: "🇯🇵", dialCode: "+81" },
];

const DEFAULT_COUNTRY = COUNTRY_OPTIONS[0];

const defaultProfile: ProfileState = {
  name: "",
  displayName: "",
  supportEmail: "",
  phone: "",
  website: "",
  timezone: "",
  country: "",
  billingAddress: "",
  taxId: "",
  invoicePrefix: "VAI-INV",
  senderName: "",
  replyToEmail: "",
};

function matchCountry(raw: string | null | undefined): CountryOption | null {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;

  return (
    COUNTRY_OPTIONS.find(
      (country) =>
        country.iso2.toLowerCase() === value || country.name.toLowerCase() === value
    ) || null
  );
}

function parsePhone(rawPhone: string | null | undefined) {
  const raw = String(rawPhone || "").trim();
  if (!raw) {
    return { country: DEFAULT_COUNTRY, localNumber: "" };
  }

  const clean = raw.replace(/[^\d+]/g, "");
  const sortedByDialLength = [...COUNTRY_OPTIONS].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );
  const matched = sortedByDialLength.find((country) => clean.startsWith(country.dialCode));
  if (!matched) {
    return { country: DEFAULT_COUNTRY, localNumber: clean.replace(/\D/g, "") };
  }

  const local = clean.slice(matched.dialCode.length).replace(/\D/g, "");
  return { country: matched, localNumber: local };
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function CompanySettingsPage() {
  const [form, setForm] = useState<ProfileState>(defaultProfile);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formLocked = !canEdit || saving;

  const emailLooksValid = useMemo(() => {
    if (!form.supportEmail.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim());
  }, [form.supportEmail]);

  const replyToLooksValid = useMemo(() => {
    if (!form.replyToEmail.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.replyToEmail.trim());
  }, [form.replyToEmail]);

  const phoneDigits = useMemo(() => phoneLocal.replace(/\D/g, ""), [phoneLocal]);
  const phoneLooksValid = useMemo(() => {
    if (!phoneDigits) return true;
    return phoneDigits.length >= 6 && phoneDigits.length <= 14;
  }, [phoneDigits]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/tenant/profile", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await readJsonSafe(res);
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to load tenant profile (${res.status})`);
        }

        setCanEdit(data.canEdit === true);

        const countryFromProfile = matchCountry(data.profile.country);
        const parsedPhone = parsePhone(data.profile.phone);
        const country = countryFromProfile || parsedPhone.country || DEFAULT_COUNTRY;

        setForm({
          name: data.profile.name || "",
          displayName: data.profile.displayName || "",
          supportEmail: data.profile.supportEmail || "",
          phone: "",
          website: data.profile.website || "",
          timezone: data.profile.timezone || "Asia/Kolkata",
          country: country.name,
          billingAddress: data.profile.billingAddress || "",
          taxId: data.profile.taxId || "",
          invoicePrefix: data.profile.invoicePrefix || "VAI-INV",
          senderName: data.profile.senderName || "",
          replyToEmail: data.profile.replyToEmail || "",
        });
        setSelectedCountry(country);
        setPhoneLocal(parsedPhone.localNumber);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const onChange = (key: keyof ProfileState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      if (!canEdit) {
        throw new Error("Only workspace owner can edit tenant profile");
      }

      if (!form.name.trim()) {
        throw new Error("Business name is required");
      }
      if (!emailLooksValid) {
        throw new Error("Support email format is invalid");
      }
      if (!replyToLooksValid) {
        throw new Error("Reply-to email format is invalid");
      }
      if (!phoneLooksValid) {
        throw new Error("Phone number should have 6 to 14 digits");
      }

      const payload: ProfileState = {
        ...form,
        country: selectedCountry.name,
        phone: phoneDigits ? `${selectedCountry.dialCode}${phoneDigits}` : "",
      };

      const res = await fetch("/api/tenant/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to update tenant profile (${res.status})`);
      }

      setMessage("Tenant profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-3xl border border-blue-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <p className="text-sm text-gray-600">Loading tenant profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace Identity
            </p>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 md:text-3xl">
              Tenant Profile
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Keep your business profile polished across invoices, email sender
              identity, and team communications.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            {canEdit ? "Owner editing enabled" : "View-only for non-owner roles"}
          </div>
        </div>
      </section>

      {!canEdit && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          Tenant profile editing is locked. Only workspace owner can update these settings.
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            Business Identity
          </h2>
          <div className="space-y-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Business Name</span>
              <input
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                disabled={formLocked}
                placeholder="Your company name"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Display Name</span>
              <input
                value={form.displayName}
                onChange={(e) => onChange("displayName", e.target.value)}
                disabled={formLocked}
                placeholder="Brand display name"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Website</span>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.website}
                  onChange={(e) => onChange("website", e.target.value)}
                  disabled={formLocked}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <MapPin className="h-4 w-4 text-blue-600" />
            Contact and Region
          </h2>
          <div className="space-y-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Country</span>
              <select
                value={selectedCountry.iso2}
                disabled={formLocked}
                onChange={(e) => {
                  const next =
                    COUNTRY_OPTIONS.find((item) => item.iso2 === e.target.value) ||
                    DEFAULT_COUNTRY;
                  setSelectedCountry(next);
                  onChange("country", next.name);
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.iso2} value={country.iso2}>
                    {country.flag} {country.name} ({country.dialCode})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Support Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.supportEmail}
                  disabled={formLocked}
                  onChange={(e) => onChange("supportEmail", e.target.value)}
                  placeholder="support@company.com"
                  className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 ${
                    emailLooksValid
                      ? "border-gray-300 focus:border-blue-300 focus:ring-blue-100"
                      : "border-red-300 focus:border-red-300 focus:ring-red-100"
                  }`}
                />
              </div>
              {!emailLooksValid && (
                <p className="text-xs text-red-600">
                  Please enter a valid email format (example: support@company.com)
                </p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Phone</span>
              <div className="flex">
                <div className="inline-flex items-center gap-2 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-700 sm:text-sm">
                  <span>{selectedCountry.flag}</span>
                  <span className="max-w-[110px] truncate sm:max-w-[150px]">
                    {selectedCountry.name}
                  </span>
                  <span>{selectedCountry.dialCode}</span>
                </div>
                <div className="relative flex-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={phoneLocal}
                    disabled={formLocked}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="Enter phone number"
                    inputMode="tel"
                    autoComplete="tel-national"
                    className={`w-full rounded-r-xl border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 ${
                      phoneLooksValid
                        ? "border-gray-300 focus:border-blue-300 focus:ring-blue-100"
                        : "border-red-300 focus:border-red-300 focus:ring-red-100"
                    }`}
                  />
                </div>
              </div>
              {!phoneLooksValid && (
                <p className="text-xs text-red-600">
                  Phone should be between 6 and 14 digits.
                </p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Timezone</span>
              <input
                value={form.timezone}
                disabled={formLocked}
                onChange={(e) => onChange("timezone", e.target.value)}
                placeholder="Asia/Kolkata"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <ReceiptText className="h-4 w-4 text-blue-600" />
            Billing and Sender Defaults
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Tax ID (GST/VAT)</span>
              <input
                value={form.taxId}
                disabled={formLocked}
                onChange={(e) => onChange("taxId", e.target.value)}
                placeholder="GSTIN / VAT Number"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Invoice Prefix</span>
              <input
                value={form.invoicePrefix}
                disabled={formLocked}
                onChange={(e) => onChange("invoicePrefix", e.target.value.toUpperCase())}
                placeholder="VAI-INV"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Default Sender Name</span>
              <input
                value={form.senderName}
                disabled={formLocked}
                onChange={(e) => onChange("senderName", e.target.value)}
                placeholder="Acme Team"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Reply-To Email</span>
              <input
                type="email"
                value={form.replyToEmail}
                disabled={formLocked}
                onChange={(e) => onChange("replyToEmail", e.target.value)}
                placeholder="reply@company.com"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  replyToLooksValid
                    ? "border-gray-300 focus:border-blue-300 focus:ring-blue-100"
                    : "border-red-300 focus:border-red-300 focus:ring-red-100"
                }`}
              />
              {!replyToLooksValid && (
                <p className="text-xs text-red-600">
                  Please enter a valid email format (example: reply@company.com)
                </p>
              )}
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-gray-700">Billing Address</span>
              <textarea
                value={form.billingAddress}
                disabled={formLocked}
                onChange={(e) => onChange("billingAddress", e.target.value)}
                rows={3}
                placeholder="Company billing address"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Country selected: {selectedCountry.flag} {selectedCountry.name}{" "}
            ({selectedCountry.dialCode})
          </p>
          <button
            onClick={handleSave}
            disabled={formLocked}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : canEdit ? "Save Tenant Profile" : "Owner Only"}
          </button>
        </div>
      </section>
    </div>
  );
}
