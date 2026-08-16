# ROUND 5 — PAYWALL HIT LIST

Round 4 done: resume builder, video→GIF, PDF compressor, background remover,
image upscaler, PDF→text, TTS, STT, PDF signer, invoice generator — 47 tools
in the arsenal, all client-side, all pushed.

Research findings: real "free once, then paywall" services + complaint evidence.
Build these into the arsenal. Every tool must run fully client-side.

## 1. PDF redactor (blackout tool)
- **Enemy:** Redactable (paid plans), PDFescape (Pro for redaction), Adobe
  Acrobat Pro redaction
- **Build:** pdf.js page preview → drag black boxes over text → pdf-lib overlays
  real filled rectangles (not just white text) → export. Un-redact is impossible
  once flattened.

## 2. PDF splitter & extractor
- **Enemy:** Smallpdf (2 tasks/day), iLovePDF (task/hour caps, paid ranges)
- **Build:** page thumbnails, select ranges → download each split as its own PDF,
  or extract marked pages into one new PDF. No task caps.

## 3. PDF → images
- **Enemy:** paid PDF-to-JPG converters with page packs and watermarks
- **Build:** pdf.js render every page to canvas → PNG/JPG/WebP, DPI slider,
  per-page or zipped-by-hand downloads (one click per page, no archive needed).

## 4. PDF form filler
- **Enemy:** PDFescape (Pro-only form saving), paid form apps
- **Build:** pdf-lib `getForm` → list text fields + checkboxes, fill values in
  the browser, download a filled (optionally flattened) copy. Honest note when
  a form uses exotic widget types.

## 5. Batch watermarker
- **Enemy:** watermark.ws and friends pay for batch/removal
- **Build:** multi-file pick, text or image logo watermark, position presets +
  diagonal tiling, opacity, scale, batch canvas export. The opposite of tool #6.

## 6. Watermark cropper (crop & resave)
- **Enemy:** "AI watermark remover" sites that charge for fake/partial removal;
  the honest free fix is cropping the corner
- **Build:** image crop with corner handles + zoom, live preview, PNG export.
  Honest note: if the watermark sits in the middle of the image, crop won't
  save you — no AI tool can either, legally or technically.

## 7. Video trimmer / converter
- **Enemy:** Kapwing / VEED — trim, mute, resize all behind paid export +
  watermark
- **Build:** video pick, trim in/out handles, mute toggle, 720p/1080p scale,
  MediaRecorder re-encode → WebM/MP4 download. Local, no render queue.

## 8. Audio extractor & trimmer
- **Enemy:** paid audio converter sites (extract MP3 from video, trim tracks)
- **Build:** decode via AudioContext/`<video>` element source →
  OfflineAudioContext render, trim handles, WAV/OGG export, extract audio from
  browser-decodable video files.

## 9. Screen recorder
- **Enemy:** Loom (25-video free cap), paid recorders
- **Build:** `getDisplayMedia` tab/window/screen picker, optional mic mix,
  MediaRecorder → WebM download, pause/resume. Browser handles the permission
  prompt itself — nothing leaves the machine.

## 10. Barcode forge (EAN-13 / UPC-A / Code 128)
- **Enemy:** paid barcode generators (high-res/vector behind paywalls)
- **Build:** checksum math + encoding tables (same trick as the invoice Code 39),
  SVG + PNG export, human-readable line, quiet-zone padding.

## 11. Passport photo maker
- **Enemy:** paid passport photo apps (crop + print sheet behind paywall)
- **Build:** preset ratios (35×45, 51×51, US 2×2), white-background replace
  (reuse BackgroundRemover flood-fill approach), 6-up print sheet via print CSS.

## 12. Business card maker
- **Enemy:** Canva Pro, moo.com paid templates
- **Build:** template picker, editable fields, live canvas render, PDF via
  print CSS, double-sided (front/back) layout, 10-up A4 cut sheet.

## 13. Email signature generator
- **Enemy:** WiseStamp ($9/mo), MySignature free-tier limits
- **Build:** name/title/phone/email/links/social icons, template picker, live
  preview, copy HTML to clipboard, Gmail paste instructions (images must be
  hosted, so default to styled text + emoji icons).

## 14. Password vault + TOTP (local)
- **Enemy:** LastPass/Dashlane premium tiers, cloud vault trust issues
- **Build:** WebCrypto AES-GCM, PBKDF2 master password, encrypted localStorage
  vault, add/edit/copy entries, CSV export/import, plus a built-in TOTP
  authenticator (manual secret entry, 30s rolling code). Everything stays on
  the machine — that's the whole pitch.

## Stretch (if the round overdelivers)
- **Markdown → PDF:** print-CSS export bolt-on to MarkdownForge
- **Photo collage grid:** 2×2/3×3 auto-layout, Canva-Pro-style, canvas-based
- **Sitemap.xml generator:** URL list → XML download (XML-Sitemaps premium)
- **.ics event generator:** title/time/timezone/reminders → .ics download