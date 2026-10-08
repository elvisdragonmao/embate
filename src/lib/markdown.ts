import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

const cache = new Map<string, string>();

/** Renders cell markdown to safe HTML (micromark escapes raw HTML and dangerous URLs by default). */
export function renderMarkdown(markdown: string) {
	let html = cache.get(markdown);
	if (html === undefined) {
		html = micromark(markdown, { extensions: [gfm()], htmlExtensions: [gfmHtml()] });
		if (cache.size > 2000) cache.clear();
		cache.set(markdown, html);
	}
	return html;
}
