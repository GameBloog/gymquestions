const PDF_SIGNATURE = Buffer.from("%PDF-")

const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const RIFF_SIGNATURE = Buffer.from("RIFF")
const WEBP_SIGNATURE = Buffer.from("WEBP")

export function hasPdfSignature(buffer: Buffer): boolean {
  if (buffer.length < PDF_SIGNATURE.length) {
    return false
  }

  return buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
}

export function hasImageSignature(buffer: Buffer): boolean {
  if (
    buffer.length >= JPEG_SIGNATURE.length &&
    buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)
  ) {
    return true
  }

  if (
    buffer.length >= PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    return true
  }

  // WEBP: "RIFF" (0-3) + 4 bytes file size + "WEBP" (8-11)
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(RIFF_SIGNATURE) &&
    buffer.subarray(8, 12).equals(WEBP_SIGNATURE)
  ) {
    return true
  }

  return false
}
