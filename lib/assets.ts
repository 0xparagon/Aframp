export type CryptoAsset = {
  code: string;
  name: string;
  icon: string;
  color: string;
};

export const STELLAR_ASSETS: CryptoAsset[] = [
  {
    code: "XLM",
    name: "Stellar Lumens",
    icon: "✦",
    color: "#7C3AED",
  },
  {
    code: "USDC",
    name: "USD Coin",
    icon: "$",
    color: "#2775CA",
  },
];
