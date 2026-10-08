import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimerMode = "countdown" | "stopwatch";

interface TimerState {
	mode: TimerMode;
	/** Speech length in ms. Countdown counts down from it; stopwatch measures progress against it. */
	duration: number;
	/** Time accumulated before the current run, in ms. */
	elapsed: number;
	/** Wall-clock start of the current run, or null when paused. */
	startedAt: number | null;
	toggle: () => void;
	reset: () => void;
	setDuration: (ms: number) => void;
	quickStart: (ms: number) => void;
	toggleMode: () => void;
}

export const elapsedOf = (state: Pick<TimerState, "elapsed" | "startedAt">, now = Date.now()) => state.elapsed + (state.startedAt === null ? 0 : now - state.startedAt);

export const useTimerStore = create<TimerState>()(
	persist(
		(set, get) => ({
			mode: "countdown",
			duration: 4 * 60 * 1000,
			elapsed: 0,
			startedAt: null,
			toggle: () => {
				const state = get();
				if (state.startedAt === null) set({ startedAt: Date.now() });
				else set({ elapsed: elapsedOf(state), startedAt: null });
			},
			reset: () => set({ elapsed: 0, startedAt: null }),
			setDuration: duration => set({ duration, elapsed: 0, startedAt: null }),
			quickStart: duration => set({ duration, elapsed: 0, startedAt: Date.now() }),
			toggleMode: () => set({ mode: get().mode === "countdown" ? "stopwatch" : "countdown" })
		}),
		{
			name: "embate:timer",
			partialize: ({ mode, duration, elapsed, startedAt }) => ({ mode, duration, elapsed, startedAt })
		}
	)
);
