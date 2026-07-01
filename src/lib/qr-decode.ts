import jsQR from "jsqr";

const MAX_DECODE_SIZE = 720;
const MAX_IMAGE_DECODE_SIZE = 1200;

function getCenteredSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return {
    sourceX: Math.floor((width - side) / 2),
    sourceY: Math.floor((height - side) / 2),
    sourceSize: side,
  };
}

async function detectWithNativeDetector(detector: any, source: CanvasImageSource) {
  if (!detector) return "";
  const codes = await detector.detect(source);
  return codes?.[0]?.rawValue?.trim() ?? "";
}

function detectWithJsQr(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  })?.data?.trim() ?? "";
}

export async function decodeQrFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  detector?: any
) {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return "";

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";

  const { sourceX, sourceY, sourceSize } = getCenteredSquare(video.videoWidth, video.videoHeight);
  const decodeSize = Math.min(MAX_DECODE_SIZE, sourceSize);
  canvas.width = decodeSize;
  canvas.height = decodeSize;
  context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, decodeSize, decodeSize);

  try {
    const nativeValue = await detectWithNativeDetector(detector, canvas);
    if (nativeValue) return nativeValue;
  } catch {
    // Fall through to jsQR. Some browsers expose BarcodeDetector but reject canvas sources.
  }

  return detectWithJsQr(canvas, context);
}

export async function decodeQrFromImageFile(
  file: File,
  canvas: HTMLCanvasElement,
  detector?: any
) {
  const bitmap = await createImageBitmap(file);
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return "";

    const scale = Math.min(1, MAX_IMAGE_DECODE_SIZE / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    try {
      const nativeValue = await detectWithNativeDetector(detector, canvas);
      if (nativeValue) return nativeValue;
    } catch {
      // Fall through to jsQR.
    }

    return detectWithJsQr(canvas, context);
  } finally {
    bitmap.close();
  }
}
