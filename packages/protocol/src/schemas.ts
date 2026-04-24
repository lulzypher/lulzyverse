import { z } from "zod";

/** Links a CID to a stable place id, surface, optional persona and ecosystem bucket. */
export const ecosystemReferenceEventSchema = z.object({
  id: z.string().min(1),
  cid: z.string().min(1),
  placeId: z.string().min(1),
  surface: z.string().min(1),
  personaDid: z.string().optional(),
  ecosystemBucket: z.string().optional(),
  observedAt: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type EcosystemReferenceEvent = z.infer<typeof ecosystemReferenceEventSchema>;

export const pinIntentSchema = z.object({
  id: z.string().min(1),
  cid: z.string().min(1),
  personaDid: z.string().optional(),
  ecosystemBucket: z.string().optional(),
  declaredAt: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type PinIntent = z.infer<typeof pinIntentSchema>;

/** Local-first chat retention / media prefs (minimal v1 for hub display). */
export const conversationPolicySchema = z.object({
  conversationId: z.string(),
  retainDays: z.number().int().positive().optional(),
  maxLocalAttachmentMb: z.number().positive().optional(),
  offloadToGatewayByDefault: z.boolean().optional(),
});

export type ConversationPolicy = z.infer<typeof conversationPolicySchema>;

export const participantMediaPolicySchema = z.object({
  participantDid: z.string(),
  allowAutoDownload: z.boolean().optional(),
  maxAutoDownloadMb: z.number().positive().optional(),
});

export type ParticipantMediaPolicy = z.infer<typeof participantMediaPolicySchema>;

export const referenceExportSchema = z.union([
  z.array(ecosystemReferenceEventSchema),
  z.object({
    events: z.array(ecosystemReferenceEventSchema),
    pinIntents: z.array(pinIntentSchema).optional(),
  }),
]);

export type ReferenceExport = z.infer<typeof referenceExportSchema>;
