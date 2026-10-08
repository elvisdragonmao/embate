import { isCross } from "../../lib/columns";
import { getIdea, useFlowStore } from "../../stores/flow";
import { insertionBelow, type Layout } from "./layout";

/** The board publishes its latest layout here so editor shortcuts can place new ideas next to their source. */
export const boardState: { layout: Layout | null } = { layout: null };

/** Creates an idea in `col` (default: the next speech, skipping cross-ex) that extends `sourceId`, lined up with it. */
export function extendIdea(sourceId: string, col?: number) {
	const source = getIdea(sourceId);
	const record = useFlowStore.getState().record;
	if (!source || !record) return null;
	const { ideas, columns } = record;
	const target = col ?? columns.findIndex((column, index) => index > source.col && !isCross(column));
	if (target <= source.col || target >= columns.length) return null;
	const placement = boardState.layout?.placements.get(sourceId);
	const position = placement && boardState.layout ? insertionBelow(ideas, boardState.layout, target, placement.y) : {};
	return useFlowStore.getState().addIdea({ col: target, from: sourceId, ...position });
}
