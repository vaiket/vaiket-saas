import { ProductKey } from "@/lib/subscriptions/products";

export type SubscriptionCatalogPlan = {
  key: string;
  title: string;
  priceMonth: number;
  priceYear: number;
  features: string[];
  product: ProductKey;
};

export const SUBSCRIPTION_CATALOG: SubscriptionCatalogPlan[] = [
  {
    key: "core_starter",
    title: "Core Starter",
    priceMonth: 999,
    priceYear: 9999,
    features: ["Email automation basics", "Core dashboard", "Basic team usage"],
    product: "core",
  },
  {
    key: "core_growth",
    title: "Core Growth",
    priceMonth: 2999,
    priceYear: 29999,
    features: ["Everything in Core Starter", "Priority support", "Advanced automation"],
    product: "core",
  },
  {
    key: "core_business",
    title: "Core Business",
    priceMonth: 4999,
    priceYear: 49999,
    features: ["Everything in Core Growth", "Higher limits", "Advanced controls"],
    product: "core",
  },
  {
    key: "whatsapp_starter",
    title: "WhatsApp Starter",
    priceMonth: 1499,
    priceYear: 14999,
    features: ["1 WhatsApp number", "Inbox + contacts", "Basic template sending"],
    product: "whatsapp",
  },
  {
    key: "whatsapp_growth",
    title: "WhatsApp Growth",
    priceMonth: 3499,
    priceYear: 34999,
    features: ["Everything in WhatsApp Starter", "Bulk campaigns", "Workflow automation"],
    product: "whatsapp",
  },
  {
    key: "whatsapp_scale",
    title: "WhatsApp Scale",
    priceMonth: 6999,
    priceYear: 69999,
    features: ["Everything in WhatsApp Growth", "Higher throughput", "Premium support"],
    product: "whatsapp",
  },
];

export function getCatalogPlan(planKey: string | null | undefined) {
  const key = String(planKey ?? "").trim().toLowerCase();
  return SUBSCRIPTION_CATALOG.find((item) => item.key === key) ?? null;
}

export function getCatalogPlans(product: ProductKey | "all" = "all") {
  if (product === "all") return SUBSCRIPTION_CATALOG;
  return SUBSCRIPTION_CATALOG.filter((item) => item.product === product);
}
