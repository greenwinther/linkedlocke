import { z } from "zod";

const sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected SHA-256 hex string");

const trimmedName = z.string().trim().min(1).max(30);

export const JoinPlayerPayloadSchema = z.object({
  playerId: z.string().min(1),
  authUid: z.string().min(1),
  name: trimmedName,
  createdAt: z.number().int().nonnegative(),
  lastSeenAt: z.number().int().nonnegative(),
  playerSecretHash: sha256HexSchema,
});

export const EncounterPayloadSchema = z.object({
  speciesId: z.number().int().positive(),
  speciesName: z.string().trim().min(1),
  spriteUrl: z.string().trim().url().optional(),
  nickname: z.string().trim().max(30).optional(),
  status: z.enum(["alive", "dead"]),
  updatedAt: z.number().int().nonnegative(),
});

export const CreateRunPayloadSchema = z.object({
  runId: z.string().min(1),
  meta: z.object({
    createdAt: z.number().int().nonnegative(),
    status: z.enum(["OPEN", "CLOSED"]),
    gameId: z.string().trim().min(1),
    hostPlayerId: z.string().min(1),
    hostAuthUid: z.string().min(1),
    hostSecretHash: sha256HexSchema,
  }),
  settings: z.object({
    deathPropagationEnabled: z.boolean(),
  }),
  hostPlayer: JoinPlayerPayloadSchema,
});

export type JoinPlayerPayload = z.infer<typeof JoinPlayerPayloadSchema>;
export type EncounterPayload = z.infer<typeof EncounterPayloadSchema>;
export type CreateRunPayload = z.infer<typeof CreateRunPayloadSchema>;
