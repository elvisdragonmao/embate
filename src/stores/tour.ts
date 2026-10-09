import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteRecord } from "../lib/storage";
import { TOUR_ID } from "../lib/tour";
import { useFlowStore } from "./flow";

interface TourState {
	/** The step on screen, or null when the tour isn't running. */
	step: number | null;
	/** The flow the tour started from, to go back to when it ends. */
	returnTo: string | null;
	start: (returnTo: string | null) => void;
	go: (step: number) => void;
	end: () => void;
}

export const useTourStore = create<TourState>()(
	persist(
		set => ({
			step: null,
			returnTo: null,
			start: returnTo => set({ step: 0, returnTo }),
			go: step => set({ step }),
			end: () => set({ step: null, returnTo: null })
		}),
		// A reload, or coming back later, picks the tour up where it was left.
		{ name: "embate:tour", partialize: ({ step, returnTo }) => ({ step, returnTo }) }
	)
);

// The practice round only exists for the tour: leaving it, by finishing or by opening another flow, ends the tour and
// throws the round away. This runs after the switch has flushed the round's last autosave, so nothing writes it back.
useFlowStore.subscribe((state, previous) => {
	if (previous.record?.id !== TOUR_ID || state.record?.id === TOUR_ID) return;
	deleteRecord(TOUR_ID);
	if (useTourStore.getState().step !== null) useTourStore.getState().end();
});
