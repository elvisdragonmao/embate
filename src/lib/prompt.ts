import { arrangeColumns, flipColumns, speechColumns, type Column } from "./columns";
import { FORMATS } from "./formats";
import { IDEA_COLORS } from "./record";

/** `AC:aff` for a speech, `[CF1]` for a crossfire or cross-examination column. */
const notation = (columns: Column[]) => columns.map(column => (column.side ? `${column.label}:${column.side}` : `[${column.label}]`)).join(" ");

/** Every format's columns, with cross-ex in place, so the prompt follows the formats as they change. */
function layouts() {
	return FORMATS.map(format => {
		const { columns } = arrangeColumns(format, speechColumns(format), !!format.crossEx, []);
		const line = `- \`${format.id}\` ${format.name} (${format.sideNames.aff} / ${format.sideNames.neg}): ${notation(columns)}`;
		return format.eitherFirst ? `${line}\n  If the neg spoke first: ${notation(flipColumns(format, columns, true))}` : line;
	}).join("\n");
}

const EXAMPLE = `{
  "app": "embate",
  "version": 1,
  "format": "pf",
  "title": "Phones in schools · Lincoln AB v Roosevelt CD",
  "note": "**Resolved:** Public high schools should ban student cell phone use during the school day.\\n\\n### Decision\\n\\n- **Pro**: learning is the only causal impact left standing.",
  "columns": [
    { "label": "AC", "side": "aff" },
    { "label": "NC", "side": "neg" },
    { "label": "AR", "side": "aff" },
    { "label": "NR", "side": "neg" },
    { "label": "AS", "side": "aff" },
    { "label": "NS", "side": "neg" },
    { "label": "AFF", "side": "aff" },
    { "label": "NFF", "side": "neg" }
  ],
  "ideas": [
    { "id": "ac1", "col": 0, "parent": null, "from": null, "text": "**C1 Learning**: phones = #1 distraction", "color": "green" },
    { "id": "ac1a", "col": 0, "parent": "ac1", "from": null, "text": "*Beland & Murphy '16*: bans → scores **+6.4% SD**", "color": null },
    { "id": "nc1", "col": 1, "parent": null, "from": null, "text": "**C1 Safety**: lockdowns → phone = only line to family", "color": "yellow" },
    { "id": "ar1", "col": 2, "parent": null, "from": "nc1", "text": "**Turn**: light & noise give away location", "color": "yellow" },
    { "id": "nr1", "col": 3, "parent": null, "from": "ac1", "text": "NU: teachers already confiscate", "color": null },
    { "id": "as1", "col": 4, "parent": null, "from": "ac1", "text": "ext **C1**: NU ≠ enforcement", "color": "green" }
  ]
}`;

/** A prompt that has an AI chat turn a round's transcript into a flow file that Open → Upload accepts. */
export function transcriptPrompt() {
	return `You're helping a debate judge flow a round in embate (https://debate.emtech.cc), a flowing app for debate judges. Turn the transcript at the end of this message into an embate flow file.

Reply with the JSON only: one \`\`\`json code block, or a downloadable .json file if you can make files. It must be valid JSON, with no comments or trailing commas. The judge will save it as a .json file and open it with Open → Upload.

## Example

\`\`\`json
${EXAMPLE}
\`\`\`

## Fields

- \`format\`: the id of the round's format, from the list below.
- \`title\`: a short name for the round, such as the topic and the teams.
- \`note\`: Markdown for the sidebar: the resolution, the teams, and the decision and its reasons if the transcript gives them.
- \`columns\`: the format's columns from the list below, in that order. An idea's \`col\` is an index into this array, starting at 0.
- \`ideas\`: the flow, in the order things were said. Each one is a short flow note, not a full sentence, written in the transcript's language.
  - \`id\`: a unique short string.
  - \`col\`: the column of the speech it was said in.
  - \`parent\`: the id of the point in the same column it sits under, such as a card or warrant under its tagline; otherwise null. List sub-points right after their parent.
  - \`from\`: the id of the point in an earlier column that this one answers or extends; otherwise null. Link every response to what it answers and every extension to what it extends, so the arrows show the clash.
  - \`text\`: Markdown. **Bold** taglines, *italic* authors and cards, ~~strike~~ for kicked or conceded arguments, → for causal chains.
  - \`color\`: null, or one of ${IDEA_COLORS.join(", ")}. Use them sparingly: green for voters, yellow for the main clash, red for dropped arguments, blue for framing, mauve for weighing.

Write down only what the debaters said; don't add arguments of your own. Leave a column empty if its speech isn't in the transcript.

## Formats

Each format lists its id, name and team names, then its columns in speaking order. \`aff\` is the team for the motion (Pro, Gov, Prop, 正方) and \`neg\` the team against it (Con, Opp, 反方). \`AC:aff\` stands for { "label": "AC", "side": "aff" }. Bracketed columns such as \`[CF1]\` are crossfire or cross-examination and stand for { "label": "CF1", "side": null }: include all of them, where they're listed, if the transcript has crossfire or cross-examination worth flowing; otherwise leave them all out.

${layouts()}

## Transcript

`;
}
