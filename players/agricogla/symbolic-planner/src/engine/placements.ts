import { z } from "zod";

/** Sub-choice payloads attached to a worker placement. Validation of legality
 *  (costs, adjacency, occupancy) happens in apply.ts; these schemas only fix
 *  the shapes. */

export const sowChoiceSchema = z.object({
  space: z.number().int().min(0).max(14),
  crop: z.enum(["grain", "vegetable"]),
});
export type SowChoice = z.infer<typeof sowChoiceSchema>;

export const bakeChoiceSchema = z.object({
  card: z.string(),
  grain: z.number().int().min(1),
});
export type BakeChoice = z.infer<typeof bakeChoiceSchema>;

/** Playing a minor improvement (or buying a major via "improvement" choices). */
export const improvementChoiceSchema = z.object({
  kind: z.enum(["major", "minor"]),
  card: z.string(),
  /** Buy a Cooking Hearth by returning a Fireplace instead of paying clay. */
  returnFireplace: z.string().optional(),
  /** Immediate bake granted by ovens. */
  bake: z.array(bakeChoiceSchema).optional(),
});
export type ImprovementChoice = z.infer<typeof improvementChoiceSchema>;

export const placementSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("farm_expansion"),
    rooms: z.array(z.number().int().min(0).max(14)).default([]),
    stables: z.array(z.number().int().min(0).max(14)).default([]),
  }),
  z.object({
    action: z.literal("meeting_place"),
    improvement: improvementChoiceSchema.optional(),
  }),
  z.object({ action: z.literal("grain_seeds") }),
  z.object({
    action: z.literal("farmland"),
    spaces: z.array(z.number().int().min(0).max(14)).min(1),
    /** Plow-improvement card enabling more than 1 field this action. */
    plowCard: z.string().optional(),
  }),
  z.object({ action: z.literal("lessons"), occupation: z.string() }),
  z.object({ action: z.literal("lessons_b"), occupation: z.string() }),
  z.object({ action: z.literal("day_laborer") }),
  z.object({ action: z.literal("forest") }),
  z.object({ action: z.literal("clay_pit") }),
  z.object({ action: z.literal("reed_bank") }),
  z.object({ action: z.literal("fishing") }),
  z.object({ action: z.literal("copse") }),
  z.object({ action: z.literal("grove") }),
  z.object({ action: z.literal("hollow") }),
  z.object({ action: z.literal("quarry_stall") }),
  z.object({ action: z.literal("resource_market") }),
  z.object({ action: z.literal("traveling_players") }),
  z.object({ action: z.literal("r_improvement"), improvement: improvementChoiceSchema }),
  z.object({ action: z.literal("r_sheep") }),
  z.object({ action: z.literal("r_fences"), edges: z.array(z.string()).min(1) }),
  z.object({
    action: z.literal("r_sow_bake"),
    sow: z.array(sowChoiceSchema).default([]),
    bake: z.array(bakeChoiceSchema).default([]),
  }),
  z.object({ action: z.literal("r_west_quarry") }),
  z.object({
    action: z.literal("r_renovate_improve"),
    improvement: improvementChoiceSchema.optional(),
  }),
  z.object({
    action: z.literal("r_family_growth"),
    improvement: improvementChoiceSchema.optional(),
  }),
  z.object({ action: z.literal("r_vegetable") }),
  z.object({ action: z.literal("r_boar") }),
  z.object({ action: z.literal("r_east_quarry") }),
  z.object({ action: z.literal("r_cattle") }),
  z.object({ action: z.literal("r_urgent_family") }),
  z.object({
    action: z.literal("r_cultivation"),
    plow: z.number().int().min(0).max(14).optional(),
    sow: z.array(sowChoiceSchema).default([]),
  }),
  z.object({
    action: z.literal("r_redevelop"),
    edges: z.array(z.string()).default([]),
  }),
]);

export type Placement = z.infer<typeof placementSchema>;

/** One conversion applied during feeding (or voluntarily). */
export const conversionSchema = z.object({
  /** "raw" for grain/vegetable at 1 food, otherwise a card id. */
  via: z.string(),
  good: z.enum(["grain", "vegetable", "sheep", "boar", "cattle", "wood", "clay", "reed"]),
  count: z.number().int().min(1),
});
export type Conversion = z.infer<typeof conversionSchema>;

export const feedDecisionSchema = z.object({
  conversions: z.array(conversionSchema).default([]),
});
export type FeedDecision = z.infer<typeof feedDecisionSchema>;
