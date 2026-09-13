-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "envelopeVersion" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tagBits" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_phase7_contract" CHECK (
        "envelopeVersion" = 1 AND
        "algorithm" = 'AES-256-GCM' AND
        octet_length("nonce") = 12 AND
        "tagBits" = 128 AND
        octet_length("ciphertext") BETWEEN 16 AND 16400
    )
);

-- AlterTable
ALTER TABLE "VaultItem" ADD COLUMN "projectId" UUID;

-- CreateTable
CREATE TABLE "EnvBundle" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "envelopeVersion" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tagBits" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvBundle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EnvBundle_phase7_contract" CHECK (
        "envelopeVersion" = 1 AND
        "algorithm" = 'AES-256-GCM' AND
        octet_length("nonce") = 12 AND
        "tagBits" = 128 AND
        octet_length("ciphertext") BETWEEN 16 AND 131088
    )
);

-- CreateTable
CREATE TABLE "Note" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" UUID,
    "envelopeVersion" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tagBits" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Note_phase7_contract" CHECK (
        "envelopeVersion" = 1 AND
        "algorithm" = 'AES-256-GCM' AND
        octet_length("nonce") = 12 AND
        "tagBits" = 128 AND
        octet_length("ciphertext") BETWEEN 16 AND 131088
    )
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" UUID,
    "builtInCategory" TEXT,
    "customCategoryId" UUID,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "envelopeVersion" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tagBits" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Task_phase7_contract" CHECK (
        "sortOrder" BETWEEN 0 AND 1000000 AND
        NOT ("builtInCategory" IS NOT NULL AND "customCategoryId" IS NOT NULL) AND
        ("builtInCategory" IS NULL OR "builtInCategory" IN ('WORK', 'LIFESTYLE', 'SPORTS')) AND
        "envelopeVersion" = 1 AND
        "algorithm" = 'AES-256-GCM' AND
        octet_length("nonce") = 12 AND
        "tagBits" = 128 AND
        octet_length("ciphertext") BETWEEN 16 AND 32784
    )
);

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" UUID NOT NULL,
    "ownerId" TEXT NOT NULL,
    "envelopeVersion" INTEGER NOT NULL,
    "algorithm" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "tagBits" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TaskCategory_phase7_contract" CHECK (
        "id" NOT IN (
            '10000000-0000-4000-8000-000000000001'::UUID,
            '10000000-0000-4000-8000-000000000002'::UUID,
            '10000000-0000-4000-8000-000000000003'::UUID
        ) AND
        "envelopeVersion" = 1 AND
        "algorithm" = 'AES-256-GCM' AND
        octet_length("nonce") = 12 AND
        "tagBits" = 128 AND
        octet_length("ciphertext") BETWEEN 16 AND 4112
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_ownerId_key" ON "Project"("id", "ownerId");
CREATE UNIQUE INDEX "TaskCategory_id_ownerId_key" ON "TaskCategory"("id", "ownerId");
CREATE INDEX "TaskCategory_ownerId_updatedAt_idx" ON "TaskCategory"("ownerId", "updatedAt" DESC);
CREATE INDEX "Project_ownerId_updatedAt_idx" ON "Project"("ownerId", "updatedAt" DESC);
CREATE INDEX "VaultItem_ownerId_projectId_idx" ON "VaultItem"("ownerId", "projectId");
CREATE INDEX "EnvBundle_ownerId_projectId_updatedAt_idx" ON "EnvBundle"("ownerId", "projectId", "updatedAt" DESC);
CREATE INDEX "Note_ownerId_updatedAt_idx" ON "Note"("ownerId", "updatedAt" DESC);
CREATE INDEX "Note_ownerId_projectId_idx" ON "Note"("ownerId", "projectId");
CREATE INDEX "Task_ownerId_done_sortOrder_idx" ON "Task"("ownerId", "done", "sortOrder");
CREATE INDEX "Task_ownerId_projectId_idx" ON "Task"("ownerId", "projectId");
CREATE INDEX "Task_ownerId_customCategoryId_idx" ON "Task"("ownerId", "customCategoryId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_projectId_ownerId_fkey" FOREIGN KEY ("projectId", "ownerId") REFERENCES "Project"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnvBundle" ADD CONSTRAINT "EnvBundle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnvBundle" ADD CONSTRAINT "EnvBundle_projectId_ownerId_fkey" FOREIGN KEY ("projectId", "ownerId") REFERENCES "Project"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_ownerId_fkey" FOREIGN KEY ("projectId", "ownerId") REFERENCES "Project"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskCategory" ADD CONSTRAINT "TaskCategory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_ownerId_fkey" FOREIGN KEY ("projectId", "ownerId") REFERENCES "Project"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_customCategoryId_ownerId_fkey" FOREIGN KEY ("customCategoryId", "ownerId") REFERENCES "TaskCategory"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;
