import type { CellEditor } from "./cellEditor";

let loaded: CellEditor | null = null;
let loading: Promise<CellEditor> | null = null;

/** Loads the shared idea editor (Milkdown and its key handling) in its own chunk, off the first paint. */
export function loadCellEditor() {
	loading ??= Promise.all([import("./cellEditor"), import("./cellKeys")]).then(([module]) => (loaded = module.cellEditor));
	return loading;
}

/** The editor if it has already loaded, so moving it between ideas stays synchronous. */
export const loadedCellEditor = () => loaded;
