import "server-only";
import sharp, { type Metadata, type Sharp } from "sharp";

/** Upload rules shared by the client (pre-checks) and the server (authoritative checks). */
export const PHOTO_RULES = {
  maxUploadBytes: 4 * 1024 * 1024, // stays under Vercel's 4.5 MB request limit
  minShortSide: 400,
  maxLongSide: 1600,
  maxInputPixels: 40_000_000,
} as const;

export type DetectedType = "jpeg" | "png" | "webp";

/** Identify the real file type from its first bytes — never trust the extension or the browser's MIME type. */
export function detectImageType(bytes: Uint8Array): DetectedType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "webp";
  return null;
}

export type ProcessedPhoto = { data: Buffer; width: number; height: number; contentType: "image/webp" };

export class PhotoRejectedError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "PhotoRejectedError";
  }
}

/**
 * Validates and re-encodes an uploaded photo:
 *  - checks real type and size,
 *  - applies EXIF orientation, then strips ALL metadata (EXIF/GPS, XMP, ICC),
 *  - limits dimensions and re-encodes to WebP.
 * Re-encoding also neutralises malformed or polyglot files.
 */
export async function processPhoto(input: Uint8Array): Promise<ProcessedPhoto> {
  if (input.byteLength === 0) throw new PhotoRejectedError("That file is empty.");
  if (input.byteLength > PHOTO_RULES.maxUploadBytes) throw new PhotoRejectedError("That photo is too large. Please choose one under 4 MB.");
  if (!detectImageType(input)) throw new PhotoRejectedError("Please upload a JPG, PNG or WebP photo.");

  let image: Sharp;
  let meta: Metadata;
  try {
    image = sharp(input, { limitInputPixels: PHOTO_RULES.maxInputPixels, failOn: "error" });
    meta = await image.metadata();
  } catch {
    throw new PhotoRejectedError("We couldn't read that photo. Please try a different one.");
  }
  if ((meta.pages ?? 1) > 1) throw new PhotoRejectedError("Animated images aren't supported. Please choose a still photo.");

  // Orientation 5–8 means the stored image is rotated 90°, so width/height swap once rotated.
  const rotated = (meta.orientation ?? 1) >= 5;
  const w = (rotated ? meta.height : meta.width) ?? 0;
  const h = (rotated ? meta.width : meta.height) ?? 0;
  if (Math.min(w, h) < PHOTO_RULES.minShortSide) {
    throw new PhotoRejectedError(`That photo is quite small. Please use one at least ${PHOTO_RULES.minShortSide} pixels on each side.`);
  }

  const { data, info } = await image
    .rotate() // bake in EXIF orientation before metadata is dropped
    .resize(PHOTO_RULES.maxLongSide, PHOTO_RULES.maxLongSide, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true }); // sharp drops metadata unless .withMetadata()/.keepMetadata() is called

  return { data, width: info.width, height: info.height, contentType: "image/webp" };
}
