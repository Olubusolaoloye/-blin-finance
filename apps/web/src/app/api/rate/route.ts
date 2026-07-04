import { NextResponse } from "next/server";

// ── Binance P2P ────────────────────────────────────────────────────────────────
// tradeType "SELL" = merchant sells USDT → user pays NGN  (onramp rate)
// tradeType "BUY"  = merchant buys USDT  → user gets NGN  (offramp rate)

const P2P_URL = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

async function fetchBinanceP2P(tradeType: "BUY" | "SELL"): Promise<number> {
  const res = await fetch(P2P_URL, {
    method: "POST",
    headers: {
      "Content-Type":   "application/json",
      "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept":         "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin":         "https://p2p.binance.com",
      "Referer":        "https://p2p.binance.com/en/trade/sell/USDT?fiat=NGN",
    },
    body: JSON.stringify({
      fiat:                       "NGN",
      page:                       1,
      rows:                       5,
      tradeType,
      asset:                      "USDT",
      countries:                  [],
      proMerchantAds:             false,
      shieldMerchantAds:          false,
      filterType:                 "all",
      periods:                    [],
      additionalKycVerifyFilter:  0,
      publisherType:              null,
      payTypes:                   [],
      classifies:                 ["mass", "profession"],
    }),
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Binance P2P ${tradeType}: HTTP ${res.status}`);

  const json = await res.json();
  const prices: number[] = (json.data ?? []).map(
    (ad: { adv: { price: string } }) => parseFloat(ad.adv.price),
  );
  if (prices.length === 0) throw new Error(`No ${tradeType} ads returned`);

  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

// ── CoinGecko fallback (spot USDT/NGN — very close to P2P mid-rate) ────────────
async function fetchCoinGeckoRate(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`CoinGecko: HTTP ${res.status}`);
  const json = await res.json();
  const rate = json?.tether?.ngn;
  if (!rate) throw new Error("CoinGecko: missing tether.ngn field");
  return Math.round(rate);
}

// ── Spread ─────────────────────────────────────────────────────────────────────
// 1% is added to the onramp rate and subtracted from the offramp rate.
// This is Blin Finance's hidden margin on top of raw P2P rates.
function applySpread(rawBuyRate: number, rawSellRate: number) {
  return {
    buyRate:  Math.round(rawBuyRate  * 0.99), // offramp: user gets 1% less NGN
    sellRate: Math.round(rawSellRate * 1.01), // onramp:  user pays 1% more NGN
  };
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function GET() {
  // Try Binance P2P first (most accurate for Nigerian users)
  try {
    const [rawBuy, rawSell] = await Promise.all([
      fetchBinanceP2P("BUY"),
      fetchBinanceP2P("SELL"),
    ]);
    const { buyRate, sellRate } = applySpread(rawBuy, rawSell);

    return NextResponse.json(
      {
        buyRate,
        sellRate,
        midRate:   Math.round((buyRate + sellRate) / 2),
        source:    "binance-p2p",
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (binanceErr) {
    console.warn("[/api/rate] Binance P2P failed, trying CoinGecko:", binanceErr);
  }

  // CoinGecko fallback — returns a single mid rate; we apply ±1.5% spread + 1% Blin margin
  try {
    const mid     = await fetchCoinGeckoRate();
    const rawBuy  = Math.round(mid * 0.985); // ~1.5% below mid (offramp base)
    const rawSell = Math.round(mid * 1.015); // ~1.5% above mid (onramp base)
    const { buyRate, sellRate } = applySpread(rawBuy, rawSell);

    return NextResponse.json(
      {
        buyRate,
        sellRate,
        midRate:   mid,
        source:    "coingecko",
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (geckoErr) {
    console.error("[/api/rate] CoinGecko also failed:", geckoErr);
  }

  // Last-resort hardcoded fallback — UI never breaks
  const { buyRate, sellRate } = applySpread(1_620, 1_650);
  return NextResponse.json(
    {
      buyRate,
      sellRate,
      midRate:   Math.round((buyRate + sellRate) / 2),
      source:    "fallback",
      fetchedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
