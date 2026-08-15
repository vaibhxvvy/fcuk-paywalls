declare module "gifenc" {
  interface EncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  interface FrameOptions {
    palette?: Uint8Array;
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    first?: boolean;
    repeat?: number;
  }

  interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  const gifenc: {
    GIFEncoder(opts?: EncoderOptions): Encoder;
    quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, opts?: Record<string, unknown>): Uint8Array;
    applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Uint8Array, format?: "rgb565" | "rgba4444"): Uint8Array;
  };

  export default gifenc;
}
