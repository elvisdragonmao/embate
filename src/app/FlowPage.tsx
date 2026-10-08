import { useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Board } from "../features/board/Board";
import { Sidebar } from "../features/sidebar/Sidebar";
import { loadRecord } from "../lib/storage";
import { useFlowStore } from "../stores/flow";
import { useUIStore } from "../stores/ui";
import styles from "./FlowPage.module.css";
import { useHotkeys } from "./useHotkeys";

export function FlowPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const loadedId = useFlowStore(state => state.record?.id);

	useLayoutEffect(() => {
		if (!id || useFlowStore.getState().record?.id === id) return;
		const record = loadRecord(id);
		if (!record) {
			navigate("/", { replace: true });
			return;
		}
		useUIStore.getState().stopEditing();
		useFlowStore.getState().load(record);
	}, [id, navigate]);

	useHotkeys();

	if (!id || loadedId !== id) return null;

	return (
		<div className={styles.workspace}>
			<Sidebar />
			<Board key={id} />
		</div>
	);
}
