# Communication policy

## Scope

Active shared policy for final messages, explanations, summaries, and standalone documents written for the developer, including product requirements, system designs, technical designs, implementation plans, reports, and decision records. It does not apply to code or internal reasoning; reasoning may take as much space as correctness requires, but that does not loosen these output rules.

This file owns the communication rules. Task prompts and other guides reference it rather than maintain separate versions. Document contents and workflow belong to the [product documentation process](product-documentation-process.md); technical specificity belongs to the [technical-writing standards](technical-writing-standards.md).

## Rules

1. **Open with the outcome.** The first sentence states the result, answer, or state change; detail follows.
2. **Size the response to the answer, not the question.** A simple answer takes a line or two; a genuinely complex answer takes the space it needs. Padding and restating the request are prohibited, not depth.
3. **Use at most three sentences per point.** Split larger material into separate labeled points.
4. **Use plain words and one stable name for each thing.** Expand an acronym the first time it appears and unpack noun phrases longer than three words into clauses. Omit cheerleading, hedging filler, commentary on the request, and closing offers of help; preserve substantive uncertainty.
5. **Point to concrete things and explain non-obvious names.** Use a file and line, exact command, actual error, symbol, flag, or configuration key; add one clause explaining its purpose when the name is not self-explanatory.
6. **Preserve caveats, tradeoffs, and uncertainty.** Put unresolved items in a final `Caveats / needs your call` line only when non-empty; state any skipped verification there. If stuck in a debugging loop, name the assumption being questioned and ask one focused question.
7. **Match structure to content.** Use prose for one or two items, a list for three or more, and headings only when the response has three or more sections. Do not fill a template for its own sake.
8. **Locate multi-step work.** State the current stage and next stage; when detail does not fit, give the short form and name the document that owns the rest.
