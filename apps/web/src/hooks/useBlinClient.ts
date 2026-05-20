import { useMemo } from "react";
import { usePublicClient, useWalletClient, useChainId } from "wagmi";
import { BlinClient } from "@blin/sdk";
import { isKnownChainId } from "@/lib/chains";

export function useBlinClient() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    // Accept both mainnet and testnet chains
    if (!publicClient || !isKnownChainId(chainId)) return null;
    const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    const moralisApiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY;
    return new BlinClient({
      chainId,
      publicClient,
      ...(walletClient ? { walletClient } : {}),
      ...(alchemyApiKey ? { alchemyApiKey } : {}),
      ...(moralisApiKey ? { moralisApiKey } : {}),
    });
  }, [chainId, publicClient, walletClient]);
}
