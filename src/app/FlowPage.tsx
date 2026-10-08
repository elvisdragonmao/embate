import { useEffect, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Board } from "../features/board/Board";
import { Sidebar } from "../features/sidebar/Sidebar";
import { createDemoRecord, DEMO_ID } from "../lib/demo";
import { loadRecord, saveRecord } from "../lib/storage";
import { useFlowStore } from "../stores/flow";
import { useUIStore } from "../stores/ui";
import styles from "./FlowPage.module.css";
import { useHotkeys } from "./useHotkeys";

const DEFAULT_TITLE = "embate · Debate flow for judges";

export function FlowPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const loadedId = useFlowStore(state => state.record?.id);
	const title = useFlowStore(state => state.record?.title.trim());

	useLayoutEffect(() => {
		if (!id || useFlowStore.getState().record?.id === id) return;
		let record = loadRecord(id);
		// The demo link works for anyone, even before they have opened it from the menu.
		if (!record && id === DEMO_ID) {
			record = createDemoRecord();
			saveRecord(record);
		}
		if (!record) {
			navigate("/", { replace: true });
			return;
		}
		useUIStore.getState().stopEditing();
		useFlowStore.getState().load(record);
	}, [id, navigate]);

	useHotkeys();

	// Named rounds show up in the tab; unnamed ones keep the site title.
	useEffect(() => {
		document.title = title ? `${title} · embate` : DEFAULT_TITLE;
	}, [title]);

	if (!id || loadedId !== id) return null;

	return (
		<div className={styles.workspace}>
			<Sidebar />
			<Board key={id} />
		</div>
	);
}
