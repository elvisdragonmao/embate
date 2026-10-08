import { normalizeRecord, type FlowRecord } from "./record";

const RECORD_PREFIX = "embate:flow:";
const LAST_KEY = "embate:last";

export interface RecordSummary {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	count: number;
}

function read(key: string) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export function loadRecord(id: string): FlowRecord | null {
	const raw = read(RECORD_PREFIX + id);
	if (!raw) return null;
	try {
		const record = normalizeRecord(JSON.parse(raw));
		return record ? { ...record, id } : null;
	} catch {
		return null;
	}
}

export const saveRecord = (record: FlowRecord) => write(RECORD_PREFIX + record.id, JSON.stringify(record));

export function deleteRecord(id: string) {
	try {
		localStorage.removeItem(RECORD_PREFIX + id);
	} catch {
		/* storage unavailable */
	}
}

export function listRecords(): RecordSummary[] {
	const summaries: RecordSummary[] = [];
	let keys: string[] = [];
	try {
		keys = Object.keys(localStorage).filter(key => key.startsWith(RECORD_PREFIX));
	} catch {
		return [];
	}
	for (const key of keys) {
		const record = loadRecord(key.slice(RECORD_PREFIX.length));
		if (record) summaries.push({ id: record.id, title: record.title, createdAt: record.createdAt, updatedAt: record.updatedAt, count: record.ideas.length });
	}
	return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getLastId = () => read(LAST_KEY);
export const setLastId = (id: string) => write(LAST_KEY, id);
