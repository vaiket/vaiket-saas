"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Crown,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

type ProductKey = "core" | "whatsapp";
type BillingCycle = "monthly" | "yearly";

type Plan = {
  key: string;
  title: string;
  priceMonth: number;
  priceYear: number | null;
  features: string | null;
  product?: string;
};

type Subscription = {
  id: number;
  planKey: string;
  status: string;
  billingCycle: BillingCycle;
  amountPaid: number | null;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
  product?: string;
};

type RazorpayCreateOrderResponse = {
  success: boolean;
  error?: string;
  subId?: number;
  orderId?: string;
  keyId?: string;
  amountInPaise?: number;
  currency?: string;
  planTitle?: string;
  checkoutMode?: "one_time" | "trial_autopay";
  autopaySubscriptionId?: string;
  autopayStartAt?: string;
  trialDays?: number;
  recurringAmountInr?: number;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

type Props = {
  fixedProduct?: ProductKey;
  title?: string;
  subtitle?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (payload: unknown) => void) => void;
    };
  }
}

const PRODUCT_CONFIG: Record<
  ProductKey,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
  }
> = {
  core: {
    label: "Email AI & Services",
    description: "Email AI, mailbox automation, and campaign service plans.",
    icon: <Layers3 className="h-4 w-4" />,
    accent: "from-indigo-600 via-blue-600 to-cyan-500",
  },
  whatsapp: {
    label: "WhatsApp Hub",
    description: "WhatsApp messaging, inbox and automation plans.",
    icon: <MessageSquareText className="h-4 w-4" />,
    accent: "from-emerald-600 via-green-600 to-teal-500",
  },
};

let razorpayScriptPromise: Promise<boolean> | null = null;
const TRIAL_AUTOPAY_PLAN_KEY = "whatsapp_starter";
const DEFAULT_TRIAL_DAYS = 7;
const DEFAULT_RECURRING_INR = 999;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

function parseFeatures(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }
  } catch {
    // noop
  }
  return [];
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (value === "failed") return "bg-rose-100 text-rose-700 border-rose-200";
  if (value === "cancelled") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function SubscriptionWorkspace({
  fixedProduct,
  title = "Prime Value Bundles",
  subtitle = "Choose the right plan and activate instantly with Razorpay checkout.",
}: Props) {
  const [product, setProduct] = useState<ProductKey>(fixedProduct || "core");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlan, setActivePlan] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const config = PRODUCT_CONFIG[product];

  const loadData = async (targetProduct: ProductKey) => {
    try {
      setLoadingData(true);
      const qs = `?product=${encodeURIComponent(targetProduct)}`;
      const [plansRes, activeRes, historyRes] = await Promise.all([
        fetch(`/api/subscriptions/plans${qs}`, { cache: "no-store" }),
        fetch(`/api/subscriptions/active${qs}`, { cache: "no-store" }),
        fetch(`/api/subscriptions/history${qs}`, { cache: "no-store" }),
      ]);

      const plansJson = await plansRes.json();
      const activeJson = await activeRes.json();
      const historyJson = await historyRes.json();

      setPlans(Array.isArray(plansJson?.plans) ? plansJson.plans : []);
      setActivePlan(activeJson?.subscription || null);
      setHistory(Array.isArray(historyJson?.history) ? historyJson.history : []);
    } catch {
      toast.error("Failed to load subscription data");
      setPlans([]);
      setActivePlan(null);
      setHistory([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void loadData(product);
  }, [product]);

  useEffect(() => {
    void loadRazorpayScript();
  }, []);

  const markFailed = async (args: {
    subId?: number;
    orderId?: string;
    reason?: string;
    code?: string;
  }) => {
    try {
      await fetch("/api/payments/razorpay/mark-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      await loadData(product);
    } catch {
      // noop
    }
  };

  const subscribe = async (planKey: string, cycle: BillingCycle) => {
    const loadingKey = `${planKey}_${cycle}`;
    setLoading(loadingKey);

    try {
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          billingCycle: cycle,
          product,
        }),
      });

      const data = (await res.json()) as RazorpayCreateOrderResponse;
      if (!data.success) {
        toast.error(data.error || "Unable to create subscription order");
        setLoading(null);
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        toast.error("Razorpay SDK failed to load");
        await markFailed({
          subId: data.subId,
          orderId: data.orderId,
          reason: "checkout_sdk_load_failed",
        });
        setLoading(null);
        return;
      }

      if (!data.orderId || !data.keyId || !data.amountInPaise || !data.subId) {
        toast.error("Invalid checkout order response");
        await markFailed({
          subId: data.subId,
          orderId: data.orderId,
          reason: "invalid_checkout_response",
        });
        setLoading(null);
        return;
      }

      const isTrialAutopayCheckout =
        data.checkoutMode === "trial_autopay" &&
        Boolean(data.autopaySubscriptionId);

      const setupAutopayMandate = async () => {
        if (
          !isTrialAutopayCheckout ||
          !data.keyId ||
          !data.subId ||
          !data.autopaySubscriptionId ||
          !window.Razorpay
        ) {
          return true;
        }

        const recurringInr = data.recurringAmountInr ?? DEFAULT_RECURRING_INR;

        return new Promise<boolean>((resolve) => {
          let settled = false;
          const done = (value: boolean) => {
            if (settled) return;
            settled = true;
            resolve(value);
          };

          const options: Record<string, unknown> = {
            key: data.keyId,
            subscription_id: data.autopaySubscriptionId,
            name: "Vaiket Bridge",
            description: `Autopay setup - INR ${recurringInr}/month`,
            prefill: {
              name: data.customer?.name || "",
              email: data.customer?.email || "",
              contact: data.customer?.contact || "",
            },
            theme: { color: "#10b981" },
            modal: {
              ondismiss: () => {
                toast.error("Autopay setup was closed.");
                done(false);
              },
            },
            handler: async (paymentResponse: RazorpayCheckoutResponse) => {
              try {
                const verifyRes = await fetch("/api/payments/razorpay/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    subId: data.subId,
                    razorpay_subscription_id:
                      paymentResponse.razorpay_subscription_id ||
                      data.autopaySubscriptionId,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                  }),
                });
                const verifyJson = await verifyRes.json();
                if (!verifyJson?.success) {
                  toast.error(verifyJson?.error || "Autopay mandate verification failed");
                  done(false);
                  return;
                }

                done(true);
              } catch {
                toast.error("Autopay verification request failed");
                done(false);
              }
            },
          };

          const razorpay = new window.Razorpay(options);
          razorpay.on("payment.failed", (payload: unknown) => {
            const p = (payload || {}) as {
              error?: { code?: string; description?: string };
            };
            toast.error(p.error?.description || "Autopay mandate failed");
            done(false);
          });
          razorpay.open();
        });
      };

      const options: Record<string, unknown> = {
        key: data.keyId,
        amount: data.amountInPaise,
        currency: data.currency || "INR",
        name: "Vaiket Bridge",
        description: isTrialAutopayCheckout
          ? `7-day trial (INR ${data.amountInPaise / 100} refundable)`
          : data.planTitle || "Subscription",
        order_id: data.orderId,
        prefill: {
          name: data.customer?.name || "",
          email: data.customer?.email || "",
          contact: data.customer?.contact || "",
        },
        theme: { color: product === "whatsapp" ? "#10b981" : "#4f46e5" },
        modal: {
          ondismiss: async () => {
            toast("Checkout closed");
            await markFailed({
              subId: data.subId,
              orderId: data.orderId,
              reason: "checkout_closed_by_user",
            });
            setLoading(null);
          },
        },
        handler: async (paymentResponse: RazorpayCheckoutResponse) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subId: data.subId,
                razorpay_order_id: paymentResponse.razorpay_order_id || data.orderId,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                razorpay_subscription_id: data.autopaySubscriptionId,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyJson?.success) {
              toast.error(verifyJson?.error || "Payment verification failed");
              await markFailed({
                subId: data.subId,
                orderId: data.orderId,
                reason: verifyJson?.error || "verification_failed",
              });
              return;
            }

            if (isTrialAutopayCheckout) {
              toast.success("Trial activated. INR 2 will be refunded.");
              const mandateDone = await setupAutopayMandate();
              const recurringInr = data.recurringAmountInr ?? DEFAULT_RECURRING_INR;
              const trialDays = data.trialDays ?? DEFAULT_TRIAL_DAYS;

              if (mandateDone) {
                toast.success(
                  `Autopay active. INR ${recurringInr}/month will start after ${trialDays} days.`
                );
              } else {
                toast(
                  `Trial active for ${trialDays} days. Please complete mandate setup before trial ends.`
                );
              }
            } else {
              toast.success("Plan activated successfully.");
            }

            await loadData(product);
          } catch {
            toast.error("Verification request failed");
          } finally {
            setLoading(null);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", async (payload: unknown) => {
        const p = (payload || {}) as {
          error?: { code?: string; description?: string };
        };
        await markFailed({
          subId: data.subId,
          orderId: data.orderId,
          reason: p.error?.description || "payment_failed",
          code: p.error?.code || "",
        });
        toast.error(p.error?.description || "Payment failed");
        setLoading(null);
      });
      razorpay.open();
    } catch {
      toast.error("Unable to start checkout");
      setLoading(null);
    }
  };

  const plansForView = useMemo(
    () =>
      plans
        .slice()
        .sort((a, b) => (a.priceMonth || 0) - (b.priceMonth || 0))
        .slice(0, 3),
    [plans]
  );

  const recentHistory = useMemo(() => history.slice(0, 15), [history]);

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${config.accent}`} />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Payments - Instant Activation
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">{subtitle}</p>
          </div>

          <div className="flex flex-col gap-2">
            {!fixedProduct ? (
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                {(Object.keys(PRODUCT_CONFIG) as ProductKey[]).map((key) => {
                  const active = key === product;
                  const item = PRODUCT_CONFIG[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProduct(key)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {config.icon}
                {config.label}
              </div>
            )}

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    cycle === billingCycle
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {activePlan ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
            <BadgeCheck className="h-4 w-4" />
            Active Plan: {activePlan.planKey}
          </p>
            <p className="mt-1 text-xs text-emerald-700">
              Billing: {activePlan.billingCycle} - Valid till: {formatDate(activePlan.endsAt)}
            </p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plansForView.map((plan, index) => {
          const features = parseFeatures(plan.features);
          const isActive = activePlan?.planKey === plan.key;
          const monthlyAmount = plan.priceMonth || 0;
          const yearlyAmount = plan.priceYear || 0;
          const showAmount = billingCycle === "yearly" && yearlyAmount ? yearlyAmount : monthlyAmount;
          const isTrialAutopayCard =
            product === "whatsapp" &&
            plan.key === TRIAL_AUTOPAY_PLAN_KEY &&
            billingCycle === "monthly";
          const displayFeatures = isTrialAutopayCard
            ? [
                "7-day free trial access",
                "INR 2 trial authorization (auto-refunded)",
                "Autopay starts at INR 999/month after trial",
                ...(features.length ? features : []),
              ]
            : features.length
            ? features
            : ["Standard feature access"];

          return (
            <article
              key={plan.key}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition ${
                isActive
                  ? "border-emerald-300 shadow-emerald-100"
                  : index === 1
                  ? "border-indigo-300 shadow-indigo-100"
                  : "border-slate-200"
              }`}
            >
              {index === 1 ? (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <Crown className="h-3 w-3" />
                  Popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{config.description}</p>

              <div className="mt-4">
                {isTrialAutopayCard ? (
                  <>
                    <p className="text-3xl font-bold text-slate-900">7-Day Free Trial</p>
                    <p className="text-xs text-slate-500">
                      INR 2 auth (auto-refund) - then INR 999/month autopay
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900">INR {showAmount}</p>
                    <p className="text-xs text-slate-500">
                      / {billingCycle === "monthly" ? "30 days" : "365 days"} + GST extra
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => subscribe(plan.key, billingCycle)}
                disabled={Boolean(loading) || loadingData || isActive}
                className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "cursor-not-allowed border border-emerald-300 bg-emerald-100 text-emerald-700"
                    : `bg-gradient-to-r ${config.accent} text-white hover:opacity-95 disabled:opacity-60`
                }`}
              >
                {isActive
                  ? "Current Plan"
                  : loading === `${plan.key}_${billingCycle}`
                  ? "Opening Checkout..."
                  : isTrialAutopayCard
                  ? "Start 7-Day Trial"
                  : "Get Started"}
              </button>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Features</p>
                <ul className="mt-2 space-y-1.5">
                  {displayFeatures.map((feature) => (
                    <li
                      key={`${plan.key}_${feature}`}
                      className="inline-flex w-full items-start gap-2 text-xs text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CalendarClock className="h-5 w-5 text-slate-600" />
            Billing History ({config.label})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Every attempt is logged: pending, active, failed, cancelled.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Cycle</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Created</th>
                  <th className="px-2 py-2">Ends</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-sm text-slate-500">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  recentHistory.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-700">{row.planKey}</td>
                      <td className="px-2 py-2 capitalize text-slate-600">{row.billingCycle}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-700">INR {row.amountPaid ?? "-"}</td>
                      <td className="px-2 py-2 text-slate-600">{formatDate(row.createdAt)}</td>
                      <td className="px-2 py-2 text-slate-600">{formatDate(row.endsAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Plan Enablement
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              On successful payment, subscription is instantly marked <b>active</b>.
            </li>
            <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              Failed/closed payment attempts are stored with status for auditing.
            </li>
            <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              {product === "whatsapp"
                ? "WhatsApp Starter monthly supports: 7-day trial + INR 2 auto-refund + INR 999/month Razorpay autopay."
                : "Email Hub APIs check active `core_*` subscription before allowing actions."}
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
