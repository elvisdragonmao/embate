import { getIdea, lastColumn, useFlowStore } from "../../stores/flow";
import { insertionBelow, type Layout } from "./layout";

/** The board publishes its latest layout here so editor shortcuts can place new ideas next to their source. */
export const boardState: { layout: Layout | null } = { layout: null };

/** Creates an idea in `col` (default: the next speech) that extends `sourceId`, lined up with it. */
export function extendIdea(sourceId: string, col?: number) {
	const source = getIdea(sourceId);
	const ideas = useFlowStore.getState().record?.ideas;
	if (!source || !ideas) return null;
	const target = col ?? source.col + 1;
	if (target <= source.col || target > lastColumn) return null;
	const placement = boardState.layout?.placements.get(sourceId);
	const position = placement && boardState.layout ? insertionBelow(ideas, boardState.layout, target, placement.y) : {};
	return useFlowStore.getState().addIdea({ col: target, from: sourceId, ...position });
}
