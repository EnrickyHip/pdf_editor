import { z } from 'zod';

export const TextEditSchema = z.object({
  blockId: z.string(),
  pageIndex: z.number().int().min(0),
  originalText: z.string(),
  newText: z.string(),
});

export const TextInsertionSchema = z.object({
  id: z.string(),
  pageIndex: z.number().int().min(0),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  fontSize: z.number().positive(),
});

export const HighlightColorSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  opacity: z.number().min(0).max(1),
});

export const HighlightSchema = z.object({
  id: z.string(),
  pageIndex: z.number().int().min(0),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: HighlightColorSchema,
  text: z.string(),
});

export const EditsArraySchema = z.array(TextEditSchema);
export const InsertionsArraySchema = z.array(TextInsertionSchema);
export const HighlightsArraySchema = z.array(HighlightSchema);

export function validateEdits(data: unknown) {
  return EditsArraySchema.parse(data);
}

export function validateInsertions(data: unknown) {
  return InsertionsArraySchema.parse(data);
}

export function validateHighlights(data: unknown) {
  return HighlightsArraySchema.parse(data);
}
