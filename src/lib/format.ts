/** Um post pode ter mais de um formato (ex.: Feed + Stories no Instagram): guardados juntos, separados por " + ". */
export const FORMAT_SEP = " + ";
export const splitFormats = (v: string | null | undefined): string[] => (v ? v.split(FORMAT_SEP).map((s) => s.trim()).filter(Boolean) : []);
export const joinFormats = (list: string[]): string | null => (list.length ? list.join(FORMAT_SEP) : null);
/** Só o Instagram aceita mais de um formato por post (Feed/Reels + Stories). */
export const allowsMultiFormat = (networks: string[]) => networks.includes("Instagram");
/** Sem Instagram vale um formato só (o primeiro). */
export const normalizeFormat = (v: string | null | undefined, multi: boolean): string | null => {
  const parts = splitFormats(v);
  return joinFormats(multi ? parts : parts.slice(0, 1));
};
