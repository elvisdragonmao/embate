import { ArrowRightIcon } from "@phosphor-icons/react";
import { animate, motion, type MotionValue } from "motion/react";
import { memo, useLayoutEffect, useRef } from "react";
import { shortcuts } from "../../app/shortcuts";
import { Hint } from "../../components/Hint";
import { renderMarkdown } from "../../lib/markdown";
import { sideOf, type Idea } from "../../lib/record";
import { getIdea } from "../../stores/flow";
import { useUIStore, type Caret } from "../../stores/ui";
import prose from "../../styles/prose.module.css";
import { SPRING, useBoard } from "./BoardContext";
import { cellEditor } from "./cellEditor";
import styles from "./IdeaCell.module.css";
import { SIZES } from "./layout";

interface IdeaCellProps {
	idea: Idea;
	depth: number;
	y: number;
	/** Present while this idea is being edited. */
	caret: Caret | null;
	/** Structural change: glide into the new position instead of jumping. */
	glide: boolean;
	/** Newly created: grow in. */
	enter: boolean;
	canExtend: boolean;
	dropTarget: boolean;
}

const GROW_FROM = { opacity: 0, scale: 0.98, clipPath: "inset(0% 0% 100% 0% round 0.5rem)" };
const GROW_TO = { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 0.5rem)", transitionEnd: { clipPath: "none" } };
const SHRINK = { opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const } };

function useGlide(value: MotionValue<number>, target: number, glide: boolean) {
	useLayoutEffect(() => {
		if (value.get() === target) return;
		if (glide || value.isAnimating()) animate(value, target, SPRING);
		else {
			value.stop();
			value.set(target);
		}
		// Only the target drives this; `glide` is read at the moment the target changes.
	}, [target]);
}

export const IdeaCell = memo(function IdeaCell({ idea, depth, y, caret, glide, enter, canExtend, dropTarget }: IdeaCellProps) {
	const { yOf, xOf, indent, observe, startLink } = useBoard();
	const ref = useRef<HTMLDivElement>(null);
	const yValue = yOf(idea.id, y);
	const xValue = xOf(idea.id, depth);

	useGlide(yValue, y, glide);
	useGlide(xValue, depth * indent, true);
	useLayoutEffect(() => observe(ref.current!), [observe]);

	return (
		<motion.div
			ref={ref}
			data-idea-id={idea.id}
			data-side={sideOf(idea.col)}
			data-color={idea.color ?? undefined}
			data-editing={caret ? "" : undefined}
			data-drop={dropTarget || undefined}
			className={styles.cell}
			style={{
				y: yValue,
				x: xValue,
				left: `calc(${idea.col} * var(--col-w) + ${SIZES.padLeft}rem)`,
				width: `calc(var(--col-w) - ${SIZES.padLeft + SIZES.padRight + depth * SIZES.indent}rem)`
			}}
			initial={enter ? GROW_FROM : false}
			animate={GROW_TO}
			exit={SHRINK}
			transition={SPRING}
			onMouseDown={event => {
				if (event.button !== 0) return;
				if (caret) {
					// Clicking the padding around the editor must not blur it.
					if (!(event.target as Element).closest(".ProseMirror")) event.preventDefault();
					return;
				}
				event.preventDefault();
				useUIStore.getState().edit(idea.id, { at: "point", x: event.clientX, y: event.clientY });
			}}
		>
			{caret ? <EditorSlot id={idea.id} caret={caret} /> : <div className={prose.prose} dangerouslySetInnerHTML={{ __html: renderMarkdown(idea.text) }} />}
			{canExtend && (
				<Hint label="Extend · drag to link" keys={shortcuts.extend} side="right">
					<button
						type="button"
						className={styles.extend}
						aria-label="Extend into the next speech"
						onPointerDown={event => startLink(idea.id, event)}
						onMouseDown={event => {
							event.preventDefault();
							event.stopPropagation();
						}}
					>
						<ArrowRightIcon size="0.75rem" weight="bold" />
					</button>
				</Hint>
			)}
		</motion.div>
	);
});

function EditorSlot({ id, caret }: { id: string; caret: Caret }) {
	const ref = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		cellEditor.attach(ref.current!, id, getIdea(id)?.text ?? "");
		return () => cellEditor.detach(id);
	}, [id]);

	useLayoutEffect(() => {
		cellEditor.focus(caret);
	}, [caret]);

	return <div ref={ref} />;
}
