import { useEffect } from "react";
import { downloadCurrent } from "../features/sidebar/download";
import { formatOf } from "../lib/formats";
import { isComposing, isEditableTarget, isMac, isMod } from "../lib/platform";
import { undoStructure } from "../stores/actions";
import { useFlowStore } from "../stores/flow";
import { useTimerStore } from "../stores/timer";
import { useUIStore } from "../stores/ui";

const isInteractive = (target: EventTarget | null) => target instanceof Element && target !== document.body && !!target.closest("button, a, input, textarea, select, [role], [contenteditable]");

/** App-wide shortcuts. Option/Alt combos match `event.code` because ⌥ rewrites `event.key` on macOS. */
export function useHotkeys() {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || isComposing(event)) return;
			const ui = useUIStore.getState();
			const timer = useTimerStore.getState();
			const mod = isMod(event);
			const handled = () => {
				event.preventDefault();
				event.stopPropagation();
			};

			if (mod && !event.altKey) {
				if (event.key === "/" || event.code === "Slash") {
					handled();
					ui.setInfoOpen(!ui.infoOpen);
				} else if (event.code === "KeyO" && !event.shiftKey) {
					handled();
					ui.setOpenMenuOpen(!ui.openMenuOpen);
				} else if (event.code === "KeyS" && !event.shiftKey) {
					handled();
					downloadCurrent();
				} else if ((event.code === "KeyZ" || (!isMac && event.code === "KeyY")) && !isEditableTarget(event.target)) {
					handled();
					undoStructure(event.code === "KeyY" || event.shiftKey);
				}
				return;
			}

			if (event.altKey && !mod && !event.shiftKey) {
				if (event.code === "KeyT") {
					handled();
					timer.toggle();
				} else if (event.code === "KeyR") {
					handled();
					timer.reset();
				} else if (event.code === "KeyM") {
					handled();
					timer.toggleMode();
				} else if (/^Digit[1-9]$/.test(event.code)) {
					handled();
					timer.quickStart(Number(event.code.slice(5)) * 60_000);
				} else if (event.code === "BracketLeft" || event.code === "BracketRight") {
					const flow = useFlowStore.getState();
					if (formatOf(flow.record?.format).prep === null) return;
					handled();
					flow.togglePrep(event.code === "BracketLeft" ? "aff" : "neg");
				}
				return;
			}

			if (event.code === "Space" && !mod && !event.altKey && !event.shiftKey && !isInteractive(event.target) && !ui.infoOpen && !ui.openMenuOpen) {
				handled();
				timer.toggle();
			}
		};

		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
	}, []);
}
