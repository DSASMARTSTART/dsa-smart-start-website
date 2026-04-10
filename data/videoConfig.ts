/**
 * Vimeo video IDs per language and level.
 * Empty string = no video available yet (video section will be hidden).
 *
 * To add a new video: paste the numeric Vimeo ID from the embed URL
 *   e.g. https://player.vimeo.com/video/1181773348 → '1181773348'
 */

type VimeoMap = Record<string, Record<string, string>>;

/** Ebook detail page videos — keyed by language → ebook level */
export const ebookVimeoMap: VimeoMap = {
  en: {
    'A1': '',
    'A2': '',
    'B1': '',
    'B2': '',
    'kids-basic': '1181773348',
    'kids-medium': '1181773733',
    'kids-advanced': '1181772968',
  },
  it: {
    'A1': '',
    'A2': '',
    'B1': '',
    'B2': '',
    'kids-basic': '1181773462',
    'kids-medium': '1181773849',
    'kids-advanced': '1181773071',
  },
  sr: {
    'A1': '',
    'A2': '',
    'B1': '',
    'B2': '',
    'kids-basic': '',
    'kids-medium': '',
    'kids-advanced': '',
  },
  es: {
    'A1': '',
    'A2': '',
    'B1': '',
    'B2': '',
    'kids-basic': '1181773590',
    'kids-medium': '1181774001',
    'kids-advanced': '1181773247',
  },
};

/** Live course detail page videos — keyed by language → course slug */
export const liveCourseVimeoMap: VimeoMap = {
  en: {
    'starter-path': '',
    'language-lab': '',
    'language-lab-pro': '',
    'hybrid-pack': '',
  },
  it: {
    'starter-path': '',
    'language-lab': '',
    'language-lab-pro': '',
    'hybrid-pack': '',
  },
  sr: {
    'starter-path': '',
    'language-lab': '',
    'language-lab-pro': '',
    'hybrid-pack': '',
  },
  es: {
    'starter-path': '',
    'language-lab': '',
    'language-lab-pro': '',
    'hybrid-pack': '',
  },
};

/** Build the full Vimeo player embed URL from a video ID */
export function getVimeoEmbedUrl(videoId: string): string {
  if (!videoId) return '';
  return `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
}
