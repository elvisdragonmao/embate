import { Navigate } from "react-router";
import { createRecord } from "../lib/record";
import { getLastId, loadRecord, saveRecord, setLastId } from "../lib/storage";

/** Reopens the last flow, or starts a new one. Idempotent, so double renders reuse the same record. */
function resolveTarget() {
	const last = getLastId();
	if (last && loadRecord(last)) return last;
	const record = createRecord();
	saveRecord(record);
	setLastId(record.id);
	return record.id;
}

export function Home() {
	return <Navigate to={`/f/${resolveTarget()}`} replace />;
}
