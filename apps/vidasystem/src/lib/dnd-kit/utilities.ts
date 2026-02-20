interface Translate {
  x: number;
  y: number;
}

export const CSS = {
  Translate: {
    toString(transform: Translate | null | undefined): string {
      if (!transform) return '';
      return `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    },
  },
};
