export const mockUser = {
  firstName:     "Amara",
  lastName:      "Okonkwo",
  email:         "amara.okonkwo@gmail.com",
  walletAddress: "0x71C...976F",
  joined:        "February 2026",
  flowScore:     780,
  flowTier:      "Gold",
  kycStatus:     "unverified" as "unverified" | "pending" | "verified",
};

export const mockBalances = {
  totalUsd:     12450.80,
  totalNgn:     19672000,
  dayChangeUsd: 145.20,
  dayChangePct: 1.18,
  tokens: [
    { symbol: "USDT", name: "Tether",        balance: 4500.00, usdValue: 4500.00 },
    { symbol: "USDC", name: "USD Coin",       balance: 2100.00, usdValue: 2100.00 },
    { symbol: "ETH",  name: "Ethereum",       balance: 1.24,    usdValue: 3520.40 },
    { symbol: "BNB",  name: "Binance Coin",   balance: 3.5,     usdValue: 2010.50 },
    { symbol: "WBTC", name: "Wrapped BTC",    balance: 0.005,   usdValue: 319.90  },
  ],
};

export const mockVault = {
  enabled:       true,
  balanceUsd:    1250.00,
  yieldEarnedUsd: 45.20,
  apy:           4.2,
  unlockDate:    "2026-04-15",
  daysRemaining: 47,
  savePercent:   10,
};

export const mockLocks = [
  { id: 1, name: "School Fees", token: "USDT", amount: 500,  target: 1000, yieldEarned: 12.40, daysRemaining: 120, status: "Locked" },
  { id: 2, name: "Owambe Fund", token: "USDC", amount: 200,  target: 200,  yieldEarned: 5.10,  daysRemaining: 0,   status: "Ready"  },
  { id: 3, name: "Emergency",   token: "USDT", amount: 1500, target: null, yieldEarned: 42.80, daysRemaining: 300, status: "Locked" },
];

export const mockTransactions = [
  { id: 1, type: "swap",    title: "Swap USDT to ETH",   date: "Today, 10:42 AM",     amount: "0.15 ETH",    usdValue: "$425.00",    isPositive: true  },
  { id: 2, type: "save",    title: "AutoSave Deposit",   date: "Today, 10:42 AM",     amount: "42.50 USDT",  usdValue: "$42.50",     isPositive: true  },
  { id: 3, type: "receive", title: "Received NGN",        date: "Yesterday, 2:15 PM", amount: "₦50,000",     usdValue: "$31.64",     isPositive: true  },
  { id: 4, type: "stock",   title: "Bought AAPL",         date: "Mar 14, 9:30 AM",    amount: "2 Shares",    usdValue: "$364.80",    isPositive: false },
  { id: 5, type: "send",    title: "Sent USDT",           date: "Mar 12, 4:20 PM",    amount: "100.00 USDT", usdValue: "$100.00",    isPositive: false },
  { id: 6, type: "sell",    title: "Sold BTC",            date: "Feb 28, 1:15 PM",    amount: "0.05 BTC",    usdValue: "$3,200.00",  isPositive: true, costBasis: 2100, capitalGain: 1100 },
  { id: 7, type: "sell",    title: "Sold ETH",            date: "Jan 15, 11:30 AM",   amount: "1.5 ETH",     usdValue: "$4,500.00",  isPositive: true, costBasis: 3000, capitalGain: 1500 },
];

export const mockStocks = {
  totalUsd:      2450.00,
  dayChangeUsd:  32.40,
  dayChangePct:  1.3,
  holdings: [
    { symbol: "AAPL", name: "Apple Inc.",      price: 182.40, changePct: 2.1,  shares: 5 },
    { symbol: "MSFT", name: "Microsoft Corp.", price: 410.20, changePct: -0.5, shares: 2 },
    { symbol: "TSLA", name: "Tesla Inc.",      price: 175.50, changePct: 4.2,  shares: 4 },
  ],
};
