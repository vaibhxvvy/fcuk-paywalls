# ROUND 6 — PAYWALL HIT LIST

Round 5 done: 14 tools (PDF redactor/splitter/to-images/form-filler, batch
watermarker, watermark cropper, barcode forge, passport photo, video trimmer,
audio extractor, screen recorder, business card, email signature, password
vault + TOTP) + stretch round (Markdown→PDF print, collage forge, sitemap
forge, .ics event forge) — 64 tools in the arsenal, all client-side, all
pushed.

Research findings (2026 pricing, live evidence):

- **Adobe Acrobat online OCR:** 2 free tasks before signup; OCR Pro bundled
  into Acrobat Pro at $19.99/mo. Free OCR tools cap output at 5–25 pages/task.
- **HEIC converters:** heic.now free tier = 20 conversions/day, Premium
  $9.99/mo; heic.fun Premium $4.99/mo; Holdfast sells "pay once" per-conversion
  licences for a HEIC→JPG that runs in the browser anyway.
- **PDF unlockers:** SmallPDF free = 2 tasks/day, Pro $12/mo; iLovePDF free =
  1 task/hour, $7/mo; PuraPDF free = 2 uses/day with 5 MB caps.
- **Audio joiners:** Clideo watermarks free exports + account for bigger
  files; audio-joiner.com daily op limits, €44/yr for "unlimited";
  VEED/Kapwing watermark free tier.
- **Mockups:** Placeit free tier = watermarked previews only; $14.95/mo
  subscription (or $2.95 per single template download).
- **GIF compressors:** ezgif 200 MB cap; compress.fast runs on credits
  (1 credit per 5 MB, 50/day free); image2url free = 5 MB uploads, 3/day.
- **PDF rotate/organize:** Smallpdf 2 tasks/day; PuraPDF 2 uses/day.

## 1. OCR forge (image / scanned PDF → text)
- **Enemy:** Adobe Acrobat online OCR (2 free tasks, then signup; Pro $19.99/mo),
  page-capped OCR sites (5–25 pages)
- **Build:** Tesseract.js WASM in-browser, language picker (eng + common),
  image or PDF input (pdf.js render pages), copy + .txt/.md download.
  Stretch: searchable-PDF output (render page image into pdf-lib + invisible
  text overlay at word bboxes).

## 2. HEIC forge (HEIC → JPG/PNG/WebP)
- **Enemy:** heic.now (20 conversions/day cap, $9.99/mo), heic.fun premium,
  Holdfast per-conversion pay-once
- **Build:** heic2any WASM decode → canvas → JPG/PNG/WebP export with quality,
  multi-file batch. iPhone photos, straight off the phone.

## 3. PDF unlocker
- **Enemy:** SmallPDF 2 tasks/day ($12/mo), iLovePDF 1 task/hour ($7/mo),
  PuraPDF 2 uses/day 5 MB cap
- **Build:** pdf.js decrypts (optional password field for user-password docs),
  pdf-lib rewrites the doc without encryption/permission flags. Permission-only
  locks drop instantly, no password needed. Honest note: strong user
  encryption without the password is genuinely impossible — no site can either.

## 4. Audio joiner
- **Enemy:** Clideo (watermarked free exports), VEED/Kapwing, audio-joiner.com
  (daily limits, €44/yr unlimited)
- **Build:** decodeAudioData per file (browser-decodable: mp3/wav/ogg/m4a +
  video audio), reorder, concat in OfflineAudioContext, WAV/OGG export
  (reuse AudioExtractor patterns).

## 5. Mockup forge (device frames)
- **Enemy:** Placeit (watermarked free tier, $14.95/mo, $2.95/template)
- **Build:** canvas composite — phone / laptop / tablet frame drawn in code,
  upload image cover-fit into the screen, frame + background color controls,
  PNG export at print-ish scale.

## 6. GIF optimizer
- **Enemy:** compress.fast (credits, 1 per 5 MB), image2url (5 MB free cap),
  ezgif (200 MB upload cap)
- **Build:** gifuct-js decode → drop frames (every Nth) / resize / palette
  reduction → gifenc re-encode. Size before/after, target-style presets.

## 7. Photo lab (adjustments)
- **Enemy:** paid photo editor subscriptions (Lightroom-ish tiers)
- **Build:** canvas filters — brightness/contrast/saturation/sepia sliders
  (ctx.filter), vignette + grain overlays, live preview, JPG/PNG/WebP export.

## 8. PDF rotate & organizer
- **Enemy:** Smallpdf 2 tasks/day, PuraPDF 2 uses/day
- **Build:** pdf-lib — rotate every page or individual pages (90/180/270),
  reorder pages, download. No upload, no quota.

## Stretch (if the round overdelivers)
- **Searchable PDF (OCR + invisible text layer)** — the Acrobat Pro feature
- **Bulk QR batch** (CSV lines → QR PNGs, fights QR-Tiger bulk pricing)
- **Audio splitter** (cut one file into N equal parts)
