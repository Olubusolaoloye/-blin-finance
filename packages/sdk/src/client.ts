import type { PublicClient, WalletClient } from "viem";
import type { BlinClientConfig } from "./types";

export class BlinClient {
  readonly chainId: number;
  readonly publicClient: PublicClient;
  readonly walletClient: WalletClient | undefined;
  readonly alchemyApiKey: string | undefined;
  readonly moralisApiKey: string | undefined;

  constructor(config: BlinClientConfig) {
    this.chainId = config.chainId;
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
    this.alchemyApiKey = config.alchemyApiKey;
    this.moralisApiKey = config.moralisApiKey;
  }

  withWallet(walletClient: WalletClient): BlinClient {
    return new BlinClient({
      chainId: this.chainId,
      publicClient: this.publicClient,
      walletClient,
      ...(this.alchemyApiKey !== undefined && { alchemyApiKey: this.alchemyApiKey }),
      ...(this.moralisApiKey !== undefined && { moralisApiKey: this.moralisApiKey }),
    });
  }
}
