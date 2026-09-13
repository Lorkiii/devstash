export const VAULT_ITEM_ENTITY_TYPE = "vault-item" as const;
export const GENERIC_SECRET_ITEM_TYPE = "GENERIC_SECRET" as const;
export const GENERIC_SECRET_PAYLOAD_VERSION = 1 as const;
export const MAXIMUM_VAULT_ITEM_PLAINTEXT_BYTES = 32_768 as const;
export const MAXIMUM_VAULT_ITEM_CIPHERTEXT_BYTES =
  MAXIMUM_VAULT_ITEM_PLAINTEXT_BYTES + 16;

export const GENERIC_SECRET_LIMITS = {
  titleCodePoints: 200,
  valueCodePoints: 16_384,
  notesCodePoints: 8_192,
  tagCount: 20,
  tagCodePoints: 64,
} as const;

export interface GenericSecretInput {
  projectId: string | null;
  title: string;
  value: string;
  notes: string | null;
  tags: string[];
}

export interface VaultItemEnvelope {
  envelopeVersion: 1;
  algorithm: "AES-256-GCM";
  nonce: string;
  tagBits: 128;
  ciphertext: string;
}

export interface VaultItemCiphertext {
  id: string;
  projectId: string | null;
  itemType: typeof GENERIC_SECRET_ITEM_TYPE;
  envelope: VaultItemEnvelope;
  createdAt: string;
  updatedAt: string;
}

export interface NewVaultItemCiphertext {
  id: string;
  projectId: string | null;
  itemType: typeof GENERIC_SECRET_ITEM_TYPE;
  envelope: VaultItemEnvelope;
}

export interface ReplaceVaultItemCiphertext {
  projectId: string | null;
  itemType: typeof GENERIC_SECRET_ITEM_TYPE;
  envelope: VaultItemEnvelope;
}
