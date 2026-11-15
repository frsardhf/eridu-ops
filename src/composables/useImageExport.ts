import { ref } from 'vue';
import { domToPng } from 'modern-screenshot';

/**
 * Capture a DOM element to a high-res PNG. SchaleDB icons are cross-origin and
 * the service worker caches them opaquely, so a tainted canvas would result;
 * we pre-fetch each image as a data URL (bypassing the SW) and swap `img.src`
 * before capture, then restore. Batched so a 700-tile wall doesn't fire 700
 * concurrent requests. (Same technique DeckBuilderModal uses for its export.)
 */

async function imgToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'reload' });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function inlineImages(
  imgs: HTMLImageElement[],
  concurrency = 16,
): Promise<Map<HTMLImageElement, string>> {
  const restore = new Map<HTMLImageElement, string>();
  let i = 0;
  async function worker() {
    while (i < imgs.length) {
      const img = imgs[i++];
      const dataUrl = await imgToDataUrl(img.src);
      if (dataUrl) {
        restore.set(img, img.src);
        img.src = dataUrl;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, imgs.length) }, worker));
  return restore;
}

interface RenderOptions {
  scale?: number;
  backgroundColor?: string;
}

interface CaptureOptions extends RenderOptions {
  fileName?: string;
  /** 'download' (default) saves via an `<a download>`; 'open' opens the PNG in a new tab. */
  output?: 'download' | 'open';
}

export function useImageExport() {
  const exporting = ref(false);

  async function renderPng(el: HTMLElement, opts: RenderOptions = {}): Promise<string | undefined> {
    if (exporting.value) return;
    exporting.value = true;
    const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
    let restore = new Map<HTMLImageElement, string>();
    try {
      restore = await inlineImages(imgs);
      await new Promise((r) => requestAnimationFrame(r));

      return await domToPng(el, {
        scale: opts.scale ?? 2,
        backgroundColor: opts.backgroundColor,
      });
    } finally {
      for (const [img, src] of restore) img.src = src;
      exporting.value = false;
    }
  }

  async function capturePngBlob(el: HTMLElement): Promise<Blob | undefined> {
    const dataUrl = await renderPng(el);
    return dataUrl ? await fetch(dataUrl).then((res) => res.blob()) : undefined;
  }

  async function captureToPng(el: HTMLElement, opts: CaptureOptions = {}): Promise<void> {
    const dataUrl = await renderPng(el, opts);
    if (!dataUrl) return;

    if (opts.output === 'open') {
      const blob = await fetch(dataUrl).then((res) => res.blob());
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = opts.fileName ?? 'export.png';
      a.click();
    }
  }

  return { exporting, captureToPng, capturePngBlob };
}
