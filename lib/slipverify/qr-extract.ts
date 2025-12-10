import sharp from "sharp";
import jsQR from "jsqr";

export async function extractQRFromImage(
  buffer: Buffer
): Promise<string | null> {
  try {
    // Convert image to raw pixel data
    const image = sharp(buffer);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Try to decode QR code
    const qrCode = jsQR(
      new Uint8ClampedArray(data),
      info.width,
      info.height
    );

    if (qrCode) {
      return qrCode.data;
    }

    return null;
  } catch (error) {
    console.error("Error extracting QR code:", error);
    return null;
  }
}
