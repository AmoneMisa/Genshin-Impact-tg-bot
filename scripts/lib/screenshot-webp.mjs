// Playwright can only write PNG/JPEG; documentation screenshots are kept as WebP.
//   await screenshotWebp(page, 'docs/city-mobile.webp', { fullPage: true });
import { execFileSync } from 'node:child_process';

const CONVERT = [
  'import io, sys',
  'from PIL import Image',
  "Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB').save(sys.argv[1], 'WEBP', quality=86, method=6)",
].join('\n');

export async function screenshotWebp(page, target, options = {}) {
  const png = await page.screenshot(options);
  execFileSync('python', ['-c', CONVERT, target], { input: png });
}
