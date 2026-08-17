# ROUND 7 — HIT LIST

Theme: "one-click art & bulk jobs" — the stuff sites meter by credits or watermarks.

| # | Tool | Enemy | Enemy's wall (evidence) |
|---|------|-------|------------------------|
| 1 | SketchForge — photo → pencil / ink pen / charcoal / comic sketch | Fotor, Picsart, SketchMyPic | Fotor: "Limited Free credits", Pro/Pro+ subscriptions, credit rollover ads; Picsart: sketch effects gated behind Premium exports; SketchMyPic: free tier is ad-walled, remove-ads IAP $1.99, "premium" sticker packs. AI-sketch sites all meter per generation. |
| 2 | PdfSearchable — OCR text layer → searchable PDF | Adobe Acrobat Pro, Smallpdf Pro, iLovePDF | Acrobat Pro ~$29.99/mo for "scan & OCR"; Smallpdf Pro $12/mo (2 free tasks/day base); iLovePDF 1 task/hr free. Scanning-to-text is a quota business. |
| 3 | QrBatch — bulk QR codes → one ZIP | QRExplore, QR batch sites | QRExplore: **100 free codes, then "Buy credits"**; YEB watermark API charges 0.08 credits/file for batch watermarking. Batch jobs = credit meters. |
| 4 | AudioSplitter — split audio by silence or fixed chunks → ZIP of WAVs | Online audio cutters, Clideo, VEED | Cutters throttle free users (1 file/hour), watermark outputs, or hide the download behind premium; StemSplit charges $0.10–0.20 per minute of audio. |
| 5 | ImageSlicer — grid-cut an image into slices (IG posts etc.) → ZIP | IG slicer sites, split-image apps | Slice/9-grid sites watermark free exports, limit file size, or force account signup to download the ZIP. |

Stretch leftovers not taken: video compressor (complex), PDF→DOCX (heavy).

## Notes
- No new deps: qrcode-generator, fflate (zip), tesseract.js, pdf-lib, pdfjs-dist, gifenc all in.
- Searchable PDF approach: pdf.js render page → tesseract per page → blocks with bbox → pdf-lib StandardFonts.Helvetica invisible text at mapped coords (WinAnsi-safe chars; honest note for non-Latin).
- Sketch algorithms: pencil = grayscale + gaussian blur + color-dodge blend; ink = Sobel edges + threshold; charcoal = heavy blur + contrast; comic = posterize + edges overlay.