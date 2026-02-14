import logger from "@/lib/logger";

const STRIPE_BASE = "https://api.stripe.com/v1";

interface RevenueSummary {
  totalRevenue: number;
  currency: string;
  chargesCount: number;
  refundsTotal: number;
  netRevenue: number;
  period: { start: number; end: number };
}

interface SubscriptionSummary {
  active: number;
  pastDue: number;
  canceled: number;
  trialing: number;
  mrr: number;
  currency: string;
  plans: Array<{
    id: string;
    name: string;
    amount: number;
    interval: string;
    activeCount: number;
  }>;
}

function getAuth(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

async function stripeFetch<T>(path: string, timeoutMs = 10_000): Promise<T | null> {
  const key = getAuth();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${STRIPE_BASE}${path}`, {
      headers: { Authorization: `Basic ${btoa(`${key}:`)}` },
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn(`Stripe API error: ${res.status} ${res.statusText}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    logger.warn("Stripe API fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getRevenueSummary(
  options?: { days?: number },
): Promise<RevenueSummary | null> {
  const days = options?.days ?? 30;
  const now = Math.floor(Date.now() / 1000);
  const start = now - days * 86400;

  const params = new URLSearchParams({
    created: JSON.stringify({ gte: start }),
    limit: "100",
  });

  const [charges, refunds] = await Promise.all([
    stripeFetch<{
      data: Array<{ amount: number; currency: string; status: string }>;
    }>(`/charges?${params}`),
    stripeFetch<{
      data: Array<{ amount: number }>;
    }>(`/refunds?${params}`),
  ]);

  if (!charges) return null;

  const succeededCharges = charges.data.filter((c) => c.status === "succeeded");
  const totalRevenue = succeededCharges.reduce((sum, c) => sum + c.amount, 0);
  const refundsTotal = refunds?.data.reduce((sum, r) => sum + r.amount, 0) ?? 0;
  const currency = succeededCharges[0]?.currency ?? "usd";

  return {
    totalRevenue,
    currency,
    chargesCount: succeededCharges.length,
    refundsTotal,
    netRevenue: totalRevenue - refundsTotal,
    period: { start, end: now },
  };
}

export async function getActiveSubscriptions(): Promise<SubscriptionSummary | null> {
  const [activeSubs, pastDueSubs, canceledSubs, trialingSubs] = await Promise.all([
    stripeFetch<{ data: Array<StripeSubscription> }>("/subscriptions?status=active&limit=100"),
    stripeFetch<{ data: Array<StripeSubscription> }>("/subscriptions?status=past_due&limit=100"),
    stripeFetch<{ data: Array<StripeSubscription> }>("/subscriptions?status=canceled&limit=100"),
    stripeFetch<{ data: Array<StripeSubscription> }>("/subscriptions?status=trialing&limit=100"),
  ]);

  if (!activeSubs) return null;

  const planMap = new Map<string, {
    id: string;
    name: string;
    amount: number;
    interval: string;
    activeCount: number;
  }>();

  let mrr = 0;
  const currency = activeSubs.data[0]?.items.data[0]?.price.currency ?? "usd";

  for (const sub of activeSubs.data) {
    for (const item of sub.items.data) {
      const price = item.price;
      const monthlyAmount = price.recurring?.interval === "year"
        ? Math.round(price.unit_amount / 12)
        : price.unit_amount;

      mrr += monthlyAmount * (item.quantity ?? 1);

      const existing = planMap.get(price.id);
      if (existing) {
        existing.activeCount += 1;
      } else {
        planMap.set(price.id, {
          id: price.id,
          name: price.nickname ?? price.id,
          amount: price.unit_amount,
          interval: price.recurring?.interval ?? "month",
          activeCount: 1,
        });
      }
    }
  }

  return {
    active: activeSubs.data.length,
    pastDue: pastDueSubs?.data.length ?? 0,
    canceled: canceledSubs?.data.length ?? 0,
    trialing: trialingSubs?.data.length ?? 0,
    mrr,
    currency,
    plans: Array.from(planMap.values()),
  };
}

interface StripeSubscription {
  id: string;
  status: string;
  items: {
    data: Array<{
      price: {
        id: string;
        unit_amount: number;
        currency: string;
        nickname: string | null;
        recurring: { interval: string } | null;
      };
      quantity: number | null;
    }>;
  };
}

export type { RevenueSummary, SubscriptionSummary };
