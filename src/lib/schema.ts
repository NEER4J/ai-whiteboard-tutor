import { z } from "zod"

/**
 * The lesson format the model produces.
 *
 * A clip (a full lesson or a follow-up answer) is a list of segments. Each
 * segment is one short paragraph of narration plus the whiteboard elements
 * drawn while it is spoken. An element's `cue` is a phrase quoted from the
 * narration: the element starts drawing when the narrator reaches that phrase.
 *
 * Board coordinates are a fixed 1000 x 600 canvas.
 */

export const BOARD_W = 1000
export const BOARD_H = 600

export const colorSchema = z
  .enum(["ink", "blue", "red", "green", "orange", "purple"])
  .describe("ink = default dark marker; use colors sparingly for meaning")

const base = {
  id: z.string().describe("Short unique id, e.g. 'sun' or 'arrow1'"),
  cue: z
    .string()
    .describe(
      "A short phrase (2-6 words) copied EXACTLY from this segment's narration. The element starts drawing when the narrator says it."
    ),
  color: colorSchema.optional(),
}

export const textElement = z.object({
  type: z.literal("text"),
  ...base,
  x: z.number(),
  y: z.number().describe("Baseline of the first line"),
  text: z.string().describe("Use \\n for line breaks. Keep lines short."),
  size: z.enum(["sm", "md", "lg", "xl"]).optional(),
  align: z.enum(["start", "middle", "end"]).optional(),
})

const lineFields = {
  ...base,
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  dashed: z.boolean().optional(),
  label: z.string().optional().describe("Small label drawn near the midpoint"),
}

export const lineElement = z.object({ type: z.literal("line"), ...lineFields })
export const arrowElement = z.object({ type: z.literal("arrow"), ...lineFields })

export const rectElement = z.object({
  type: z.literal("rect"),
  ...base,
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fill: z.boolean().optional().describe("Light hatched fill"),
  label: z.string().optional().describe("Text centered inside the shape"),
})

export const circleElement = z.object({
  type: z.literal("circle"),
  ...base,
  cx: z.number(),
  cy: z.number(),
  r: z.number(),
  fill: z.boolean().optional(),
  label: z.string().optional().describe("Text centered inside the shape"),
})

export const pathElement = z.object({
  type: z.literal("path"),
  ...base,
  points: z
    .array(z.array(z.number()))
    .describe("Polyline points as [x, y] pairs, e.g. [[100,400],[150,380]]; 4-30 points for curves and plots"),
  smooth: z.boolean().optional().describe("Draw as a smooth curve through the points"),
  closed: z.boolean().optional(),
  fill: z.boolean().optional(),
})

export const axesElement = z.object({
  type: z.literal("axes"),
  ...base,
  x: z.number().describe("Origin x (bottom-left corner of the plot area)"),
  y: z.number().describe("Origin y (bottom-left corner of the plot area)"),
  w: z.number(),
  h: z.number(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
})

export const highlightElement = z.object({
  type: z.literal("highlight"),
  ...base,
  target: z.string().describe("id of an element already on this board"),
  style: z.enum(["circle", "underline", "box"]),
})

export const elementSchema = z.discriminatedUnion("type", [
  textElement,
  lineElement,
  arrowElement,
  rectElement,
  circleElement,
  pathElement,
  axesElement,
  highlightElement,
])

export const segmentSchema = z.object({
  newBoard: z
    .boolean()
    .describe("true = wipe the board before this segment. The first segment must be true."),
  boardTitle: z
    .string()
    .optional()
    .describe("Short chapter name, required when newBoard is true"),
  narration: z
    .string()
    .describe("What the tutor says aloud: 1-3 plain spoken sentences, no markdown or symbols."),
  elements: z.array(elementSchema).describe("0-6 elements drawn during this narration"),
})

export const clipSchema = z.object({
  title: z.string().describe("Lesson title, max 6 words"),
  reply: z
    .string()
    .describe(
      "Short chat message shown next to the board (1-3 sentences, markdown allowed)."
    ),
  segments: z.array(segmentSchema),
})

export type BoardColor = z.infer<typeof colorSchema>
export type BoardElement = z.infer<typeof elementSchema>
export type Segment = z.infer<typeof segmentSchema>
export type Clip = z.infer<typeof clipSchema>

export type Level = "beginner" | "intermediate" | "advanced"

export const lessonRequestSchema = z.object({
  mode: z.enum(["lesson", "followup"]),
  topic: z.string().trim().min(2).max(300),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  /** follow-up only */
  question: z.string().trim().max(500).optional(),
  lesson: z
    .object({
      title: z.string().max(200),
      narration: z.array(z.string().max(1200)).max(30),
    })
    .optional(),
  /** narration the learner was hearing when they asked */
  currentNarration: z.string().max(1200).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
    .max(16)
    .optional(),
})

export type LessonRequest = z.infer<typeof lessonRequestSchema>
