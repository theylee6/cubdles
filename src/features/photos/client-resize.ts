/**
 * Browser-side preparation before upload: decode, downscale to ≤ maxSide, re-encode as JPEG.
 * Keeps uploads small (well under the 4 MB limit) and converts formats the browser can
 * decode but the server can't (e.g. HEIC on Safari). The server re-validates everything.
 */
export async function prepareImageForUpload(file: File, maxSide = 2000, quality = 0.88): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("We couldn't open that file. Please choose a JPG, PNG or WebP photo.");
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't prepare that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Your browser couldn't prepare that photo.");
  return blob;
}
