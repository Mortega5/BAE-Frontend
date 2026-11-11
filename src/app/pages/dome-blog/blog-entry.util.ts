/** Helpers shared by the blog/news list, the entry detail page and the dashboard news widget,
 * which all read the same loosely-shaped DOME blog entries. */
import { DomeBlogContentType } from 'src/app/services/dome-blog-service.service';

/** Prefers the slug for readable URLs, falling back to the entry id. */
export function blogEntryRouteId(entry: any): string {
  if (entry?.slug && typeof entry.slug === 'string' && entry.slug.trim().length > 0) {
    return entry.slug.trim();
  }
  return entry?._id;
}

/** `featuredImage` is stored either as a plain URL or as `{ url }`. */
export function blogEntryFeaturedImage(entry: any): string | null {
  if (typeof entry?.featuredImage === 'string' && entry.featuredImage.trim().length > 0) {
    return entry.featuredImage.trim();
  }
  if (typeof entry?.featuredImage?.url === 'string' && entry.featuredImage.url.trim().length > 0) {
    return entry.featuredImage.url.trim();
  }
  return null;
}

/** Explicit excerpt, else meta description, else the start of the content as plain text. */
export function blogEntryExcerpt(entry: any, maxLength: number): string {
  const explicitExcerpt = (entry?.excerpt || '').toString().trim();
  if (explicitExcerpt) {
    return explicitExcerpt;
  }
  const metaDescription = (entry?.metaDescription || '').toString().trim();
  if (metaDescription) {
    return metaDescription;
  }
  return truncateText(stripMarkdown((entry?.content || '').toString()), maxLength);
}

/** The blog API has answered with a bare array and with several wrapper shapes. */
export function extractBlogEntries(response: any): any[] {
  if (Array.isArray(response)) {
    return response;
  }
  const possibleEntries = response?.items || response?.entries || response?.data || response?.results || response?.content;
  return Array.isArray(possibleEntries) ? possibleEntries : [];
}

/** Entries with no content type are legacy blog posts. */
export function matchesBlogContentType(entry: any, contentType: DomeBlogContentType): boolean {
  const entryContentType = (entry?.contentType || entry?.type || '').toString().trim().toLowerCase();
  if (contentType === 'blog') {
    return !entryContentType || entryContentType === 'blog';
  }
  return entryContentType === contentType;
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}
