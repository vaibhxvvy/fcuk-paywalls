export interface IcoEntry {
  png: Blob;
  size: number;
}

export async function pngsToIco(entries: IcoEntry[]): Promise<Blob> {
  const parts = await Promise.all(
    entries.map(async ({ png, size }) => ({
      data: new Uint8Array(await png.arrayBuffer()),
      size,
    })),
  );

  const headerSize = 6 + parts.length * 16;
  const total = headerSize + parts.reduce((sum, p) => sum + p.data.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);

  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // type: icon
  dv.setUint16(4, parts.length, true); // image count

  let offset = headerSize;
  parts.forEach(({ data, size }, i) => {
    const e = 6 + i * 16;
    const dim = size >= 256 ? 0 : size;
    dv.setUint8(e, dim); // width (0 = 256)
    dv.setUint8(e + 1, dim); // height
    dv.setUint8(e + 2, 0); // palette
    dv.setUint8(e + 3, 0); // reserved
    dv.setUint16(e + 4, 1, true); // planes
    dv.setUint16(e + 6, 32, true); // bpp
    dv.setUint32(e + 8, data.length, true); // PNG size
    dv.setUint32(e + 12, offset, true); // PNG offset
    out.set(data, offset);
    offset += data.length;
  });

  return new Blob([out], { type: "image/x-icon" });
}