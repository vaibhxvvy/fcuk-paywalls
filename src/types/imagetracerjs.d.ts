declare module "imagetracerjs" {
  export interface ImageTracerOptions {
    numberofcolors?: number;
    blurradius?: number;
    scale?: number;
    strokewidth?: number;
    linefilter?: boolean;
    pathomit?: number;
    rightangleenhance?: boolean;
    ltres?: number;
    qtres?: number;
    roundcoords?: number;
    viewbox?: boolean;
  }

  const ImageTracer: {
    imagedataToSVG(imagedata: ImageData, options?: ImageTracerOptions): string;
  };

  export default ImageTracer;
}