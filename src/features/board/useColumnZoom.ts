import { useEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useUIStore } from "../../stores/ui";
import { SIZES } from "./layout";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Within this ratio of the fitted width, a pinch snaps back to fitting the viewport. */
const SNAP = 0.04;

/**
 * Pinch (ctrl + wheel, or Safari gesture events) changes the column width around the pointer.
 * The raw width accumulates over a gesture so tiny steps can still leave the snap zone around "fit".
 */
export function useColumnZoom(scrollerRef: RefObject<HTMLDivElement | null>, columnRem: number, fitRem: number, columns: number, rem: number) {
	const live = useRef({ columnRem, fitRem, columns });
	live.current = { columnRem, fitRem, columns };

	useEffect(() => {
		const scroller = scrollerRef.current!;
		let raw: number | null = null;
		let idle: ReturnType<typeof setTimeout> | undefined;

		const zoomTo = (next: number, clientX: number) => {
			const { columnRem: current, fitRem: fit, columns: count } = live.current;
			raw = clamp(next, SIZES.minColumn, SIZES.maxColumn);
			const snapped = Math.abs(raw - fit) / fit < SNAP ? null : raw;
			const target = snapped ?? clamp(fit, SIZES.minColumn, SIZES.maxColumn);
			clearTimeout(idle);
			idle = setTimeout(() => (raw = null), 300);
			if (Math.abs(target - current) < 0.001) return;
			// Keep the content under the pointer in place.
			const offset = clientX - scroller.getBoundingClientRect().left;
			const ratio = (scroller.scrollLeft + offset) / (current * count * rem);
			flushSync(() => useUIStore.getState().setColumnWidth(snapped));
			scroller.scrollLeft = ratio * target * count * rem - offset;
		};

		const onWheel = (event: WheelEvent) => {
			if (!event.ctrlKey) return;
			event.preventDefault();
			const delta = clamp(event.deltaY, -30, 30);
			zoomTo((raw ?? live.current.columnRem) * Math.exp(-delta * 0.01), event.clientX);
		};

		let gestureBase = columnRem;
		const onGestureStart = (event: Event) => {
			event.preventDefault();
			gestureBase = live.current.columnRem;
		};
		const onGestureChange = (event: Event) => {
			event.preventDefault();
			const gesture = event as Event & { scale: number; clientX: number };
			zoomTo(gestureBase * gesture.scale, gesture.clientX);
		};

		// Pinching anywhere else would zoom the whole page instead.
		const blockPageZoom = (event: WheelEvent) => {
			if (event.ctrlKey) event.preventDefault();
		};

		window.addEventListener("wheel", blockPageZoom, { passive: false });
		scroller.addEventListener("wheel", onWheel, { passive: false });
		scroller.addEventListener("gesturestart", onGestureStart);
		scroller.addEventListener("gesturechange", onGestureChange);
		return () => {
			clearTimeout(idle);
			window.removeEventListener("wheel", blockPageZoom);
			scroller.removeEventListener("wheel", onWheel);
			scroller.removeEventListener("gesturestart", onGestureStart);
			scroller.removeEventListener("gesturechange", onGestureChange);
		};
		// Listeners read the latest widths from `live`, so they only rebind when rem changes.
	}, [rem]);
}
