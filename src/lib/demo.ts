import { createId } from "./id";
import { createRecord, type FlowRecord, type IdeaColor } from "./record";

/** The demo always lives under this id, so opening it again returns to the same flow. */
export const DEMO_ID = "demo";

interface DemoIdea {
	key: string;
	col: number;
	text: string;
	parent?: string;
	from?: string;
	color?: IdeaColor;
}

const [AC, NC, AR, NR, AS, NS, AFF, NFF] = [0, 1, 2, 3, 4, 5, 6, 7];

/** A Public Forum round written to show off the flow: sub-points, extensions across speeches, colors and markdown. */
const IDEAS: DemoIdea[] = [
	{ key: "ac1", col: AC, text: "**C1 Learning**\\\nphones = #1 distraction", color: "green" },
	{ key: "ac1a", col: AC, parent: "ac1", text: "*Beland & Murphy '16*: bans → scores **+6.4% SD**" },
	{ key: "ac1b", col: AC, parent: "ac1", text: "biggest gains for low achievers" },
	{ key: "ac2", col: AC, text: "**C2 Mental health**" },
	{ key: "ac2a", col: AC, parent: "ac2", text: "*Haidt '24*: teen depression ↑ w/ smartphones" },
	{ key: "ac2b", col: AC, parent: "ac2", text: "7 phone-free hrs → less comparison" },
	{ key: "ac3", col: AC, text: "**Framing**: school = learning → prefer edu impacts", color: "blue" },

	{ key: "nc1", col: NC, text: "**C1 Safety**", color: "yellow" },
	{ key: "nc1a", col: NC, parent: "nc1", text: "lockdowns: phone = only line to family" },
	{ key: "nc1b", col: NC, parent: "nc1", text: "pickups, meds, custody" },
	{ key: "nc2", col: NC, text: "**C2 Bans fail**" },
	{ key: "nc2a", col: NC, parent: "nc2", text: "*Goodyear '25* (Lancet): no wellbeing *or* grade diff" },
	{ key: "nc2b", col: NC, parent: "nc2", text: "use shifts after school" },
	{ key: "nc3", col: NC, text: "**C3 Equity**: low-income = phone-only internet" },

	{ key: "ar1", col: AR, from: "nc1", text: "**Turn**: light & noise give away location", color: "yellow" },
	{ key: "ar1a", col: AR, parent: "ar1", text: "office lines + teachers handle it" },
	{ key: "ar2", col: AR, from: "nc2", text: "Goodyear = correlational, 30 schools" },
	{ key: "ar2a", col: AR, parent: "ar2", text: "doesn't touch C1 — B&M causal" },
	{ key: "ar3", col: AR, from: "nc3", text: "school hrs only → 1:1 devices" },

	{ key: "nr1", col: NR, from: "ac1", text: "**NU**: teachers already confiscate" },
	{ key: "nr1a", col: NR, parent: "nr1", text: "B&M = UK 2001–11, pre-TikTok" },
	{ key: "nr3", col: NR, from: "ar1", text: "frontline: phones = info + reunification" },
	{ key: "nr2", col: NR, from: "ac2", text: "*Odgers '24* (Nature): correlation ≠ causation" },

	{ key: "as1", col: AS, from: "ac1", text: "ext **C1**: NU ≠ enforcement", color: "green" },
	{ key: "as2", col: AS, from: "ar1", text: "ext turn: drills say *silence*" },
	{ key: "as3", col: AS, from: "ac2", text: "~~C2~~ collapsing" },

	{ key: "ns1", col: NS, from: "nc2", text: "ext Goodyear: no grade impact", color: "yellow" },
	{ key: "ns1a", col: NS, parent: "ns1", text: "→ answers C1" },
	{ key: "ns2", col: NS, from: "nr3", text: "ext safety: reunification > scores" },
	{ key: "ns3", col: NS, from: "nc3", text: "aff dropped **equity**", color: "red" },

	{ key: "aff1", col: AFF, from: "as1", text: "**Weigh**: every student, every day > rare emergency", color: "green" },
	{ key: "aff2", col: AFF, from: "as2", text: "turn conceded" },

	{ key: "nff1", col: NFF, from: "ns2", text: "**Weigh**: magnitude — lives > test points", color: "mauve" },
	{ key: "nff2", col: NFF, from: "ns1", text: "Goodyear unanswered" },
	{ key: "nff3", col: NFF, from: "ns3", text: "equity conceded", color: "red" }
];

const NOTE = `**Resolved:** Public high schools in the United States should ban student cell phone use during the school day.

Pro *Lincoln AB* · Con *Roosevelt CD*

### Decision

- **Pro.** Learning is the only causal impact left standing.
- Con's safety story is real but low-probability, and the lockdown turn went mostly unanswered.
- ~~Mental health~~ was kicked, so Goodyear only answers half the round.

Colors: green voter · yellow clash · red dropped · blue framing · mauve weighing`;

export function createDemoRecord(): FlowRecord {
	const record = createRecord("pf");
	const ids = new Map(IDEAS.map(idea => [idea.key, createId()]));
	return {
		...record,
		id: DEMO_ID,
		title: "Demo · Phones in Schools",
		note: NOTE,
		prep: {
			aff: { duration: 120_000, elapsed: 75_000, startedAt: null },
			neg: { duration: 120_000, elapsed: 110_000, startedAt: null }
		},
		ideas: IDEAS.map(idea => ({
			id: ids.get(idea.key)!,
			col: idea.col,
			parent: idea.parent ? ids.get(idea.parent)! : null,
			from: idea.from ? ids.get(idea.from)! : null,
			text: idea.text,
			color: idea.color ?? null
		}))
	};
}
