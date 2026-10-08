import { ArrowRightIcon } from "@phosphor-icons/react";
import { animate, motion, type MotionValue } from "motion/react";
import { memo, useLayoutEffect, useRef } from "react";
import { shortcuts } from "../../app/shortcuts";
import { Hint } from "../../components/Hint";
import type { Side } from "../../lib/formats";
import { renderMarkdown } from "../../lib/markdown";
import type { Idea } from "../../lib/record";
import { getIdea } from "../../stores/flow";
import type { Caret } from "../../stores/ui";
import prose from "../../styles/prose.module.css";
import { SPRING, useBoard } from "./BoardContext";
import { loadCellEditor, loadedCellEditor } from "./editorLoader";
import styles from "./IdeaCell.module.css";
import { SIZES } from "./layout";

interface IdeaCellProps {
	idea: Idea;
	side: Side;
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
	/** Being dragged to a new position: follows the pointer instead of the layout. */
	lifted: boolean;
	/** Pointer is over the idea or the gutter beside it. */
	hover: boolean;
}

const GROW_FROM = { opacity: 0, scale: 0.98, clipPath: "inset(0% 0% 100% 0% round 0.5rem)" };
const GROW_TO = { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 0.5rem)", transitionEnd: { clipPath: "none" } };
const LIFTED = { ...GROW_TO, scale: 1.02 };
const SHRINK = { opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const } };

/** Moves a motion value to `target`, gliding on structural changes and jumping otherwise. Held values are left alone. */
function useGlide(value: MotionValue<number>, target: number, glide: boolean, held = false) {
	useLayoutEffect(() => {
		if (held || value.get() === target) return;
		if (glide || value.isAnimating()) animate(value, target, SPRING);
		else {
			value.stop();
			value.set(target);
		}
		// `glide` is read at the moment the target changes or the value is released.
	}, [target, held]);
}

export const IdeaCell = memo(function IdeaCell({ idea, side, depth, y, caret, glide, enter, canExtend, dropTarget, lifted, hover }: IdeaCellProps) {
	const { yOf, xOf, indent, observe, startLink, pressIdea } = useBoard();
	const ref = useRef<HTMLDivElement>(null);
	const yValue = yOf(idea.id, y);
	const xValue = xOf(idea.id, depth);

	// A released idea glides from wherever the pointer left it.
	useGlide(yValue, y, glide || !lifted, lifted);
	useGlide(xValue, depth * indent, true);
	useLayoutEffect(() => observe(ref.current!), [observe]);

	return (
		<motion.div
			ref={ref}
			data-idea-id={idea.id}
			data-side={side}
			data-color={idea.color ?? undefined}
			data-editing={caret ? "" : undefined}
			data-drop={dropTarget || undefined}
			data-lifted={lifted || undefined}
			data-hover={hover || undefined}
			className={styles.cell}
			style={{
				y: yValue,
				x: xValue,
				left: `calc(${idea.col} * var(--col-w) + ${SIZES.padLeft}rem)`,
				width: `calc(var(--col-w) - ${SIZES.padLeft + SIZES.padRight + depth * SIZES.indent}rem)`
			}}
			initial={enter ? GROW_FROM : false}
			animate={lifted ? LIFTED : GROW_TO}
			exit={SHRINK}
			transition={SPRING}
			onMouseDown={event => {
				if (event.button !== 0) return;
				// Keep focus where it is: clicking the editor's padding must not blur it, and a press on
				// another idea becomes either an edit or a drag once the pointer is released or moves.
				if (!caret || !(event.target as Element).closest(".ProseMirror")) event.preventDefault();
			}}
			onPointerDown={event => {
				if (!caret) pressIdea(idea.id, event);
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

	const caretRef = useRef(caret);
	caretRef.current = caret;

	// Attach synchronously once the editor has loaded, so typing right after Enter or Tab is never dropped.
	useLayoutEffect(() => {
		const container = ref.current!;
		const attach = (editor: NonNullable<ReturnType<typeof loadedCellEditor>>) => {
			editor.attach(container, id, getIdea(id)?.text ?? "");
			editor.focus(caretRef.current);
		};
		const ready = loadedCellEditor();
		let cancelled = false;
		if (ready) attach(ready);
		else void loadCellEditor().then(editor => !cancelled && attach(editor));
		return () => {
			cancelled = true;
			loadedCellEditor()?.detach(id);
		};
	}, [id]);

	const placed = useRef(false);
	useLayoutEffect(() => {
		// The attach above already placed the first caret.
		if (!placed.current) {
			placed.current = true;
			return;
		}
		loadedCellEditor()?.focus(caret);
	}, [caret]);

	return <div ref={ref} />;
}
