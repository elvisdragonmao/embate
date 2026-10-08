import { ContextMenu } from "@base-ui/react/context-menu";
import { LinkBreakIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, type ReactElement, type Ref } from "react";
import { IDEA_COLORS, type IdeaColor } from "../../lib/record";
import { getIdea, useFlowStore } from "../../stores/flow";
import { useUIStore } from "../../stores/ui";
import styles from "./IdeaMenu.module.css";

const NONE = "none";

interface IdeaMenuProps {
	/** The board's scroll container; right-clicking an idea inside it opens the menu. */
	render: ReactElement<Record<string, unknown>>;
	triggerRef: Ref<HTMLDivElement>;
	children: React.ReactNode;
}

export function IdeaMenu({ render, triggerRef, children }: IdeaMenuProps) {
	const [targetId, setTargetId] = useState<string | null>(null);
	const idea = useFlowStore(state => (targetId ? state.record?.ideas.find(item => item.id === targetId) : undefined));

	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger
				ref={triggerRef}
				render={render}
				onContextMenu={event => {
					const id = (event.target as Element).closest<HTMLElement>("[data-idea-id]")?.dataset.ideaId;
					if (!id || !getIdea(id)) {
						event.preventBaseUIHandler();
						return;
					}
					setTargetId(id);
				}}
			>
				{children}
			</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Positioner className={styles.positioner}>
					<ContextMenu.Popup className={styles.popup}>
						{idea && (
							<>
								<ContextMenu.RadioGroup
									className={styles.swatches}
									value={idea.color ?? NONE}
									onValueChange={value => useFlowStore.getState().setColor(idea.id, value === NONE ? null : (value as IdeaColor))}
								>
									{[NONE, ...IDEA_COLORS].map(color => (
										<ContextMenu.RadioItem key={color} value={color} closeOnClick className={styles.swatch} data-swatch={color} aria-label={color === NONE ? "No color" : color} />
									))}
								</ContextMenu.RadioGroup>
								{idea.from && (
									<ContextMenu.Item className={styles.item} onClick={() => useFlowStore.getState().unlink(idea.id)}>
										<LinkBreakIcon size="1rem" />
										Unlink
									</ContextMenu.Item>
								)}
								<ContextMenu.Item
									className={styles.item}
									data-danger=""
									onClick={() => {
										if (useUIStore.getState().editing?.id === idea.id) useUIStore.setState({ editing: null });
										useFlowStore.getState().remove(idea.id);
									}}
								>
									<TrashIcon size="1rem" />
									Delete
								</ContextMenu.Item>
							</>
						)}
					</ContextMenu.Popup>
				</ContextMenu.Positioner>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
}
