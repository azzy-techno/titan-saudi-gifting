/** Projected 2D positions of labelled parts (written in useFrame, read by the DOM overlay in rAF). */
export interface ProjectedLabel {
  x: number
  y: number
  visible: number
}

export const projected = {
  labels: new Map<string, ProjectedLabel>(),
  /** Number of parts that have started to separate (anatomy counter). */
  partsSeparated: 0,
  /** Screen-space centre of the watch (px) — used by captions/leader lines. */
  watchCenter: { x: 0, y: 0 },
  /** Screen position of the dial centre (px) — hero live-time caption. */
  dialCenter: { x: 0, y: 0, visible: 0 },
}
