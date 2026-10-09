import { useNavigate } from "react-router";
import { createRecord } from "../../lib/record";
import { loadRecord, saveRecord } from "../../lib/storage";
import { createTourRecord, TOUR_ID } from "../../lib/tour";
import { useFlowStore } from "../../stores/flow";
import { useTourStore } from "../../stores/tour";

/** Opens a fresh practice round and starts the tour on it; from inside the round, the tour starts over as the round stands. */
export function useStartTour() {
	const navigate = useNavigate();
	return () => {
		const current = useFlowStore.getState().record?.id ?? null;
		if (current === TOUR_ID) {
			useTourStore.getState().start(useTourStore.getState().returnTo);
			return;
		}
		saveRecord(createTourRecord());
		useTourStore.getState().start(current);
		navigate(`/f/${TOUR_ID}`);
	};
}

/** Ends the tour and goes back to the flow it started from, or to a new one if that flow is gone. */
export function useEndTour() {
	const navigate = useNavigate();
	return () => {
		const { returnTo } = useTourStore.getState();
		useTourStore.getState().end();
		let target = returnTo && loadRecord(returnTo) ? returnTo : null;
		if (!target) {
			const record = createRecord();
			saveRecord(record);
			target = record.id;
		}
		// The practice round leaves history too, so Back doesn't reopen it.
		navigate(`/f/${target}`, { replace: true });
	};
}
