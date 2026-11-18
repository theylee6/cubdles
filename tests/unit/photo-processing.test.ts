import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PhotoRejectedError, detectImageType, processPhoto } from "@/features/photos/processing";

async function makeJpeg(width: number, height: number, withGps = false, orientation?: number) {
  let img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 150, b: 120 } } }).jpeg();
  if (orientation) img = img.withMetadata({ orientation });
  if (withGps) {
    img = img.withExif({
      IFD0: { Make: "TestCam" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "12/1 58/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "77/1 35/1 0/1" },
    });
  }
  return new Uint8Array(await img.toBuffer());
}

describe("detectImageType", () => {
  it("recognises real image signatures, not names", async () => {
    expect(detectImageType(await makeJpeg(10, 10))).toBe("jpeg");
    expect(detectImageType(new Uint8Array(await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).png().toBuffer()))).toBe("png");
    expect(detectImageType(new Uint8Array(await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).webp().toBuffer()))).toBe("webp");
    expect(detectImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a........"))).toBeNull();
  });
});

describe("processPhoto", () => {
  it("strips EXIF including GPS location", async () => {
    const input = await makeJpeg(800, 1000, true);
    expect((await sharp(input).metadata()).exif).toBeDefined(); // sanity: the input really has EXIF
    const out = await processPhoto(input);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(Buffer.from(out.data).includes(Buffer.from("TestCam"))).toBe(false);
  });

  it("applies the EXIF orientation before stripping it", async () => {
    const out = await processPhoto(await makeJpeg(1000, 600, false, 6)); // stored landscape, displayed portrait
    expect(out.width).toBe(600);
    expect(out.height).toBe(1000);
  });

  it("limits the long side to 1600px without upscaling", async () => {
    const big = await processPhoto(await makeJpeg(4000, 3000));
    expect(Math.max(big.width, big.height)).toBe(1600);
    const small = await processPhoto(await makeJpeg(500, 600));
    expect([small.width, small.height]).toEqual([500, 600]);
  });

  it("rejects photos that are too small, too large, or not images", async () => {
    await expect(processPhoto(await makeJpeg(300, 900))).rejects.toBeInstanceOf(PhotoRejectedError);
    await expect(processPhoto(new Uint8Array(5 * 1024 * 1024).fill(0xff))).rejects.toThrow(/too large/);
    await expect(processPhoto(new TextEncoder().encode("not an image at all, sorry"))).rejects.toThrow(/JPG, PNG or WebP/);
    const truncated = (await makeJpeg(800, 800)).slice(0, 200);
    await expect(processPhoto(truncated)).rejects.toThrow(/couldn't read/);
  });
});
