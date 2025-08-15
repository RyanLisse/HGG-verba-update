declare module '@deck.gl/react' {
  import type { ComponentType } from 'react';
  // biome-ignore lint/suspicious/noExplicitAny: ambient type for third-party module
  const DeckGL: ComponentType<any>;
  export default DeckGL;
}
