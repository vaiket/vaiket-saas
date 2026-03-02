export type ProductKey = "core" | "whatsapp";

const PRODUCT_SET: ProductKey[] = ["core", "whatsapp"];

export function isProductKey(value: string | null | undefined): value is ProductKey {
  if (!value) return false;
  return PRODUCT_SET.includes(value as ProductKey);
}

export function normalizeProduct(value: string | null | undefined): ProductKey {
  if (isProductKey(value)) return value;
  return "core";
}

export function getPlanProduct(planKey: string | null | undefined): ProductKey | "unknown" {
  const key = String(planKey ?? "").trim().toLowerCase();
  if (!key) return "unknown";

  const [prefix] = key.split("_");
  if (prefix === "core") return "core";
  if (prefix === "whatsapp") return "whatsapp";
  return "unknown";
}

export function planMatchesProduct(planKey: string, product: ProductKey) {
  return getPlanProduct(planKey) === product;
}

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  core: "Email AI & Services",
  whatsapp: "WhatsApp Hub",
};
