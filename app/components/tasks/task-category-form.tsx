"use client";

import React, { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { TaskCategoryBadge } from "@/app/components/ui/task-category-badge";
import { prepareTaskCategoryInput } from "@/app/lib/vault-crypto/task-category";
import { TASK_CATEGORY_COLOR_TOKENS } from "@/app/lib/task-categories";
import { WORKSPACE_FIELD_LIMITS } from "@/app/lib/workspace.types";
import type { TaskCategoryColorToken } from "@/app/lib/vault-data.types";
import type { TaskCategoryFormProps } from "./task-category-form.types";

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-accent/25 bg-background/80 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/10 disabled:opacity-60";

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
    <form onSubmit={handleSubmit} aria-busy={isSaving} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[10px] tracking-widest text-muted-foreground">
          CATEGORY NAME
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={WORKSPACE_FIELD_LIMITS.categoryNameCodePoints}
          autoComplete="off"
          autoFocus
          required
          disabled={isSaving}
          className={FIELD_CLASS}
        />
      </label>
      <fieldset disabled={isSaving}>
        <legend className="mb-2 text-[10px] tracking-widest text-muted-foreground">
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
              className={`inline-flex min-h-11 items-center rounded-lg px-2 py-1 transition-colors ${
                colorToken === token
                  ? "bg-accent/8 outline-2 outline-offset-2 outline-foreground/70"
                  : "opacity-70 hover:bg-accent/5 hover:opacity-100"
              }`}
            >
              <TaskCategoryBadge
                category={{ id: token, name: token, colorToken: token, builtIn: false }}
              />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="rounded-lg border border-accent/12 bg-background/45 p-3">
        <span className="mb-2 block text-[10px] tracking-widest text-muted-foreground">
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
        <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
          {validationError ?? requestError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-accent/15 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/20 px-4 py-2 text-xs tracking-wider text-muted-foreground hover:bg-accent/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <X className="h-3.5 w-3.5" /> CANCEL
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 text-xs font-semibold tracking-wider text-foreground hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {category ? "SAVE ENCRYPTED CATEGORY" : "CREATE ENCRYPTED CATEGORY"}
        </button>
      </div>
    </form>
  );
}
