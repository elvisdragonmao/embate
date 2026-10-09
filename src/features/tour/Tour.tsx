import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isEditableTarget } from "../../lib/platform";
import { TOUR_ID } from "../../lib/tour";
import { useFlowStore } from "../../stores/flow";
import { useTourStore } from "../../stores/tour";
import { STEPS, type Box, type TourStep } from "./steps";
import styles from "./Tour.module.css";
import { useEndTour } from "./useTour";

const SPRING = { type: "spring", stiffness: 420, damping: 40 } as const;
/** In px: room around the lit target, between it and the card, and between the card and the window's edges. */
const PAD = 6;
const GAP = 12;
const MARGIN = 12;
const RADIUS = 10;
/** Past any screen, so the dimmed area covers the whole window. */
const FAR = 100_000;

interface Size {
	width: number;
	height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** The target with some room around it, kept inside the window; null when none of it is on screen. */
function lit(box: Box | null, view: Size): Box | null {
	if (!box) return null;
	const hole = { left: Math.max(box.left - PAD, 2), top: Math.max(box.top - PAD, 2), right: Math.min(box.right + PAD, view.width - 2), bottom: Math.min(box.bottom + PAD, view.height - 2) };
	return hole.right > hole.left && hole.bottom > hole.top ? hole : null;
}

/** Beside the lit target on the preferred side if the card fits there, else on any side that fits, else inside the target's corner. */
function place(hole: Box | null, card: Size, side: TourStep["side"], view: Size) {
	const x = (value: number) => clamp(value, MARGIN, view.width - card.width - MARGIN);
	const y = (value: number) => clamp(value, MARGIN, view.height - card.height - MARGIN);
	if (!hole) return { x: x((view.width - card.width) / 2), y: y((view.height - card.height) / 2) };
	const spots = {
		right: view.width - hole.right - GAP - MARGIN >= card.width && { x: hole.right + GAP, y: y(hole.top) },
		left: hole.left - GAP - MARGIN >= card.width && { x: hole.left - GAP - card.width, y: y(hole.top) },
		bottom: view.height - hole.bottom - GAP - MARGIN >= card.height && { x: x(hole.left), y: hole.bottom + GAP },
		top: hole.top - GAP - MARGIN >= card.height && { x: x(hole.left), y: hole.top - GAP - card.height }
	};
	const order = side === "bottom" ? (["bottom", "top", "right", "left"] as const) : (["right", "left", "bottom", "top"] as const);
	for (const name of order) {
		const spot = spots[name];
		if (spot) return spot;
	}
	return { x: x(hole.right - card.width - GAP), y: y(hole.bottom - card.height - GAP) };
}

/** A rounded rectangle as a path, drawn so that inside the dimmed area it cuts a hole. */
function rounded(x: number, y: number, width: number, height: number) {
	if (width <= 0 || height <= 0) return "";
	const r = Math.min(RADIUS, width / 2, height / 2);
	const right = x + width;
	const bottom = y + height;
	return `M${x + r} ${y}H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}V${bottom - r}A${r} ${r} 0 0 1 ${right - r} ${bottom}H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Walks through the app on the practice round, lighting up one part at a time. */
export function Tour() {
	const step = useTourStore(state => state.step);
	const onTour = useFlowStore(state => state.record?.id === TOUR_ID);
	if (step === null || !onTour) return null;
	return createPortal(<Overlay index={Math.min(step, STEPS.length - 1)} />, document.body);
}

function Overlay({ index }: { index: number }) {
	const step = STEPS[index];
	const last = index === STEPS.length - 1;
	const go = useTourStore(state => state.go);
	const end = useEndTour();
	const reduced = useReducedMotion();
	const cardRef = useRef<HTMLDivElement>(null);
	const nextRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const bodyId = useId();

	const holeX = useMotionValue(0);
	const holeY = useMotionValue(0);
	const holeWidth = useMotionValue(0);
	const holeHeight = useMotionValue(0);
	const cardX = useMotionValue(0);
	const cardY = useMotionValue(0);
	const dim = useTransform([holeX, holeY, holeWidth, holeHeight], ([x, y, width, height]: number[]) => `M${-FAR} ${-FAR}H${FAR}V${FAR}H${-FAR}Z${rounded(x, y, width, height)}`);
	const ring = useTransform([holeX, holeY, holeWidth, holeHeight], ([x, y, width, height]: number[]) => rounded(x, y, width, height));

	// Where everything last headed, and the step it was for.
	const targets = useRef<number[] | null>(null);
	const placedFor = useRef(-1);

	// The target can move at any time (scrolling, typing, points gliding into place), so it is measured every frame.
	useLayoutEffect(() => {
		step.reveal?.()?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
		const values = [holeX, holeY, holeWidth, holeHeight, cardX, cardY];
		let frame = 0;
		const tick = () => {
			const view = { width: document.documentElement.clientWidth, height: window.innerHeight };
			const hole = lit(step.target?.() ?? null, view);
			const card = cardRef.current!;
			const spot = place(hole, { width: card.offsetWidth, height: card.offsetHeight }, step.side, view);
			const next = hole ? [hole.left, hole.top, hole.right - hole.left, hole.bottom - hole.top, spot.x, spot.y] : [view.width / 2, view.height / 2, 0, 0, spot.x, spot.y];
			const previous = targets.current;
			// A new step glides over; within a step the spotlight keeps up with the page as it moves.
			const glide = !!previous && placedFor.current !== index && !reduced;
			next.forEach((target, i) => {
				if (previous?.[i] === target) return;
				const value = values[i];
				if (glide || (value.isAnimating() && !reduced)) animate(value, target, SPRING);
				else {
					value.stop();
					value.set(target);
				}
			});
			targets.current = next;
			placedFor.current = index;
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(frame);
	}, [index, reduced]);

	// The card takes the keyboard on each step, unless that would interrupt someone typing.
	useEffect(() => {
		if (!isEditableTarget(document.activeElement)) nextRef.current?.focus({ preventScroll: true });
	}, [index]);

	const next = () => (last ? end() : go(index + 1));
	const back = () => index > 0 && go(index - 1);

	return (
		<>
			<svg className={styles.spotlight} aria-hidden>
				{/* Pressing the dimmed page does nothing, and leaves the caret where it was. */}
				<motion.path d={dim} className={styles.dim} onMouseDown={event => event.preventDefault()} />
				<motion.path d={ring} className={styles.ring} />
			</svg>
			<motion.div
				ref={cardRef}
				className={styles.card}
				style={{ x: cardX, y: cardY }}
				role="dialog"
				aria-labelledby={titleId}
				aria-describedby={bodyId}
				onKeyDown={event => {
					if (event.key === "Escape") end();
					else if (event.key === "ArrowRight") next();
					else if (event.key === "ArrowLeft") back();
					else return;
					event.preventDefault();
				}}
			>
				<p className={styles.count}>
					{index + 1} of {STEPS.length}
				</p>
				<h2 id={titleId} className={styles.title}>
					{step.title}
				</h2>
				<div id={bodyId} className={styles.body}>
					{step.body}
				</div>
				{step.task && <Task key={index} task={step.task} />}
				<div className={styles.footer}>
					{!last && (
						<button type="button" className={styles.skip} onClick={end}>
							Skip tour
						</button>
					)}
					<div className={styles.nav}>
						{index > 0 && (
							<button type="button" className={styles.secondary} onClick={back}>
								Back
							</button>
						)}
						<button ref={nextRef} type="button" className={styles.primary} onClick={next}>
							{last ? "Start flowing" : "Next"}
						</button>
					</div>
				</div>
			</motion.div>
		</>
	);
}

/** Something to try on this step; it ticks itself off once the flow shows it was done. */
function Task({ task }: { task: NonNullable<TourStep["task"]> }) {
	const [done, setDone] = useState(false);

	useEffect(() => {
		const start = useFlowStore.getState().record;
		if (!start) return;
		const unsubscribe = useFlowStore.subscribe(({ record }) => {
			if (!record || !task.done(record, start)) return;
			setDone(true);
			unsubscribe();
		});
		return unsubscribe;
	}, [task]);

	return (
		<p className={styles.task} data-done={done || undefined} aria-live="polite">
			{done ? <CheckCircleIcon size="1.125rem" weight="fill" role="img" aria-label="Done:" /> : <CircleIcon size="1.125rem" role="img" aria-label="Try it:" />}
			<span>{task.text}</span>
		</p>
	);
}
