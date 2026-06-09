import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { keccak256 } from "ethereum-cryptography/keccak";
import { bytesToHex, utf8ToBytes } from "ethereum-cryptography/utils";
import {
  PAYMENT_NETWORK_CONFIGS,
  type PaymentNetwork,
} from "../modules/payments/constants/payment-networks";

dotenv.config();

type Args = {
  amount?: string;
  api?: string;
  from?: string;
  network?: PaymentNetwork;
  secret?: string;
  to?: string;
  txHash?: string;
};

function readArgs() {
  return process.argv.slice(2).reduce<Args>((accumulator, item) => {
    const [rawKey, ...valueParts] = item.replace(/^--/, "").split("=");
    const value = valueParts.join("=");

    if (!rawKey || !value) {
      return accumulator;
    }

    return {
      ...accumulator,
      [rawKey]: value,
    };
  }, {});
}

function decimalToTokenUnits(value: string, decimals: number) {
  const normalized = value.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("amount must be a positive decimal number.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const paddedFraction = `${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals);
  const wholeUnits = BigInt(wholePart || "0") * BigInt(10) ** BigInt(decimals);
  const fractionUnits = BigInt(paddedFraction || "0");

  return (wholeUnits + fractionUnits).toString();
}

function requireValue(value: string | undefined, name: string) {
  if (!value?.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

function createTxHash() {
  return `0x${randomBytes(32).toString("hex")}`;
}

async function main() {
  const args = readArgs();
  const network = args.network ?? "BEP20";
  const networkConfig = PAYMENT_NETWORK_CONFIGS[network];

  if (!networkConfig) {
    throw new Error("network must be BEP20 or Arbitrum.");
  }

  const secret = requireValue(
    args.secret ?? process.env.MORALIS_STREAM_WEBHOOK_SECRET,
    "MORALIS_STREAM_WEBHOOK_SECRET",
  );
  const apiBase = (args.api ?? process.env.API_BASE_URL ?? "http://localhost:5000/api/v1").replace(
    /\/$/,
    "",
  );
  const amount = requireValue(args.amount, "amount");
  const to = requireValue(args.to, "to");
  const from = args.from?.trim() || "0x2222222222222222222222222222222222222222";
  const txHash = args.txHash?.trim() || createTxHash();
  const body = {
    confirmed: true,
    chainId: networkConfig.chainId,
    streamId: "local-test-stream",
    tag: "local-payment-test",
    erc20Transfers: [
      {
        transactionHash: txHash,
        logIndex: "0",
        contract: networkConfig.tokenContract,
        from,
        to,
        value: decimalToTokenUnits(amount, networkConfig.tokenDecimals),
        tokenDecimals: String(networkConfig.tokenDecimals),
        valueWithDecimals: amount,
      },
    ],
  };
  const payload = JSON.stringify(body);
  const signature = `0x${bytesToHex(keccak256(utf8ToBytes(`${payload}${secret}`)))}`;
  const response = await fetch(`${apiBase}/payments/webhooks/moralis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
    },
    body: payload,
  });
  const responseBody = await response.text();

  console.log(`POST ${apiBase}/payments/webhooks/moralis`);
  console.log(`network=${network}`);
  console.log(`amount=${amount}`);
  console.log(`to=${to}`);
  console.log(`txHash=${txHash}`);
  console.log(`status=${response.status}`);
  console.log(responseBody);

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
