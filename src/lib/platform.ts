export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** ⌘ on Apple platforms, Ctrl elsewhere. */
export const isMod = (event: { metaKey: boolean; ctrlKey: boolean }) => (isMac ? event.metaKey : event.ctrlKey);

export const keyLabels = {
	mod: isMac ? "⌘" : "Ctrl",
	alt: isMac ? "⌥" : "Alt",
	shift: isMac ? "⇧" : "Shift",
	enter: "↵",
	backspace: "⌫",
	tab: "Tab",
	esc: "Esc"
};

/** True while an IME (Zhuyin, Pinyin, …) is composing; Enter then confirms the composition. */
export const isComposing = (event: KeyboardEvent) => event.isComposing || event.keyCode === 229;

export function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}
