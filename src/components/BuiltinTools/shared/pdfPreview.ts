export async function renderPdfPreview(bytes: Uint8Array, scale = 1.2): Promise<string | null> {
  try {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
    GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}