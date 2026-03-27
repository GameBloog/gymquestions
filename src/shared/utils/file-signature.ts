const PDF_SIGNATURE = Buffer.from("%PDF-")

export function hasPdfSignature(buffer: Buffer): boolean {
  if (buffer.length < PDF_SIGNATURE.length) {
    return false
  }

  return buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
}
