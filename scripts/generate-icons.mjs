// 依存ライブラリなし(Node標準のzlibのみ)でPNGアイコンを描く簡易スクリプト
// (マニアスタジアムのgenerate-icons.mjsと同じ方式)。
// ダークネイビー背景に、右肩上がりの緑のローソク足チャートを描く。
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function makeIcon(size) {
  const data = Buffer.alloc(size * size * 4)
  const bg = [15, 23, 32] // #0f1720
  const green = [47, 158, 92] // #2f9e5c
  const greenLight = [82, 214, 140]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      data[idx] = bg[0]
      data[idx + 1] = bg[1]
      data[idx + 2] = bg[2]
      data[idx + 3] = 255
    }
  }

  // 4本のローソク足(右肩上がり)。各バーは [xCenterRatio, topRatio, bottomRatio, wickTopRatio]
  const bars = [
    { cx: 0.28, top: 0.62, bottom: 0.78, wickTop: 0.56 },
    { cx: 0.44, top: 0.5, bottom: 0.66, wickTop: 0.44 },
    { cx: 0.6, top: 0.36, bottom: 0.52, wickTop: 0.3 },
    { cx: 0.76, top: 0.2, bottom: 0.4, wickTop: 0.14 }
  ]
  const barWidth = size * 0.1
  const wickWidth = Math.max(1, size * 0.016)

  for (const bar of bars) {
    const cx = bar.cx * size
    const top = bar.top * size
    const bottom = bar.bottom * size
    const wickTop = bar.wickTop * size

    // 芯(wick)
    for (let y = Math.round(wickTop); y < bottom; y++) {
      for (let x = Math.round(cx - wickWidth / 2); x < cx + wickWidth / 2; x++) {
        setPixel(data, size, x, y, greenLight)
      }
    }
    // 実体(body)
    for (let y = Math.round(top); y < bottom; y++) {
      for (let x = Math.round(cx - barWidth / 2); x < cx + barWidth / 2; x++) {
        setPixel(data, size, x, y, green)
      }
    }
  }

  return encodePNG(size, size, data)
}

function setPixel(data, size, x, y, [r, g, b]) {
  if (x < 0 || x >= size || y < 0 || y >= size) return
  const idx = (y * size + x) * 4
  data[idx] = r
  data[idx + 1] = g
  data[idx + 2] = b
  data[idx + 3] = 255
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  function chunk(type, d) {
    const typeBuf = Buffer.from(type, 'ascii')
    const lenBuf = Buffer.alloc(4)
    lenBuf.writeUInt32BE(d.length, 0)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, d])), 0)
    return Buffer.concat([lenBuf, typeBuf, d, crcBuf])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

for (const size of [192, 512]) {
  const png = makeIcon(size)
  writeFileSync(new URL(`../public/icons/icon-${size}.png`, import.meta.url), png)
  console.log(`wrote icon-${size}.png (${png.length} bytes)`)
}
