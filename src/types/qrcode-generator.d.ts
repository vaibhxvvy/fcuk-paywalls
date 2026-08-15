declare module "qrcode-generator" {
  interface QRCode {
    addData(data: string, mode?: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
    createSvgTag(opts?: { cellSize?: number; margin?: number; scalable?: boolean }): string;
    createImgTag(cellSize?: number, margin?: number): string;
    createDataURL(cellSize?: number, margin?: number): string;
    createTableTag(cellSize?: number, margin?: number): string;
    createASCII(cellSize?: number, margin?: number): string;
  }

  function qrcode(typeNumber: number, errorCorrectionLevel: string): QRCode;

  export = qrcode;
}
