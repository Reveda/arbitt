import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { HTTP_STATUS } from "../../../constants/http";
import { env } from "../../../config/env";
import { ApiError } from "../../../utils/ApiError";
import { PlatformSettingModel } from "../models/platform-setting.model";

const PAYMENT_WALLET_SETTING_KEY = "payment_wallet";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

type StoredPaymentWallet = {
  address?: string;
  addressEncrypted?: {
    algorithm: typeof ENCRYPTION_ALGORITHM;
    authTag: string;
    ciphertext: string;
    iv: string;
    version: 1;
  };
  addressFingerprint?: string;
  network?: string;
  updatedBy?: string | null;
  deletedAt?: string;
  deletedBy?: string;
  isDeleted?: boolean;
};

export type PlatformPaymentWallet = {
  address: string;
  network: string;
  configured: boolean;
  updatedAt: Date | string | null;
  updatedBy: string | null;
};

function normalizeAddress(address?: string) {
  return address?.trim() ?? "";
}

function getEncryptionSecret() {
  return env.PAYMENT_WALLET_ENCRYPTION_KEY ?? env.JWT_ACCESS_SECRET;
}

function getEncryptionKey() {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

function encryptAddress(address: string): StoredPaymentWallet["addressEncrypted"] {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(address, "utf8"), cipher.final()]);

  return {
    algorithm: ENCRYPTION_ALGORITHM,
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    version: 1,
  };
}

function decryptAddress(value: StoredPaymentWallet["addressEncrypted"]) {
  if (!value) {
    return "";
  }

  try {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Admin payment wallet could not be decrypted. Check encryption key.",
    );
  }
}

function fingerprintAddress(address: string) {
  return createHmac("sha256", getEncryptionKey()).update(address).digest("hex");
}

function buildStoredWallet(input: { address: string; network: string; updatedBy?: string | null }) {
  const address = normalizeAddress(input.address);

  return {
    addressEncrypted: encryptAddress(address),
    addressFingerprint: fingerprintAddress(address),
    network: input.network,
    updatedBy: input.updatedBy ?? null,
  };
}

function getStoredAddress(value?: StoredPaymentWallet) {
  if (!value) {
    return "";
  }

  if (value.addressEncrypted) {
    return normalizeAddress(decryptAddress(value.addressEncrypted));
  }

  return normalizeAddress(value.address);
}

function isConfiguredAddress(address?: string) {
  const normalizedAddress = normalizeAddress(address);
  return Boolean(normalizedAddress) && !normalizedAddress.toUpperCase().startsWith("DEV-");
}

function getPaymentWalletSettingKey(network: string) {
  return `${PAYMENT_WALLET_SETTING_KEY}:${network}`;
}

function toPaymentWallet(
  value: StoredPaymentWallet | undefined,
  updatedAt?: Date | string | null,
  fallbackNetwork = "BEP20",
) {
  const address = getStoredAddress(value);

  return {
    address,
    network: value?.network ?? fallbackNetwork,
    configured: isConfiguredAddress(address),
    updatedAt: updatedAt ?? null,
    updatedBy: value?.updatedBy ?? null,
  };
}

async function migrateLegacyPlainAddress(setting: {
  _id: unknown;
  updatedAt?: Date | string | null;
  value?: unknown;
}) {
  const value = setting.value as StoredPaymentWallet | undefined;

  if (!value?.address || value.addressEncrypted) {
    return value;
  }

  const encryptedValue = buildStoredWallet({
    address: value.address,
    network: value.network ?? "BEP20",
    updatedBy: value.updatedBy ?? null,
  });

  await PlatformSettingModel.updateOne(
    { _id: setting._id },
    {
      $set: { value: encryptedValue },
    },
  );

  return encryptedValue;
}

async function archiveCurrentWallet(input: {
  current: {
    _id: unknown;
    value?: unknown;
  };
  deletedAt: Date;
  deletedBy: string;
}) {
  const currentValue = input.current.value as StoredPaymentWallet | undefined;
  const currentAddress = getStoredAddress(currentValue);
  const encryptedArchiveValue = currentAddress
    ? buildStoredWallet({
        address: currentAddress,
        network: currentValue?.network ?? "BEP20",
        updatedBy: currentValue?.updatedBy ?? null,
      })
    : {
        network: currentValue?.network ?? "BEP20",
        updatedBy: currentValue?.updatedBy ?? null,
      };

  await PlatformSettingModel.updateOne(
    { _id: input.current._id },
    {
      $set: {
        deletedAt: input.deletedAt,
        deletedBy: input.deletedBy,
        key: `${PAYMENT_WALLET_SETTING_KEY}:deleted:${String(input.current._id)}:${input.deletedAt.getTime()}`,
        value: {
          ...encryptedArchiveValue,
          deletedAt: input.deletedAt.toISOString(),
          deletedBy: input.deletedBy,
          isDeleted: true,
        },
      },
    },
  );
}

export async function getPlatformPaymentWallet(): Promise<PlatformPaymentWallet> {
  const bep20Wallet = await getPlatformPaymentWalletForNetwork("BEP20");

  if (bep20Wallet.configured) {
    return bep20Wallet;
  }

  const arbitrumWallet = await getPlatformPaymentWalletForNetwork("Arbitrum");

  if (arbitrumWallet.configured) {
    return arbitrumWallet;
  }

  return bep20Wallet;
}

export async function getPlatformPaymentWalletForNetwork(
  network: string,
): Promise<PlatformPaymentWallet> {
  const networkSetting = await PlatformSettingModel.findOne({
    deletedAt: null,
    key: getPaymentWalletSettingKey(network),
  }).lean();

  if (networkSetting) {
    const value = await migrateLegacyPlainAddress(networkSetting);
    return toPaymentWallet(value, networkSetting.updatedAt, network);
  }

  const setting = await PlatformSettingModel.findOne({
    deletedAt: null,
    key: PAYMENT_WALLET_SETTING_KEY,
  }).lean();
  const value = setting ? await migrateLegacyPlainAddress(setting) : undefined;

  if ((value?.network ?? "BEP20") === network) {
    return toPaymentWallet(value, setting?.updatedAt, network);
  }

  return toPaymentWallet(undefined, null, network);
}

export async function updatePlatformPaymentWallet(input: {
  address: string;
  network: string;
  updatedBy: string;
}): Promise<PlatformPaymentWallet> {
  const now = new Date();
  const current = await PlatformSettingModel.findOne({
    deletedAt: null,
    key: getPaymentWalletSettingKey(input.network),
  }).lean();
  const nextValue = buildStoredWallet({
    address: input.address,
    network: input.network,
    updatedBy: input.updatedBy,
  });

  if (current) {
    await archiveCurrentWallet({
      current,
      deletedAt: now,
      deletedBy: input.updatedBy,
    });
  }

  const setting = await PlatformSettingModel.create({
    key: getPaymentWalletSettingKey(input.network),
    value: nextValue,
  });

  return toPaymentWallet(setting.value as StoredPaymentWallet, setting.updatedAt);
}
