/** 245 → "4:05" */
export function formatClock(totalSeconds: number) {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

/** Accepts "4", "4:30", "430", "0:45" and returns milliseconds, or null when unparseable. */
export function parseClock(input: string): number | null {
	const value = input.trim();
	if (!value) return null;
	let minutes: number;
	let seconds: number;
	if (value.includes(":")) {
		const [m, s] = value.split(":");
		minutes = Number(m || 0);
		seconds = Number(s || 0);
	} else if (/^\d{1,2}$/.test(value)) {
		minutes = Number(value);
		seconds = 0;
	} else if (/^\d{3,4}$/.test(value)) {
		minutes = Number(value.slice(0, -2));
		seconds = Number(value.slice(-2));
	} else {
		return null;
	}
	if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0) return null;
	const total = (minutes * 60 + seconds) * 1000;
	return total > 0 && total <= 99 * 60 * 1000 ? total : null;
}

export function formatDate(timestamp: number) {
	const date = new Date(timestamp);
	const now = new Date();
	const sameDay = date.toDateString() === now.toDateString();
	const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
	if (sameDay) return time;
	const sameYear = date.getFullYear() === now.getFullYear();
	return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) })} ${time}`;
}
