import { ethers } from "ethers";
import { logger } from "../../../config/logger";
import { env } from "../../../config/env";
import { PAYMENT_NETWORK_CONFIGS } from "../../payments/constants/payment-networks";

const USDT_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
];

export class BlockchainService {
  async sendBscUsdt(toAddress: string, amountUsdt: number): Promise<string | null> {
    const privateKey = env.WITHDRAWAL_ADMIN_PRIVATE_KEY?.trim() || null;

    if (!privateKey) {
      logger.warn(
        "WITHDRAWAL_ADMIN_PRIVATE_KEY is not set in environment. Skipping automatic on-chain withdrawal.",
      );
      return null;
    }

    try {
      const rpcUrl = env.BSC_PRIMARY_RPC_URL || "https://bsc-dataseed.binance.org/";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      // Dynamically fetch USDT contract address and decimals from network configuration
      const tokenContractAddress = PAYMENT_NETWORK_CONFIGS.BEP20.tokenContract;
      const decimals = PAYMENT_NETWORK_CONFIGS.BEP20.tokenDecimals;

      logger.info(
        `[Auto-Withdrawal] Initiating transfer of ${amountUsdt} USDT (BEP20) to destination: ${toAddress}...`,
      );

      const usdtContract = new ethers.Contract(tokenContractAddress, USDT_ABI, wallet);

      // Format number to maximum decimal places to avoid floating point issues during parseUnits
      const formattedAmount = Number(amountUsdt.toFixed(decimals));
      const amountWei = ethers.parseUnits(formattedAmount.toString(), decimals);

      // Execute on-chain transfer
      const tx = await usdtContract.transfer(toAddress, amountWei);
      logger.info(
        `[Auto-Withdrawal] Transaction submitted to BSC. TxHash: ${tx.hash}. Waiting for confirmation...`,
      );

      const receipt = await tx.wait(1);
      if (receipt && receipt.status === 1) {
        logger.info(`[Auto-Withdrawal] Transaction confirmed on-chain. TxHash: ${tx.hash}`);
        return tx.hash;
      } else {
        logger.error(
          `[Auto-Withdrawal] Transaction failed on-chain (receipt status: 0). TxHash: ${tx.hash}`,
        );
        return null;
      }
    } catch (err) {
      logger.error(
        `[Auto-Withdrawal] On-chain transfer failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;
