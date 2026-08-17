# ROUND 8 — the next five

The enemy this time: vector tracing credits, watermark-subscription video, PDF crop paywalls,
collage-app IAPs, and GIF tools that delete your files after an hour.

## 1. Vector forge — `vector-forge` (image)
- **Enemy:** Vectorizer.AI — web app `$9.99/mo`, API from `$9.99` for 50 credits (`$0.20`/image,
  `$0.05–0.077` at volume), watermarked previews cost `0.2` credits, extra format downloads `0.1`
  credits each.
- **The tool:** raster → SVG trace, entirely in the tab via `imagetracerjs` (already installed,
  1.2.6). Canvas → ImageData → `ImageTracer.imagedataToSVG`, controls for color count
  (2–32), line/quad precision, path omit, blur radius, scale. SVG preview + `.svg` download.
- **The math:** vectorizing a bitmap is quantization + edge-path fitting — potrace-class
  algorithms, zero GPU, zero credits.

## 2. Video joiner — `video-joiner` (media)
- **Enemy:** Kapwing — free plan watermarks every export, caps videos at 1 minute and 720p,
  ~30 min of exports per month, deletes projects after 3 days; Pro is `$16/mo` annual /
  `$24` monthly.
- **The tool:** pick N videos, get them concatenated in order into one `.webm` (VP8/VP9 + Opus)
  recorded locally. Canvas `captureStream` + `MediaRecorder`, audio piped through a
  `MediaStreamAudioDestinationNode` so sound survives the join. Quality knob (1/2.5/6 Mbps),
  per-file progress, no account, no watermark, no length cap.
- **The math:** "merging" is playing file A then file B into one recorder — a for-loop over
  `<video>` elements.

## 3. PDF cropper — `pdf-cropper` (pdf)
- **Enemy:** iLovePDF — "Crop PDF" is a Premium feature (`$7/mo`, ads-free upsell); free tier
  rations "limited document processing".
- **The tool:** trim margins off every page via `pdf-lib` `setMediaBox`. Per-side sliders in
  points (0–150), live preview of page 1 with the crop box drawn as an overlay, "apply to all
  pages" and download.
- **The math:** a crop is shrinking the MediaBox; the content coordinates don't move.

## 4. Photo stitcher — `photo-stitcher` (image)
- **Enemy:** Pic Stitch Pro `$34.99/yr` (or `$6.99/mo`, `$3.99/wk`), Photo Stitch Pro `$29.99`,
  Stiiitch charging `$0.99` for watermark removal. Honest counter-example: 17 Collage is free —
  but the app-store shelf is dominated by IAP walls.
- **The tool:** vertical or horizontal strip of any number of photos, spacing 0–50 px, white or
  transparent gap, max-width normalization so the strip comes out one image — PNG or JPEG.
- **The math:** a stitch is a canvas tall enough for the sum of the heights.

## 5. GIF ripper — `gif-ripper` (image)
- **Enemy:** EZGif is genuinely free — its limits are the 200 MB upload cap and files deleted
  one hour after upload; frame extraction as PNGs is a full round trip through their servers.
- **The tool:** decode an animated GIF with `gifuct-js` (installed, 2.1.2) — frames rendered
  with correct disposal semantics onto a canvas, every Nth frame option, width cap — then all
  frames as PNGs in one ZIP plus a frame-strip preview. No upload, no deletion clock.
- **The math:** GIF frames are LZW-compressed patches; composition is draw-over-previous with
  disposal rules.

## Status
5/5 built — 79 → 84 tools. No new dependencies.