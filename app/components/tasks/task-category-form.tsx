"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { ConsolePanel } from "@/app/components/ui/console-panel";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import { prepareTaskCategoryInput } from "@/app/lib/vault-crypto/task-category";
import { TASK_CATEGORY_COLOR_TOKENS } from "@/app/lib/task-categories";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { TaskCategoryColorToken } from "@/app/lib/vault-data.types";
import type { TaskCategoryFormProps } from "./task-category-form.types";

const FIELD_CLASS = "w-full rounded border border-[#6ea8ff]/25 bg-[#05070d]/80 px-3 py-2 font-mono text-sm text-[#e8eefb] outline-none placeholder:text-[#e8eefb]/25 focus:border-[#6ea8ff]/70 disabled:opacity-60";

export function TaskCategoryForm({
  category,
  isSaving,
  requestError,
  onCancel,
  onSubmit,
}: TaskCategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [colorToken, setColorToken] = useState<TaskCategoryColorToken>(
    category?.colorToken ?? "cyan",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    try {
      await onSubmit(prepareTaskCategoryInput({ name, colorToken }));
    } catch (error) {
      if (error instanceof Error && error.name === "VaultCryptoValidationError") {
        setValidationError("Choose a valid name and palette color, then try again.");
        return;
      }
      throw error;
    }
  };

  return (
    <ConsolePanel
      title={category ? "EDIT CATEGORY" : "NEW CATEGORY"}
      status="NAME + COLOR ENCRYPTED"
      action={(
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded border border-[#6ea8ff]/20 px-2 py-1 text-[10px] tracking-widest text-[#e8eefb]/65 hover:text-[#e8eefb] disabled:opacity-50"
        >
          <X className="h-3 w-3" /> CANCEL
        </button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">
            CATEGORY NAME
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={WORKSPACE_FIELD_LIMITS.categoryNameCodePoints}
            autoComplete="off"
            required
            disabled={isSaving}
            className={FIELD_CLASS}
          />
        </label>
        <fieldset disabled={isSaving}>
          <legend className="mb-2 text-[10px] tracking-widest text-[#e8eefb]/55">
            THEME COLOR
          </legend>
          <div className="flex flex-wrap gap-2">
            {TASK_CATEGORY_COLOR_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                aria-pressed={colorToken === token}
                aria-label={`Use ${token} category color`}
                onClick={() => setColorToken(token)}
                className={`rounded p-1 transition-colors ${
                  colorToken === token
                    ? "outline-2 outline-offset-2 outline-[#e8eefb]/70"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <TaskCategoryBadge
                  category={{ id: token, name: token, colorToken: token, builtIn: false }}
                />
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <span className="mb-1.5 block text-[10px] tracking-widest text-[#e8eefb]/55">
            PREVIEW
          </span>
          <TaskCategoryBadge
            category={{
              id: "preview",
              name: name.trim() || "Category",
              colorToken,
              builtIn: false,
            }}
          />
        </div>
        {(validationError || requestError) && (
          <p role="alert" className="text-xs text-rose-300">
            {validationError ?? requestError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-10 items-center gap-2 rounded border border-[#6ea8ff]/50 bg-[#6ea8ff]/15 px-4 py-2 text-xs font-semibold tracking-wider text-[#e8eefb] hover:bg-[#6ea8ff]/25 disabled:opacity-50"
        >
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {category ? "SAVE ENCRYPTED CATEGORY" : "CREATE ENCRYPTED CATEGORY"}
        </button>
      </form>
    </ConsolePanel>
  );
}
