# ROUND 4 — PAYWALL HIT LIST

Research findings: real "free once, then paywall" services + complaint evidence.
Build these into the arsenal. Every tool must run fully client-side.

## 1. Resume builder
- **Enemy:** Resume Genius ($7.95/mo trial trap), Resume Nerd ($2.75 → $23.75/mo),
  ResumeBuilder.com, Novoresume, Canva CVs
- **Pattern:** build free → PDF/DOCX download behind subscription. Cancellation mazes.
- **Evidence:** enhancv.com/blog/resumebuilder-review, resumefast.io (Resume Genius
  alternative audit), legalclarity.org cancel guides, Reddit/Trustpilot/BBB threads
- **Build:** template picker (2-3 brutalist-clean layouts), editable sections
  (contact, summary, experience, education, skills, custom), live preview,
  PDF export via print CSS. "Your resume is your data."

## 2. Video → GIF maker
- **Enemy:** Kapwing (watermark every export, 1-min cap, ~30 min/mo, 3-day storage,
  10 lifetime credits), VEED (watermark), GifStor (10/mo, watermark), CloudConvert
  (10 conversions/day)
- **Evidence:** morphed.app/blog/kapwing-free-plan-limits, essexsoftware.com MP4→GIF
  comparison
- **Build:** video pick, trim handles, fps + width controls, frame-by-frame
  GIF encode on canvas (local encoder), size estimate, no watermark ever.

## 3. PDF compressor
- **Enemy:** Smallpdf (2 tasks/day + watermark + billing complaints), iLovePDF
  (watermarks), Sejda (3 tasks/hour)
- **Evidence:** dev.to "I tested every free PDF tool" ×2, Trustpilot, sikayetvar
- **Build:** pdf-lib based — recompress JPEG images, downsample, drop duplicate
  objects/unused streams, target file size slider, before/after preview.

## 4. Background remover (solid-color)
- **Enemy:** remove.bg (free = 0.25MP preview only; HD = $9/mo credits), Cutout Pro
  (5 credits then watermark)
- **Evidence:** lemonsight review, photopea/photopea issue #6030 (users priced out)
- **Build:** flood-fill from edges on solid/contrasting backgrounds, tolerance
  slider, edge feather, transparency preview on checker, honest note: not
  AI-grade for hair/fur. PNG out.

## 5. Image upscaler
- **Enemy:** Magnific ($39/mo, no trial, no refunds, expiring credits), upscale.media
  (5/day + watermark), VanceAI, Let's Enhance (10 credits then nothing)
- **Evidence:** costbench.com/magnific-ai, aitooltier, stork.ai "subscription trap"
- **Build:** 2x/4x/8x with lanczos interpolation + unsharp mask, unlimited, PNG/JPG
  out. Honest: restoration, not AI detail invention.

## 6. PDF → text / Markdown extractor
- **Enemy:** DocTranslator (1-page free preview), OCR/PDF-extraction sites with
  page packs
- **Evidence:** topaihit.com tool review (free plan = 20 pages / 20MB caps)
- **Build:** pdf.js lazy chunk, extract text per page, copy/download .txt/.md.
  (Option later: tesseract.js for scanned PDFs.)

## 7. Text to speech
- **Enemy:** Murf, PlayHT, ElevenLabs (minutes of free TTS then credits)
- **Build:** native speechSynthesis — voice pick, rate, pitch, pause/resume.

## 8. Speech to text
- **Enemy:** Whisper web apps (Turboscribe: 10 min free)
- **Build:** native Web Speech API, live transcript, copy/download .txt.

## 9. PDF signer
- **Enemy:** DocuSign/HelloSign — signing is paid-only territory
- **Build:** signature pad (mouse/touch draw or type), opacity/size, embed via
  pdf-lib into page picker.

## 10. Invoice generator
- **Enemy:** Invoice Simple (3 invoices/mo free), Canva invoice templates behind Pro
- **Build:** line items, tax, discount, notes → brutalist invoice PDF via pdf-lib.
