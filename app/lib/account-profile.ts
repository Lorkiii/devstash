import { z } from "./validation/zod";

const MAX_DISPLAY_NAME_CHARACTERS = 40;
const DISPLAY_NAME_CHARACTERS = /^[\p{L}\p{M}\p{N}\p{P}\p{S} ]*$/u;

const displayNameInputSchema = z.union([
  z.null(),
  z.string().transform((value) => value.trim()).refine((value) =>
    Array.from(value).length <= MAX_DISPLAY_NAME_CHARACTERS &&
    DISPLAY_NAME_CHARACTERS.test(value),
  ).transform((value) => value || null),
]);

export const accountProfileUpdateSchema = z.strictObject({
  displayName: displayNameInputSchema,
});

export const accountProfileSchema = z.strictObject({
  email: z.email(),
  displayName: z.string().nullable(),
});

export const accountProfileResponseSchema = z.strictObject({
  success: z.literal(true),
  data: accountProfileSchema,
});

export type AccountProfile = z.infer<typeof accountProfileSchema>;
