declare module "imagetracerjs" {
  export interface ImageTracerOptions {
    numberOfColors?: number;
    blurRadius?: number;
    scale?: number;
    strokeWidth?: number;
    linefilter?: boolean;
    pathomit?: number;
    rightangleenhance?: boolean;
    ltres?: number;
    qtres?: number;
    roundcoords?: number;
    viewport?: boolean;
  }

  const ImageTracer: {
    imagedataToSVG(imagedata: ImageData, options?: ImageTracerOptions): string;
  };

  export default ImageTracer;
}
