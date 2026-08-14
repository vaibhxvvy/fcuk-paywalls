import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SVG_PATH = "public/favicon.svg";
const ICO_SIZES = [16, 32, 48, 256];

const svg = await readFile(SVG_PATH);

const frames = [];
for (const size of ICO_SIZES) {
  frames.push({
    size,
    data: await sharp(svg, { density: 600 })
      .resize(size, size, { fit: "contain" })
      .png()
      .toBuffer(),
  });
}

const headerSize = 6 + frames.length * 16;
const total = headerSize + frames.reduce((sum, f) => sum + f.data.length, 0);
const ico = Buffer.alloc(total);

ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(frames.length, 4); // image count

let offset = headerSize;
frames.forEach((frame, i) => {
  const e = 6 + i * 16;
  const dim = frame.size >= 256 ? 0 : frame.size;
  ico[e] = dim; // width (0 = 256)
  ico[e + 1] = dim; // height
  ico[e + 2] = 0; // palette
  ico[e + 3] = 0; // reserved
  ico.writeUInt16LE(1, e + 4); // planes
  ico.writeUInt16LE(32, e + 6); // bpp
  ico.writeUInt32LE(frame.data.length, e + 8); // PNG size
  ico.writeUInt32LE(offset, e + 12); // PNG offset
  frame.data.copy(ico, offset);
  offset += frame.data.length;
});

await writeFile("public/favicon.ico", ico);

const appleTouch = await sharp(svg, { density: 600 })
  .resize(180, 180, { fit: "contain" })
  .png()
  .toBuffer();
await writeFile("public/apple-touch-icon.png", appleTouch);

console.log(
  `OK: favicon.ico (${ico.length} bytes, sizes ${ICO_SIZES.join(",")}, PNG-embedded) + apple-touch-icon.png (${appleTouch.length} bytes)`,
);
