// Per-route Open Graph image overrides (Cloudflare Pages Function).
//
// Social scrapers (Discord, X, Facebook, Slack) do not run JavaScript, and the
// SPA serves one index.html for every route, so without this every URL would
// unfurl with a single shared og:image. This rewrites og:image / twitter:image
// at the edge based on the request path, using the runtime's HTMLRewriter.
//
// Bump OG_VERSION whenever an image file's contents change so scrapers refetch
// instead of serving a stale cached thumbnail.

const OG_VERSION = 6;

// Path -> image file (relative to the site root). Add a route here to give it a
// dedicated unfurl image; anything not listed falls back to DEFAULT_OG_IMAGE.
// /bonds has no dedicated image yet, so it is intentionally absent and falls
// back to preview.png until one is added under public/og/.
const OG_IMAGE_BY_PATH = {
  '/': 'og/og-home.jpg',
  '/students': 'og/og-students.jpg',
  '/hall': 'og/og-hall.jpg',
};

// Guaranteed-present fallback so an unmapped path (or a not-yet-uploaded image)
// can never point at a 404.
const DEFAULT_OG_IMAGE = 'preview.png';

function ogImageForPath(pathname) {
  const path = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
  const file = OG_IMAGE_BY_PATH[path] || DEFAULT_OG_IMAGE;
  return `https://eriduops.com/${file}?v=${OG_VERSION}`;
}

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);

  // Static assets carry a file extension and are never HTML navigations; skip
  // them so the rewriter only runs on page requests scrapers actually read.
  if (/\.[a-z0-9]+$/i.test(pathname)) return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const image = ogImageForPath(pathname);
  const setImage = {
    element(el) {
      el.setAttribute('content', image);
    },
  };

  return new HTMLRewriter()
    .on('meta[property="og:image"]', setImage)
    .on('meta[name="twitter:image"]', setImage)
    .transform(response);
}
