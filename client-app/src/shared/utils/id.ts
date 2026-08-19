/**
 * Ids are generated in loops and inside the same millisecond, so a timestamp
 * alone collides — and duplicate ids break dnd-kit's useSortable.
 */
export const uniqueId = (prefix: string): string => {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}${random}`;
};
