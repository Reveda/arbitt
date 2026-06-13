import dotenv from "dotenv";
import {
  PAYMENT_NETWORK_CONFIGS,
  type PaymentNetwork,
} from "../modules/payments/constants/payment-networks";

dotenv.config();

const NETWORK_RPC_ENDPOINTS: Record<PaymentNetwork, string[]> = {
  BEP20: [
    process.env.BSC_PRIMARY_RPC_URL || "https://bsc-dataseed.binance.org/",
    process.env.BSC_BACKUP_RPC_URL || "https://bsc.publicnode.com",
  ],
};

async function fetchRpc(url: string, method: string, params: any[]): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status: ${response.status}`);
  }

  const json = (await response.json()) as any;
  if (json.error) {
    throw new Error(`RPC returned error: ${JSON.stringify(json.error)}`);
  }

  return json.result;
}

async function callRpcWithFallback(
  network: PaymentNetwork,
  method: string,
  params: any[],
): Promise<any> {
  const endpoints = NETWORK_RPC_ENDPOINTS[network];
  let lastError: any = null;

  for (const url of endpoints) {
    try {
      console.log(`Trying RPC endpoint: ${url}`);
      return await fetchRpc(url, method, params);
    } catch (error) {
      console.warn(`Endpoint ${url} failed:`, error instanceof Error ? error.message : error);
      lastError = error;
    }
  }

  throw lastError || new Error(`All RPC endpoints for network ${network} failed.`);
}

function decodeAddress(topic: string): string {
  if (!topic || topic.length < 66) return "invalid";
  return "0x" + topic.slice(-40).toLowerCase();
}

function readArgs() {
  return process.argv.slice(2).reduce<Record<string, string>>((accumulator, item) => {
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

async function main() {
  const args = readArgs();
  const txnHash = args.hash?.trim();
  const network = (args.network?.trim() || "BEP20") as PaymentNetwork;

  if (!txnHash) {
    console.error(
      "Error: --hash parameter is required. E.g., npx tsx src/scripts/verifyTxHash.ts --hash=0x...",
    );
    process.exit(1);
  }

  const networkConfig = PAYMENT_NETWORK_CONFIGS[network];
  if (!networkConfig) {
    console.error(`Error: Unsupported network '${network}'. Supported: BEP20`);
    process.exit(1);
  }

  console.log(
    `Verifying transaction ${txnHash} on network ${network} (${networkConfig.chainName})`,
  );

  try {
    const receipt = await callRpcWithFallback(network, "eth_getTransactionReceipt", [txnHash]);
    if (!receipt) {
      console.log("Result: Transaction receipt not found on-chain (yet).");
      return;
    }

    console.log("Transaction Receipt Status:", receipt.status);
    const isSuccess =
      receipt.status === "0x1" ||
      receipt.status === 1 ||
      receipt.status === "1" ||
      receipt.status === true;
    console.log("Status is successful:", isSuccess);

    const logs = receipt.logs || [];
    console.log(`Found ${logs.length} logs in transaction.`);

    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const topics = log.topics || [];
      console.log(`\nLog #${i}:`);
      console.log(`  Contract address: ${log.address}`);

      if (topics[0]?.toLowerCase() === transferTopic) {
        console.log("  Detected Transfer Event (ERC20):");
        if (topics.length >= 3) {
          const from = decodeAddress(topics[1]);
          const to = decodeAddress(topics[2]);
          let valueUnits = "0";
          try {
            const dataHex = log.data || "0x";
            valueUnits = BigInt(dataHex.startsWith("0x") ? dataHex : `0x${dataHex}`).toString();
          } catch (e) {
            console.error("  Error parsing data:", e);
          }

          console.log(`    From:     ${from}`);
          console.log(`    To:       ${to}`);
          console.log(`    Amount:   ${valueUnits} (raw units)`);

          const decimals =
            log.address.toLowerCase() === networkConfig.tokenContract.toLowerCase()
              ? networkConfig.tokenDecimals
              : 18;
          const valueUsdt = Number(valueUnits) / Math.pow(10, decimals);
          console.log(`    Value:    ${valueUsdt} USDT (assuming ${decimals} decimals)`);
        } else {
          console.log("    Invalid Transfer log structure: topics length < 3");
        }
      } else {
        console.log(`  Topic[0]: ${topics[0] || "none"}`);
      }
    }
  } catch (err: any) {
    console.error("Verification script execution failed:", err.message);
  }
}

main();
