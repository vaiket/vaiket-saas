"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  FileWarning,
  Hash,
  Layers,
  Layers3,
  PhoneCall,
  RefreshCcw,
  Search,
  SendHorizontal,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

type WaAccount = {
  id: string;
  name: string;
  phoneNumber: string;
};

type SendResponse = {
  queued: number;
  sent: number;
  failed: number;
  totalInput: number;
  uniqueNumbers: number;
  duplicatesRemoved: number;
  status: string;
  warning?: string;
  templateComponentsMappedRecipients?: number;
};

type SyncedTemplate = {
  name: string;
  language: string;
  status: string;
  category: string | null;
};

type WaContact = {
  id: string;
  name: string | null;
  phone: string;
  optedIn: boolean;
  tags: string[];
};

type TemplateOption = {
  value: string;
  name: string;
  language: string;
  label: string;
  source: "meta" | "fallback" | "custom";
  status: string;
  category: string | null;
};

type FailureEntry = {
  id: string;
  createdAt: string;
  templateKey: string;
  templateLanguage: string | null;
  failed: number;
  reason: string;
};

type DispatchMode = "instant" | "scheduled" | "recurring";
type VariableSource = "csv_column" | "fixed";

type CsvRecipient = {
  phone: string;
  rowNumber: number;
  values: Record<string, string>;
};

type TemplateVariableMap = {
  id: string;
  source: VariableSource;
  csvColumn: string;
  fixedValue: string;
};

type TemplateParameter = {
  type: "text";
  text: string;
};

type TemplateComponent = {
  type: "body";
  parameters: TemplateParameter[];
};

const CUSTOM_TEMPLATE_VALUE = "__custom__";

const fallbackTemplateOptions: TemplateOption[] = [
  {
    value: "hello_world::en_US",
    name: "hello_world",
    language: "en_US",
    label: "hello_world (en_US) - Default",
    source: "fallback",
    status: "FALLBACK",
    category: "UTILITY",
  },
  {
    value: "utility_update_v1::en_US",
    name: "utility_update_v1",
    language: "en_US",
    label: "utility_update_v1 (en_US)",
    source: "fallback",
    status: "FALLBACK",
    category: "UTILITY",
  },
];

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function normalizePhone(raw: string) {
  return raw.trim().replace(/[^\d+]/g, "");
}

function dedupeNumbers(input: string) {
  const lines = input
    .split(/\r?\n/g)
    .map((line) => normalizePhone(line))
    .filter(Boolean);
  const unique = Array.from(new Set(lines));
  return {
    uniqueText: unique.join("\n"),
    inputCount: lines.length,
    uniqueCount: unique.length,
    duplicatesRemoved: lines.length - unique.length,
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function createTemplateVariableMap(index: number): TemplateVariableMap {
  return {
    id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source: "csv_column",
    csvColumn: "",
    fixedValue: `value_${index}`,
  };
}

export default function WhatsAppSendMessagesPage() {
  const [accounts, setAccounts] = useState<WaAccount[]>([]);
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [accountId, setAccountId] = useState("");
  const [selectedTemplateValue, setSelectedTemplateValue] = useState("hello_world::en_US");
  const [customTemplateKey, setCustomTemplateKey] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [numbersText, setNumbersText] = useState("");
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>("instant");
  const [scheduleAt, setScheduleAt] = useState("");
  const [recurringRule, setRecurringRule] = useState("FREQ=DAILY");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResponse | null>(null);

  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [syncedTemplates, setSyncedTemplates] = useState<SyncedTemplate[]>([]);

  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [includeContactRecipients, setIncludeContactRecipients] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showSelectedContactsOnly, setShowSelectedContactsOnly] = useState(false);

  const [templateSearch, setTemplateSearch] = useState("");
  const [templateStatusFilter, setTemplateStatusFilter] = useState("all");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("all");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([]);
  const [csvPhoneColumn, setCsvPhoneColumn] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [templateVariableMaps, setTemplateVariableMaps] = useState<TemplateVariableMap[]>([]);

  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const [failuresLoading, setFailuresLoading] = useState(false);
  const [failureEntries, setFailureEntries] = useState<FailureEntry[]>([]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) || null,
    [accounts, accountId]
  );

  const stats = useMemo(() => dedupeNumbers(numbersText), [numbersText]);

  const templateOptions = useMemo(() => {
    const map = new Map<string, TemplateOption>();

    for (const template of syncedTemplates) {
      const value = `${template.name}::${template.language}`;
      map.set(value, {
        value,
        name: template.name,
        language: template.language,
        label: `${template.name} (${template.language}) - ${template.status.toLowerCase()}`,
        source: "meta",
        status: template.status,
        category: template.category,
      });
    }

    for (const fallback of fallbackTemplateOptions) {
      if (!map.has(fallback.value)) {
        map.set(fallback.value, fallback);
      }
    }

    return [
      ...Array.from(map.values()),
      {
        value: CUSTOM_TEMPLATE_VALUE,
        name: CUSTOM_TEMPLATE_VALUE,
        language: templateLanguage,
        label: "Custom Template Name",
        source: "custom",
        status: "CUSTOM",
        category: null,
      } satisfies TemplateOption,
    ];
  }, [syncedTemplates, templateLanguage]);

  const selectedTemplateOption = useMemo(
    () => templateOptions.find((template) => template.value === selectedTemplateValue) || null,
    [templateOptions, selectedTemplateValue]
  );

  const usingCustomTemplate = selectedTemplateValue === CUSTOM_TEMPLATE_VALUE;

  const resolvedTemplateKey = useMemo(() => {
    if (usingCustomTemplate) {
      return customTemplateKey.trim();
    }
    return selectedTemplateOption?.name || "";
  }, [usingCustomTemplate, customTemplateKey, selectedTemplateOption]);

  const scheduleEnabled =
    dispatchMode === "scheduled" || (dispatchMode === "recurring" && Boolean(scheduleAt));
  const recurringEnabled = dispatchMode === "recurring";
  const scheduleIsFuture = useMemo(() => {
    if (!scheduleAt) return false;
    const date = new Date(scheduleAt);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() > Date.now();
  }, [scheduleAt]);

  const templateStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const item of templateOptions) {
      if (item.status) set.add(item.status);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templateOptions]);

  const templateCategories = useMemo(() => {
    const set = new Set<string>();
    for (const item of templateOptions) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templateOptions]);

  const filteredTemplateOptions = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return templateOptions.filter((option) => {
      if (templateStatusFilter !== "all" && option.status !== templateStatusFilter) return false;
      if (templateCategoryFilter !== "all" && option.category !== templateCategoryFilter) return false;
      if (!q) return true;
      return `${option.name} ${option.language} ${option.label}`.toLowerCase().includes(q);
    });
  }, [templateOptions, templateSearch, templateStatusFilter, templateCategoryFilter]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    return contacts
      .filter((contact) => contact.optedIn)
      .filter((contact) => {
        if (showSelectedContactsOnly && !selectedContactIds.includes(contact.id)) return false;
        if (!q) return true;
        return `${contact.name ?? ""} ${contact.phone} ${contact.tags.join(" ")}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const aLabel = a.name || a.phone;
        const bLabel = b.name || b.phone;
        return aLabel.localeCompare(bLabel);
      });
  }, [contacts, contactSearch, showSelectedContactsOnly, selectedContactIds]);

  const selectedContactCount = selectedContactIds.length;

  const contactNumberStats = useMemo(() => {
    if (!includeContactRecipients || selectedContactIds.length === 0) {
      return dedupeNumbers("");
    }
    const selectedSet = new Set(selectedContactIds);
    const selectedNumbers = contacts
      .filter((contact) => selectedSet.has(contact.id))
      .map((contact) => contact.phone)
      .join("\n");
    return dedupeNumbers(selectedNumbers);
  }, [includeContactRecipients, selectedContactIds, contacts]);

  const dispatchNumbersStats = useMemo(() => {
    if (!includeContactRecipients) return stats;
    const merged = [stats.uniqueText, contactNumberStats.uniqueText].filter(Boolean).join("\n");
    return dedupeNumbers(merged);
  }, [includeContactRecipients, stats, contactNumberStats]);

  const csvRecipients = useMemo(() => {
    if (!csvPhoneColumn || csvRows.length === 0) {
      return [] as CsvRecipient[];
    }

    const rows: CsvRecipient[] = [];
    for (let i = 0; i < csvRows.length; i += 1) {
      const row = csvRows[i];
      const phone = normalizePhone(asString(row[csvPhoneColumn]));
      if (!phone) continue;
      rows.push({
        phone,
        rowNumber: i + 2,
        values: row,
      });
    }
    return rows;
  }, [csvRows, csvPhoneColumn]);

  const csvRecipientMap = useMemo(() => {
    const map = new Map<string, CsvRecipient>();
    for (const row of csvRecipients) {
      if (!map.has(row.phone)) {
        map.set(row.phone, row);
      }
    }
    return map;
  }, [csvRecipients]);

  const csvStats = useMemo(
    () => ({
      rows: csvRows.length,
      validPhones: csvRecipients.length,
      uniquePhones: csvRecipientMap.size,
      duplicatesRemoved: csvRecipients.length - csvRecipientMap.size,
    }),
    [csvRows.length, csvRecipients.length, csvRecipientMap]
  );

  const dispatchPhoneList = useMemo(
    () => dispatchNumbersStats.uniqueText.split(/\r?\n/g).map((item) => normalizePhone(item)).filter(Boolean),
    [dispatchNumbersStats.uniqueText]
  );

  const templateComponentsByPhone = useMemo(() => {
    const out: Record<string, TemplateComponent[]> = {};
    if (templateVariableMaps.length === 0) return out;

    for (const phone of dispatchPhoneList) {
      const csvRow = csvRecipientMap.get(phone) || null;
      const parameters: TemplateParameter[] = templateVariableMaps.map((mapping) => {
        const textValue =
          mapping.source === "fixed"
            ? mapping.fixedValue.trim()
            : asString(csvRow?.values[mapping.csvColumn]);
        return {
          type: "text",
          text: textValue,
        };
      });

      out[phone] = [
        {
          type: "body",
          parameters,
        },
      ];
    }

    return out;
  }, [templateVariableMaps, dispatchPhoneList, csvRecipientMap]);

  const templateMapCoverage = useMemo(() => {
    if (templateVariableMaps.length === 0 || dispatchPhoneList.length === 0) {
      return {
        missingRecipients: 0,
        missingValues: 0,
        samplePhones: [] as string[],
      };
    }

    let missingRecipients = 0;
    let missingValues = 0;
    const samplePhones: string[] = [];

    for (const phone of dispatchPhoneList) {
      const csvRow = csvRecipientMap.get(phone) || null;
      let hasMissing = false;

      for (const mapping of templateVariableMaps) {
        const value =
          mapping.source === "fixed"
            ? mapping.fixedValue.trim()
            : asString(csvRow?.values[mapping.csvColumn]);
        if (!value) {
          hasMissing = true;
          missingValues += 1;
        }
      }

      if (hasMissing) {
        missingRecipients += 1;
        if (samplePhones.length < 5) {
          samplePhones.push(phone);
        }
      }
    }

    return {
      missingRecipients,
      missingValues,
      samplePhones,
    };
  }, [templateVariableMaps, dispatchPhoneList, csvRecipientMap]);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/whatsapp/accounts", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(asString(data.error) || "Failed to load WhatsApp accounts");
      }

      const next = asArray<Record<string, unknown>>(data.accounts).map((item) => ({
        id: asString(item.id),
        name: asString(item.name) || "WhatsApp Account",
        phoneNumber: asString(item.phoneNumber),
      }));

      setAccounts(next);
      if (next.length > 0) {
        setAccountId((prev) => prev || next[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      setContactsLoading(true);
      setContactsError(null);

      const res = await fetch("/api/whatsapp/contacts", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(asString(data.error) || "Failed to load contacts");
      }

      const next = asArray<Record<string, unknown>>(data.contacts).map((item) => ({
        id: asString(item.id),
        name: asString(item.name) || null,
        phone: asString(item.phone),
        optedIn: Boolean(item.optedIn),
        tags: asArray<unknown>(item.tags).map((tag) => asString(tag)).filter(Boolean),
      }));
      setContacts(next);
    } catch (err) {
      setContacts([]);
      setContactsError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const loadSyncedTemplates = useCallback(async (targetAccountId: string) => {
    if (!targetAccountId) return;

    try {
      setTemplatesLoading(true);
      setTemplatesError(null);

      const res = await fetch(
        `/api/whatsapp/templates?accountId=${encodeURIComponent(targetAccountId)}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(asString(data.error) || "Failed to sync templates");
      }

      const rows = asArray<Record<string, unknown>>(data.templates).map((item) => ({
        name: asString(item.name),
        language: asString(item.language) || "en_US",
        status: asString(item.status) || "UNKNOWN",
        category: asString(item.category) || null,
      }));
      setSyncedTemplates(rows.filter((row) => row.name));
    } catch (err) {
      setSyncedTemplates([]);
      setTemplatesError(err instanceof Error ? err.message : "Failed to sync templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadFailures = useCallback(async () => {
    try {
      setFailuresLoading(true);

      const res = await fetch("/api/whatsapp/send-messages/failures", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(asString(data.error) || "Failed to load recent failures");
      }

      const rows = asArray<Record<string, unknown>>(data.failures).map((item) => ({
        id: asString(item.id),
        createdAt: asString(item.createdAt),
        templateKey: asString(item.templateKey) || "-",
        templateLanguage: asString(item.templateLanguage) || null,
        failed: Number(item.failed || 0),
        reason: asString(item.reason) || "Unknown failure",
      }));
      setFailureEntries(rows);
    } catch {
      setFailureEntries([]);
    } finally {
      setFailuresLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
    void loadContacts();
    void loadFailures();
  }, [loadAccounts, loadContacts, loadFailures]);

  useEffect(() => {
    if (!accountId) {
      setSyncedTemplates([]);
      return;
    }
    void loadSyncedTemplates(accountId);
  }, [accountId, loadSyncedTemplates]);

  useEffect(() => {
    const allowed = new Set(contacts.map((contact) => contact.id));
    setSelectedContactIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [contacts]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wa_send_messages_draft");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const draftDispatchMode = asString(parsed.dispatchMode);
      setNumbersText(asString(parsed.numbersText));
      setCustomTemplateKey(asString(parsed.customTemplateKey));
      setTemplateLanguage(asString(parsed.templateLanguage) || "en_US");
      setDispatchMode(
        draftDispatchMode === "scheduled" || draftDispatchMode === "recurring"
          ? draftDispatchMode
          : "instant"
      );
      setScheduleAt(asString(parsed.scheduleAt));
      setRecurringRule(asString(parsed.recurringRule) || "FREQ=DAILY");
      setCsvPhoneColumn(asString(parsed.csvPhoneColumn));
      const draftVariableMaps = asArray<Record<string, unknown>>(parsed.templateVariableMaps)
        .map((item, idx) => ({
          id: asString(item.id) || `var_draft_${idx}`,
          source: asString(item.source) === "fixed" ? "fixed" : "csv_column",
          csvColumn: asString(item.csvColumn),
          fixedValue: asString(item.fixedValue),
        }))
        .filter((item) => item.source === "fixed" || Boolean(item.csvColumn));
      setTemplateVariableMaps(draftVariableMaps);
    } catch {
      // ignore malformed local draft
    }
  }, []);

  useEffect(() => {
    const payload = {
      numbersText,
      customTemplateKey,
      templateLanguage,
      dispatchMode,
      scheduleAt,
      recurringRule,
      csvPhoneColumn,
      templateVariableMaps,
    };
    localStorage.setItem("wa_send_messages_draft", JSON.stringify(payload));
    setDraftSavedAt(new Date().toISOString());
  }, [
    numbersText,
    customTemplateKey,
    templateLanguage,
    dispatchMode,
    scheduleAt,
    recurringRule,
    csvPhoneColumn,
    templateVariableMaps,
  ]);

  useEffect(() => {
    if (csvColumns.length === 0) {
      setTemplateVariableMaps((prev) => {
        let changed = false;
        const next = prev.map((mapping) => {
          if (mapping.source !== "csv_column" || !mapping.csvColumn) return mapping;
          changed = true;
          return { ...mapping, csvColumn: "" };
        });
        return changed ? next : prev;
      });
      return;
    }

    const preferredColumn = csvColumns.find((column) => column !== csvPhoneColumn) || csvColumns[0];
    setTemplateVariableMaps((prev) => {
      let changed = false;
      const next = prev.map((mapping) => {
        if (mapping.source !== "csv_column") return mapping;
        if (mapping.csvColumn && csvColumns.includes(mapping.csvColumn)) return mapping;
        changed = true;
        return { ...mapping, csvColumn: preferredColumn };
      });
      return changed ? next : prev;
    });
  }, [csvColumns, csvPhoneColumn]);

  useEffect(() => {
    if (templateOptions.some((template) => template.value === selectedTemplateValue)) {
      return;
    }

    const firstTemplate = templateOptions[0];
    if (!firstTemplate) return;

    setSelectedTemplateValue(firstTemplate.value);
    if (firstTemplate.value !== CUSTOM_TEMPLATE_VALUE) {
      setTemplateLanguage(firstTemplate.language);
    }
  }, [templateOptions, selectedTemplateValue]);

  const handleTemplateSelection = (value: string) => {
    setSelectedTemplateValue(value);
    if (value === CUSTOM_TEMPLATE_VALUE) {
      return;
    }

    const option = templateOptions.find((template) => template.value === value);
    if (option?.language) {
      setTemplateLanguage(option.language);
    }
  };

  const handleCsvImport = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0] || null;
    if (!file) return;

    setCsvLoading(true);
    setCsvError(null);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = asArray<Record<string, unknown>>(results.data);
        const metaFields = asArray<string>(results.meta.fields).map((field) => asString(field)).filter(Boolean);

        const discoveredColumns =
          metaFields.length > 0
            ? metaFields
            : Array.from(
                new Set(
                  rawRows.flatMap((row) => Object.keys(row).map((column) => asString(column)).filter(Boolean))
                )
              );

        if (discoveredColumns.length === 0) {
          setCsvRows([]);
          setCsvColumns([]);
          setCsvPhoneColumn("");
          setCsvFileName(file.name);
          setCsvError("CSV must include a header row with at least one column.");
          setCsvLoading(false);
          input.value = "";
          return;
        }

        const normalizedRows = rawRows
          .map((row) => {
            const normalized: Record<string, string> = {};
            for (const column of discoveredColumns) {
              normalized[column] = asString(row[column]);
            }
            return normalized;
          })
          .filter((row) => discoveredColumns.some((column) => Boolean(row[column])));

        const detectedPhoneColumn =
          discoveredColumns.find((column) => /(phone|mobile|whatsapp|wa|number)/i.test(column)) ||
          discoveredColumns[0] ||
          "";

        setCsvRows(normalizedRows);
        setCsvColumns(discoveredColumns);
        setCsvPhoneColumn((prev) =>
          prev && discoveredColumns.includes(prev) ? prev : detectedPhoneColumn
        );
        setCsvFileName(file.name);

        const parsedPhones = normalizedRows
          .map((row) => normalizePhone(asString(row[detectedPhoneColumn])))
          .filter(Boolean);
        const uniquePhones = Array.from(new Set(parsedPhones)).length;

        setMessage(`CSV loaded: ${normalizedRows.length} rows, ${uniquePhones} unique phone numbers.`);
        setError(null);
        setCsvLoading(false);
        input.value = "";
      },
      error: (parseError) => {
        setCsvRows([]);
        setCsvColumns([]);
        setCsvPhoneColumn("");
        setCsvFileName(file.name);
        setCsvError(parseError.message || "Failed to parse CSV.");
        setCsvLoading(false);
        input.value = "";
      },
    });
  };

  const handleAppendCsvToRecipients = () => {
    const phones = Array.from(csvRecipientMap.keys());
    if (phones.length === 0) {
      setCsvError("No valid phone numbers found in CSV.");
      return;
    }

    const merged = [numbersText, phones.join("\n")].filter(Boolean).join("\n");
    const next = dedupeNumbers(merged);
    setNumbersText(next.uniqueText);
    setMessage(`Added ${phones.length} CSV recipients into manual numbers.`);
    setError(null);
    setCsvError(null);
  };

  const handleAddTemplateVariable = () => {
    const preferredColumn = csvColumns.find((column) => column !== csvPhoneColumn) || csvColumns[0] || "";
    const defaultSource: VariableSource = csvColumns.length > 0 ? "csv_column" : "fixed";
    setTemplateVariableMaps((prev) => [
      ...prev,
      {
        ...createTemplateVariableMap(prev.length + 1),
        source: defaultSource,
        csvColumn: preferredColumn,
        fixedValue: defaultSource === "fixed" ? `value_${prev.length + 1}` : "",
      },
    ]);
  };

  const handleUpdateTemplateVariable = (
    id: string,
    patch: Partial<Pick<TemplateVariableMap, "source" | "csvColumn" | "fixedValue">>
  ) => {
    setTemplateVariableMaps((prev) =>
      prev.map((mapping) => (mapping.id === id ? { ...mapping, ...patch } : mapping))
    );
  };

  const handleRemoveTemplateVariable = (id: string) => {
    setTemplateVariableMaps((prev) => prev.filter((mapping) => mapping.id !== id));
  };

  const handleClearTemplateVariables = () => {
    setTemplateVariableMaps([]);
  };

  const handleRemoveDuplicate = () => {
    const next = dedupeNumbers(numbersText);
    setNumbersText(next.uniqueText);
    setMessage(`Removed ${next.duplicatesRemoved} duplicate numbers.`);
    setError(null);
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setMessage(null);
      setResult(null);

      if (!accountId) {
        throw new Error("Please select a device");
      }
      if (!resolvedTemplateKey) {
        throw new Error("Please select template");
      }
      if (dispatchNumbersStats.uniqueCount === 0) {
        throw new Error("Please enter numbers or select opted-in contacts");
      }

      if (scheduleEnabled && !scheduleAt) {
        throw new Error("Please select schedule date/time");
      }

      if (dispatchMode === "scheduled") {
        const scheduleDate = new Date(scheduleAt);
        if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() <= Date.now()) {
          throw new Error("Schedule date/time must be in the future");
        }
      }

      if (recurringEnabled && !recurringRule.trim()) {
        throw new Error("Please enter recurring rule");
      }

      if (templateVariableMaps.length > 0 && templateMapCoverage.missingRecipients > 0) {
        const sampleText =
          templateMapCoverage.samplePhones.length > 0
            ? ` Sample: ${templateMapCoverage.samplePhones.join(", ")}`
            : "";
        throw new Error(
          `Template variable mapping is incomplete for ${templateMapCoverage.missingRecipients} recipients.${sampleText}`
        );
      }

      const res = await fetch("/api/whatsapp/send-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          templateKey: resolvedTemplateKey,
          templateLanguage,
          numbersText: dispatchNumbersStats.uniqueText,
          scheduleEnabled,
          scheduleAt: scheduleEnabled ? scheduleAt : null,
          recurringEnabled,
          recurringRule: recurringEnabled ? recurringRule.trim() : null,
          templateComponentsByPhone:
            templateVariableMaps.length > 0 ? templateComponentsByPhone : null,
        }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(asString(data.error) || "Failed to queue send messages");
      }

      setResult({
        queued: Number(data.queued || 0),
        sent: Number(data.sent || 0),
        failed: Number(data.failed || 0),
        totalInput: Number(data.totalInput || 0),
        uniqueNumbers: Number(data.uniqueNumbers || 0),
        duplicatesRemoved: Number(data.duplicatesRemoved || 0),
        status: asString(data.status) || "queued",
        warning: asString(data.warning) || undefined,
        templateComponentsMappedRecipients: Number(data.templateComponentsMappedRecipients || 0),
      });
      const normalizedStatus = asString(data.status);
      if (normalizedStatus === "sent" || normalizedStatus === "partial_failed") {
        setMessage(`Dispatch complete: sent ${Number(data.sent || 0)}, failed ${Number(data.failed || 0)}.`);
      } else {
        setMessage(
          dispatchMode === "scheduled"
            ? `Scheduled campaign accepted (${Number(data.queued || 0)}).`
            : dispatchMode === "recurring"
              ? `Recurring campaign queued (${Number(data.queued || 0)}).`
              : `Messages queued successfully (${Number(data.queued || 0)}).`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
      void loadFailures();
    }
  };

  const canDispatch = Boolean(
    accountId &&
      resolvedTemplateKey &&
      dispatchNumbersStats.uniqueCount > 0 &&
      (!scheduleEnabled || (scheduleEnabled && scheduleAt)) &&
      (!recurringEnabled || recurringRule.trim()) &&
      (templateVariableMaps.length === 0 || templateMapCoverage.missingRecipients === 0) &&
      (dispatchMode !== "scheduled" || scheduleIsFuture)
  );

  const filteredSelectedContactsCount = useMemo(
    () => filteredContacts.filter((contact) => selectedContactIds.includes(contact.id)).length,
    [filteredContacts, selectedContactIds]
  );

  const allFilteredContactsSelected =
    filteredContacts.length > 0 && filteredSelectedContactsCount === filteredContacts.length;

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const toggleFilteredSelection = () => {
    const filteredIds = filteredContacts.map((contact) => contact.id);
    setSelectedContactIds((prev) => {
      if (filteredIds.length === 0) return prev;
      if (allFilteredContactsSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return Array.from(next);
    });
  };

  const filteredTemplateOptionsWithSelected = useMemo(() => {
    if (filteredTemplateOptions.some((template) => template.value === selectedTemplateValue)) {
      return filteredTemplateOptions;
    }
    const selected =
      templateOptions.find((template) => template.value === selectedTemplateValue) || null;
    if (!selected) return filteredTemplateOptions;
    return [selected, ...filteredTemplateOptions];
  }, [filteredTemplateOptions, selectedTemplateValue, templateOptions]);

  const templateSourceLabel = usingCustomTemplate
    ? "Custom"
    : selectedTemplateOption?.source === "meta"
      ? "Synced"
      : "Default";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              WhatsApp Dispatch Studio
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">Send Messages</h1>
            <p className="mt-2 text-sm text-slate-600">
              Build, schedule and dispatch WhatsApp template campaigns with account-level controls.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>{" "}
              / WhatsApp Hub / Send Messages
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:max-w-[560px] sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Devices</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{accounts.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Templates</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{syncedTemplates.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Unique</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{dispatchNumbersStats.uniqueCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Duplicates</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{dispatchNumbersStats.duplicatesRemoved}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Contacts</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedContactCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mode</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {dispatchMode === "instant"
                  ? "Live"
                  : dispatchMode === "scheduled"
                    ? "Scheduled"
                    : "Recurring"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {message ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {loading ? (
            <p className="text-sm text-slate-600">Loading devices...</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Layers3 className="h-4 w-4 text-indigo-600" />
                    Campaign Setup
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    Template Source: {templateSourceLabel}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setDispatchMode("instant")}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      dispatchMode === "instant"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Layers className="h-3.5 w-3.5" />
                      Instant
                    </span>
                    <p className="mt-0.5 text-[11px]">Send now via Meta</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchMode("scheduled")}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      dispatchMode === "scheduled"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Scheduled
                    </span>
                    <p className="mt-0.5 text-[11px]">Queue for future time</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchMode("recurring")}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      dispatchMode === "recurring"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Clock3 className="h-3.5 w-3.5" />
                      Recurring
                    </span>
                    <p className="mt-0.5 text-[11px]">Automated repeat cycles</p>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Select Device *</span>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Select Device</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.phoneNumber})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Select Template *</span>
                    <select
                      value={selectedTemplateValue}
                      onChange={(e) => handleTemplateSelection(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      {filteredTemplateOptionsWithSelected.map((template) => (
                        <option key={template.value} value={template.value}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Search className="h-3.5 w-3.5" />
                      Template Search
                    </span>
                    <input
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="search name/language"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Filter className="h-3.5 w-3.5" />
                      Status
                    </span>
                    <select
                      value={templateStatusFilter}
                      onChange={(e) => setTemplateStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="all">All</option>
                      {templateStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Filter className="h-3.5 w-3.5" />
                      Category
                    </span>
                    <select
                      value={templateCategoryFilter}
                      onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="all">All</option>
                      {templateCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                    Showing {filteredTemplateOptions.length} template options from {templateOptions.length} total.
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>
                    {templatesLoading
                      ? "Syncing templates from Meta..."
                      : `Synced templates: ${syncedTemplates.length}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!accountId) return;
                      void loadSyncedTemplates(accountId);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Refresh Templates
                  </button>
                  {templatesError ? <span className="text-amber-700">{templatesError}</span> : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                {usingCustomTemplate ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Custom Template Name *</span>
                    <input
                      value={customTemplateKey}
                      onChange={(e) => setCustomTemplateKey(e.target.value)}
                      placeholder="exact_meta_template_name"
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    Selected template key:{" "}
                    <span className="font-semibold text-slate-800">{resolvedTemplateKey || "-"}</span>
                  </div>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-800">Template Language</span>
                  <input
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    placeholder="en_US"
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Hash className="h-4 w-4 text-indigo-600" />
                    Manual WhatsApp Numbers
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRemoveDuplicate}
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Remove Duplicates
                    </button>
                    <button
                      onClick={() => setNumbersText("")}
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">CSV Audience Upload</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Import recipients and map template body variables from CSV columns.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                      <Upload className="h-3.5 w-3.5" />
                      {csvLoading ? "Parsing..." : "Upload CSV"}
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleCsvImport}
                        disabled={csvLoading}
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Phone Column
                      </span>
                      <select
                        value={csvPhoneColumn}
                        onChange={(e) => setCsvPhoneColumn(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        disabled={csvColumns.length === 0}
                      >
                        {csvColumns.length === 0 ? (
                          <option value="">Upload CSV first</option>
                        ) : (
                          csvColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={handleAppendCsvToRecipients}
                      disabled={csvRecipientMap.size === 0}
                      className="self-end rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Add CSV To Recipients
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvRows([]);
                        setCsvColumns([]);
                        setCsvPhoneColumn("");
                        setCsvFileName("");
                        setCsvError(null);
                      }}
                      className="self-end rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Clear CSV
                    </button>
                  </div>

                  {csvFileName ? (
                    <p className="mt-2 text-[11px] text-slate-600">Loaded File: {csvFileName}</p>
                  ) : null}
                  {csvError ? <p className="mt-1 text-[11px] font-medium text-rose-700">{csvError}</p> : null}

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full bg-white px-2 py-1">Rows: {csvStats.rows}</span>
                    <span className="rounded-full bg-white px-2 py-1">Valid Phones: {csvStats.validPhones}</span>
                    <span className="rounded-full bg-white px-2 py-1">Unique Phones: {csvStats.uniquePhones}</span>
                    <span className="rounded-full bg-white px-2 py-1">
                      Duplicates: {csvStats.duplicatesRemoved}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1">Columns: {csvColumns.length}</span>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Template Variable Mapping</p>
                      <p className="text-[11px] text-slate-600">
                        Variables map to template body placeholders in sequence.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddTemplateVariable}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Add Variable
                      </button>
                      <button
                        type="button"
                        onClick={handleClearTemplateVariables}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Clear Mapping
                      </button>
                    </div>
                  </div>

                  {templateVariableMaps.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      No variables configured. Add mapping only if selected template expects placeholders.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {templateVariableMaps.map((mapping, index) => (
                        <div
                          key={mapping.id}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 md:grid-cols-[80px_130px_minmax(0,1fr)_90px]"
                        >
                          <div className="rounded-md bg-white px-2 py-2 text-center text-xs font-semibold text-slate-700">
                            Var {index + 1}
                          </div>
                          <select
                            value={mapping.source}
                            onChange={(e) =>
                              handleUpdateTemplateVariable(mapping.id, {
                                source: e.target.value as VariableSource,
                              })
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="csv_column">CSV Column</option>
                            <option value="fixed">Fixed Text</option>
                          </select>

                          {mapping.source === "fixed" ? (
                            <input
                              value={mapping.fixedValue}
                              onChange={(e) =>
                                handleUpdateTemplateVariable(mapping.id, {
                                  fixedValue: e.target.value,
                                })
                              }
                              placeholder="Value for all recipients"
                              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          ) : (
                            <select
                              value={mapping.csvColumn}
                              onChange={(e) =>
                                handleUpdateTemplateVariable(mapping.id, {
                                  csvColumn: e.target.value,
                                })
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                              disabled={csvColumns.length === 0}
                            >
                              {csvColumns.length === 0 ? (
                                <option value="">Upload CSV</option>
                              ) : (
                                csvColumns.map((column) => (
                                  <option key={`${mapping.id}_${column}`} value={column}>
                                    {column}
                                  </option>
                                ))
                              )}
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveTemplateVariable(mapping.id)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {templateVariableMaps.length > 0 ? (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                      <p>
                        Coverage: {dispatchPhoneList.length - templateMapCoverage.missingRecipients} /{" "}
                        {dispatchPhoneList.length} recipients ready.
                      </p>
                      {templateMapCoverage.missingRecipients > 0 ? (
                        <p className="mt-1 font-medium text-amber-700">
                          Missing values for {templateMapCoverage.missingRecipients} recipients.
                        </p>
                      ) : (
                        <p className="mt-1 font-medium text-emerald-700">All mapped values resolved.</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <textarea
                  value={numbersText}
                  onChange={(e) => setNumbersText(e.target.value)}
                  rows={7}
                  placeholder="One number per line (E.164 recommended, e.g. +919876543210). Paste CSV column directly."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">Total: {stats.inputCount}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">Unique: {stats.uniqueCount}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Duplicates: {stats.duplicatesRemoved}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">
                    Mapped Vars: {templateVariableMaps.length}
                  </span>
                  {includeContactRecipients ? (
                    <>
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">
                        Contact Numbers: {contactNumberStats.uniqueCount}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                        Dispatch Unique: {dispatchNumbersStats.uniqueCount}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Audience Builder
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIncludeContactRecipients((prev) => !prev)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        includeContactRecipients
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <PhoneCall className="mr-1 inline h-3.5 w-3.5" />
                      {includeContactRecipients ? "Contacts Included" : "Include Contacts"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContactIds([]);
                        setIncludeContactRecipients(false);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                  <label className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <Search className="h-3.5 w-3.5" />
                      Search Contacts
                    </span>
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="name / phone / tag"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      View
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSelectedContactsOnly((prev) => !prev)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                        showSelectedContactsOnly
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {showSelectedContactsOnly ? "Selected Only" : "All Contacts"}
                    </button>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFilteredSelection}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {allFilteredContactsSelected ? "Unselect Filtered" : "Select Filtered"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadContacts()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Refresh Contacts
                  </button>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    Selected: {selectedContactCount}
                  </span>
                  {contactsError ? (
                    <span className="text-[11px] font-medium text-amber-700">{contactsError}</span>
                  ) : null}
                </div>

                <div className="mt-3 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {contactsLoading ? (
                    <p className="px-3 py-4 text-xs text-slate-600">Loading contacts...</p>
                  ) : filteredContacts.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-600">No opted-in contacts found.</p>
                  ) : (
                    filteredContacts.map((contact) => {
                      const checked = selectedContactIds.includes(contact.id);
                      return (
                        <label
                          key={contact.id}
                          className={`flex cursor-pointer items-start gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0 ${
                            checked ? "bg-indigo-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContactSelection(contact.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {contact.name || contact.phone}
                            </p>
                            <p className="truncate text-[11px] text-slate-600">{contact.phone}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 md:p-5">
                <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  Dispatch mode:{" "}
                  <span className="font-semibold text-slate-800">
                    {dispatchMode === "instant"
                      ? "Instant Live Dispatch"
                      : dispatchMode === "scheduled"
                        ? "Scheduled Dispatch"
                        : "Recurring Dispatch"}
                  </span>
                </div>

                {dispatchMode !== "instant" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">
                      {dispatchMode === "scheduled" ? "Schedule Date & Time *" : "Start Date & Time"}
                    </span>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                    {dispatchMode === "scheduled" && scheduleAt && !scheduleIsFuture ? (
                      <p className="text-[11px] font-medium text-amber-700">
                        Schedule time must be in the future.
                      </p>
                    ) : null}
                  </label>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-600">
                    Instant mode sends immediately using Meta API.
                  </div>
                )}

                {dispatchMode === "recurring" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-800">Recurring Rule *</span>
                    <input
                      value={recurringRule}
                      onChange={(e) => setRecurringRule(e.target.value)}
                      placeholder="FREQ=DAILY or FREQ=WEEKLY;BYDAY=MO,WE,FR"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-600">
                    Switch to recurring mode for automated cycle-based sends.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Readiness Check</p>
                  <p>
                    {canDispatch
                      ? "All required fields are ready for dispatch."
                      : "Choose account/template and build recipient list to enable dispatch."}
                  </p>
                  {templateVariableMaps.length > 0 && templateMapCoverage.missingRecipients > 0 ? (
                    <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                      Mapping missing for {templateMapCoverage.missingRecipients} recipients.
                    </p>
                  ) : null}
                  {draftSavedAt ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Draft saved: {formatDateTime(draftSavedAt)}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !canDispatch}
                  className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Clock3 className="h-4 w-4 animate-pulse" /> : <SendHorizontal className="h-4 w-4" />}
                  {sending
                    ? "Sending..."
                    : dispatchMode === "scheduled"
                      ? "Schedule Campaign"
                      : dispatchMode === "recurring"
                        ? "Create Recurring Campaign"
                        : "Send Campaign"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[radial-gradient(circle_at_0%_0%,rgba(15,23,42,0.08),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(79,70,229,0.15),transparent_42%)] p-5">
              <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Dispatch Preview</p>
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p>Device: {selectedAccount ? `${selectedAccount.name} (${selectedAccount.phoneNumber})` : "-"}</p>
                  <p>Template: {resolvedTemplateKey || "-"} ({templateLanguage || "-"})</p>
                  <p>Dispatch Mode: {dispatchMode}</p>
                  <p>Template Vars: {templateVariableMaps.length}</p>
                  <p>Manual Unique: {stats.uniqueCount}</p>
                  <p>CSV Unique: {csvStats.uniquePhones}</p>
                  <p>Contact Unique: {contactNumberStats.uniqueCount}</p>
                  <p>Numbers to Dispatch: {dispatchNumbersStats.uniqueCount}</p>
                  <p>Schedule: {scheduleEnabled ? scheduleAt || "Pending date/time" : "No"}</p>
                  <p>Recurring: {recurringEnabled ? recurringRule : "No"}</p>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  Status:{" "}
                  <span
                    className={
                      canDispatch
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-amber-700"
                    }
                  >
                    {canDispatch ? "Ready to dispatch" : "Action required"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {result ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              <p className="font-semibold">Dispatch Result</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                <p>Input: {result.totalInput}</p>
                <p>Unique: {result.uniqueNumbers}</p>
                <p>Removed: {result.duplicatesRemoved}</p>
                <p>Queued: {result.queued}</p>
                <p>Sent: {result.sent}</p>
                <p>Failed: {result.failed}</p>
                <p>Mapped: {result.templateComponentsMappedRecipients || 0}</p>
              </div>
              <p className="mt-2">Status: {result.status}</p>
              {result.warning ? <p className="mt-1 text-amber-700">Warning: {result.warning}</p> : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">Selected Contact Recipients</p>
            <p className="mt-1 text-slate-600">
              {includeContactRecipients
                ? `${selectedContactCount} selected contacts included in dispatch.`
                : "Contact recipients are not included in this campaign."}
            </p>
            <div className="mt-2 max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
              {selectedContactIds.slice(0, 30).map((id) => {
                const contact = contacts.find((item) => item.id === id) || null;
                if (!contact) return null;
                return (
                  <div key={id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <p className="truncate text-[11px] font-semibold text-slate-800">
                      {contact.name || contact.phone}
                    </p>
                    <p className="truncate text-[11px] text-slate-600">{contact.phone}</p>
                  </div>
                );
              })}
              {selectedContactCount > 30 ? (
                <p className="text-[11px] text-slate-500">+{selectedContactCount - 30} more selected</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1 font-semibold">
                <FileWarning className="h-3.5 w-3.5" />
                Recent Failed Dispatches
              </p>
              <button
                type="button"
                onClick={() => void loadFailures()}
                className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Refresh
              </button>
            </div>
            {failuresLoading ? (
              <p className="mt-2 text-rose-700">Loading...</p>
            ) : failureEntries.length === 0 ? (
              <p className="mt-2 text-rose-700">No recent failures.</p>
            ) : (
              <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {failureEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-rose-200 bg-white p-2.5">
                    <p className="font-medium text-rose-900">
                      {entry.templateKey}
                      {entry.templateLanguage ? ` (${entry.templateLanguage})` : ""}
                    </p>
                    <p className="mt-0.5 text-rose-700">Failed: {entry.failed}</p>
                    <p className="mt-0.5 text-rose-700">Reason: {entry.reason}</p>
                    <p className="mt-0.5 text-rose-700">{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
