/** Wikipedia page summaries for event cards, fetched once per title. */
export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  thumbnail?: string;
}

const cache = new Map<string, Promise<WikiSummary | null>>();

export function fetchSummary(title: string): Promise<WikiSummary | null> {
  let p = cache.get(title);
  if (!p) {
    const path = encodeURIComponent(title.replace(/ /g, "_"));
    p = fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${path}`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        d && d.extract
          ? { title: d.title as string, extract: d.extract as string, url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${path}`, thumbnail: d.thumbnail?.source as string | undefined }
          : null,
      )
      .catch(() => null);
    cache.set(title, p);
  }
  return p;
}
