import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TxEntry {
  id:         string;
  type:       "send" | "receive";
  title:      string;
  date:       string;
  amount:     string;
  usdValue:   string;
  isPositive: boolean;
  hash:       string;
  asset:      string;
  network:    string;
  timestamp:  number;
}

// ─── Explorer API helpers ─────────────────────────────────────────────────────

const EXPLORERS: Record<string, { txlist: string; tokentx: string }> = {
  "ethereum": {
    txlist:  "https://api.etherscan.io/api?module=account&action=txlist",
    tokentx: "https://api.etherscan.io/api?module=account&action=tokentx",
  },
  "bsc": {
    txlist:  "https://api.bscscan.com/api?module=account&action=txlist",
    tokentx: "https://api.bscscan.com/api?module=account&action=tokentx",
  },
};

const NATIVE_SYMBOL: Record<string, string> = { ethereum: "ETH", bsc: "BNB" };

interface ExplorerTx {
  hash:             string;
  from:             string;
  to:               string;
  value:            string;
  timeStamp:        string;
  isError:          string;
  tokenSymbol?:     string;
  tokenDecimal?:    string;
  contractAddress?: string;
  input?:           string;
}

function formatDate(unixTs: number): string {
  const date    = new Date(unixTs * 1000);
  const now     = new Date();
  const today   = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const txDay   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const diffDays = Math.round((today.getTime() - txDay.getTime()) / 86_400_000);
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + `, ${timeStr}`;
}

async function fetchExplorerTxs(
  chain:   string,
  address: string,
  action:  "txlist" | "tokentx",
  offset = 20,
): Promise<ExplorerTx[]> {
  const base = EXPLORERS[chain]?.[action];
  if (!base) return [];

  try {
    const url = `${base}&address=${address}&sort=desc&page=1&offset=${offset}`;
    const res  = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== "1" || !Array.isArray(json.result)) return [];
    return json.result as ExplorerTx[];
  } catch {
    return [];
  }
}

function mapNativeTx(tx: ExplorerTx, chain: string, address: string): TxEntry | null {
  // Skip failed txs and contract calls with 0 value
  if (tx.isError === "1") return null;
  const weiValue  = BigInt(tx.value ?? "0");
  if (weiValue === 0n && tx.input && tx.input !== "0x") return null;

  const symbol    = NATIVE_SYMBOL[chain] ?? "ETH";
  const decimals  = 18;
  const amount    = Number(weiValue) / 10 ** decimals;
  const isSend    = tx.from.toLowerCase() === address.toLowerCase();
  const ts        = parseInt(tx.timeStamp, 10);

  return {
    id:         `${chain}:${tx.hash}`,
    type:       isSend ? "send" : "receive",
    title:      isSend ? `Sent ${symbol}` : `Received ${symbol}`,
    date:       formatDate(ts),
    amount:     `${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`,
    usdValue:   "$0.00",
    isPositive: !isSend,
    hash:       tx.hash,
    asset:      symbol,
    network:    chain,
    timestamp:  ts,
  };
}

function mapTokenTx(tx: ExplorerTx, chain: string, address: string): TxEntry | null {
  const symbol    = tx.tokenSymbol ?? "TOKEN";
  const decimals  = parseInt(tx.tokenDecimal ?? "18", 10);
  const rawValue  = BigInt(tx.value ?? "0");
  const amount    = Number(rawValue) / 10 ** decimals;
  const isSend    = tx.from.toLowerCase() === address.toLowerCase();
  const ts        = parseInt(tx.timeStamp, 10);

  return {
    id:         `${chain}:token:${tx.hash}:${tx.contractAddress}`,
    type:       isSend ? "send" : "receive",
    title:      isSend ? `Sent ${symbol}` : `Received ${symbol}`,
    date:       formatDate(ts),
    amount:     `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`,
    usdValue:   "$0.00",
    isPositive: !isSend,
    hash:       tx.hash,
    asset:      symbol,
    network:    chain,
    timestamp:  ts,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const chains = ["ethereum", "bsc"];

  // Fetch native + token txs for all chains simultaneously.
  const allResults = await Promise.all(
    chains.flatMap((chain) => [
      fetchExplorerTxs(chain, address, "txlist",  20),
      fetchExplorerTxs(chain, address, "tokentx", 20),
    ]),
  );

  const entries: TxEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < chains.length; i++) {
    const chain    = chains[i]!;
    const nativeTxs = allResults[i * 2]!;
    const tokenTxs  = allResults[i * 2 + 1]!;

    for (const tx of nativeTxs) {
      const entry = mapNativeTx(tx, chain, address);
      if (entry && !seen.has(entry.id)) { seen.add(entry.id); entries.push(entry); }
    }
    for (const tx of tokenTxs) {
      const entry = mapTokenTx(tx, chain, address);
      if (entry && !seen.has(entry.id)) { seen.add(entry.id); entries.push(entry); }
    }
  }

  // Sort newest-first
  entries.sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json(
    { transactions: entries.slice(0, 30) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
