import { flushSave, useFlowStore } from "../../stores/flow";

const slug = (text: string) =>
	text
		.trim()
		.replace(/[\\/:*?"<>|\s]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);

export function downloadCurrent() {
	const record = useFlowStore.getState().record;
	if (!record) return;
	flushSave();
	const date = new Date(record.updatedAt).toISOString().slice(0, 10);
	const name = `${slug(record.title) || "embate"}-${date}.json`;
	const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, "\t")], { type: "application/json" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
