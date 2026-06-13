export const PAYMENT_NETWORKS = ["BEP20"] as const;

export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];

export type PaymentNetworkConfig = {
  chainId: string;
  chainName: string;
  gasToken: string;
  network: PaymentNetwork;
  tokenContract: string;
  tokenDecimals: number;
  tokenSymbol: "USDT";
};

export const PAYMENT_NETWORK_CONFIGS: Record<PaymentNetwork, PaymentNetworkConfig> = {
  BEP20: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    gasToken: "BNB",
    network: "BEP20",
    tokenContract: "0x55d398326f99059ff775485246999027b3197955",
    tokenDecimals: 18,
    tokenSymbol: "USDT",
  },
};

export function getPaymentNetworkByChainId(chainId?: string | null) {
  const normalizedChainId = chainId?.trim().toLowerCase();

  if (!normalizedChainId) {
    return null;
  }

  return (
    Object.values(PAYMENT_NETWORK_CONFIGS).find(
      (config) => config.chainId.toLowerCase() === normalizedChainId,
    ) ?? null
  );
}

export function normalizeEvmAddress(address?: string | null) {
  return address?.trim().toLowerCase() ?? "";
}

export function isEvmAddress(address?: string | null) {
  return /^0x[a-fA-F0-9]{40}$/.test(address?.trim() ?? "");
}
