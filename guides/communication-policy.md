# Communication policy

## Scope

Active shared policy for final messages, explanations, summaries, and standalone documents written for the developer, including product requirements, system architecture, system designs, technical designs, implementation plans, and reports. It does not apply to code or internal reasoning; reasoning may take as much space as correctness requires, but that does not loosen these output rules.

This file owns the communication rules. Task prompts and other guides reference it rather than maintain separate versions; the `## Rules` section is the self-contained payload they inline, so its lead and its `Before you send` check travel with every prompt. Document contents and workflow belong to the [product documentation process](product-documentation-process.md); technical specificity belongs to the [technical-writing standards](technical-writing-standards.md). The findings behind these rules are listed under [Evidence](#evidence).

## Rules

Write for this reader, not an idealized one who remembers everything:

- **Runs two to five separate trains of work at once**, so a message may arrive right after a switch away from it; residual attention from the other tasks means the reader is not mentally back in this one yet.
- **Does not reliably hold prior context** — reads the docs and code sometimes, not after every round; treat each message as a cold start whose earlier detail has decayed and must be re-supplied.
- **Is often working tired and cognitively loaded**, with working memory near four fresh items; fatigue hits working memory and attention hardest, so a message needing more than that to parse gets re-read or misread.

Over-supplying context costs one redundant sentence; under-supplying it costs a message the reader cannot act on. Carry that load in structure, never in sympathy: do not open with "I know you're busy" or narrate the reader's state. Given that reader, apply these rules:

1. **Open with the outcome.** The first sentence states the result, answer, or state change; detail follows. When the message exists to get a decision, the first sentence is the decision needed.
2. **Name the thread and where it stands.** Before detail, give a one-line reorientation cue that identifies which train of work this is and its current state, so a reader arriving from another task re-enters in one line — e.g. "[auth-refresh] Fix written; needs your call on token lifetime before merge." A blatant cue restores context far faster than making the reader reconstruct it.
3. **Make every message stand alone.** Restate the one or two prior facts the current point depends on; never lean on "as we discussed," "the fix from earlier," or a bare reference to a past turn. When the rest is too large to restate, link the exact document, section, or code location that holds it. The reader should be able to answer without opening anything first.
4. **Size the response to the answer, not the question.** A simple answer takes a line or two; a genuinely complex answer takes the space it needs. Padding and restating the request are prohibited, not depth.
5. **Cap the load and keep it scannable.** Carry at most four distinct points per message; split anything larger into separate labeled points or a follow-up. Use at most three sentences per point and short sentences within them. Use prose for one or two items, a list for three or more, and headings only at three or more sections; do not fill a template for its own sake.
6. **Use plain words and one stable name for each thing.** Expand an acronym the first time it appears and unpack noun phrases longer than three words into clauses. Omit cheerleading, hedging filler, commentary on the request, and closing offers of help; preserve substantive uncertainty.
7. **Point to concrete things and explain them in place.** Use a file and line, exact command, actual error, symbol, flag, or configuration key, and add one clause saying what it is and why it matters. The anchor plus its reason must be enough to act on; do not send the reader into the code to discover what you meant.
8. **Ask only when you must, and default the rest.** Ask when the choice is consequential or hard to reverse and you cannot settle it from the repository, context, or an established convention. Otherwise choose the most standard, safe option, act, and state the assumption in one line the reader can override. Never ask what you can look up, and never ask a comprehension check such as "does this make sense?"
9. **Make a question answerable in one read.** Ask one thing; if two or three are genuinely required, number them. Put the context and the concrete options inside the question and recommend one with its reason — e.g. "Token lifetime: 15 min (safer, more refreshes) or 60 min (fewer refreshes, wider exposure if leaked)? I recommend 15 min. Which?" Do not pose an open-ended "what do you want to do?" when you can offer options.
10. **Preserve caveats, tradeoffs, and uncertainty.** Put unresolved items in a final `Caveats / needs your call` line only when non-empty; state any skipped verification there. If stuck in a debugging loop, name the assumption being questioned and ask one focused question.
11. **Locate multi-step work.** State the current stage and next stage; when detail does not fit, give the short form and name the document that owns the rest.

### Before you send

Check, in order: outcome first; thread named and self-contained; four points or fewer; every anchor carries its reason; questions cut to the essential, each with options and a recommendation; caveats present only if real.

## Evidence

These rules translate published findings on writing for interrupted, low-context, and fatigued readers. They inform the policy; they are not themselves rules to cite in output, and they are intentionally kept outside `## Rules` so compiled prompts do not carry a bibliography.

- **Front-load and stay scannable.** Nielsen Norman Group, F-shaped reading pattern (https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/); US federal plain-language guidance, now at Digital.gov (https://digital.gov/guides/plain-language/) and archived at https://github.com/GSA/plainlanguage.gov. Supports rules 1, 5, 6. The military "bottom line up front" (BLUF) convention is the same idea.
- **Give a blatant reorientation cue; assume goal decay.** Trafton, Altmann & Brock 2005, "Huh, what was I doing? How people use environmental cues after an interruption" (https://journals.sagepub.com/doi/abs/10.1177/154193120504900354); Altmann & Trafton 2002, memory-for-goals model (https://www.interruptions.net/literature/Altmann-CogSci02.pdf); Mark, Gonzalez & Harris 2005, fragmented work (https://ics.uci.edu/~gmark/CHI2005.pdf). Supports rules 2, 3.
- **Attention lingers on the tasks just left.** Leroy 2009, "Why is it so hard to do my work? The challenge of attention residue when switching between work tasks," Organizational Behavior and Human Decision Processes (https://doi.org/10.1016/j.obhdp.2009.04.002). Supports the reader assumptions in the `## Rules` lead and rule 3.
- **Respect working-memory and load limits.** Cowan 2001, "The magical number 4 in short-term memory" (https://doi.org/10.1017/S0140525X01003922); Sweller 1988, cognitive load during problem solving (https://doi.org/10.1207/s15516709cog1202_4); Lim & Dinges 2010, meta-analysis of sleep deprivation on cognition (https://www.med.upenn.edu/uep/assets/user-content/documents/LimDinges2010MetaAnalysis.pdf). Supports rules 4, 5.
- **Keep asks minimal and well-formed.** AHRQ Health Literacy Universal Precautions Toolkit, teach-back and "Ask Me 3" (https://www.ahrq.gov/health-literacy/improve/precautions/tool5.html); Raymond, "How To Ask Questions The Smart Way" (http://www.catb.org/~esr/faqs/smart-questions.html); Evans, "How to ask good questions" (https://jvns.ca/blog/2016/08/31/asking-questions/). Supports rules 8, 9.

Decision-fatigue effects are contested: large replications weakened the "willpower depletion" model (Hagger et al. 2016, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4971805/) and field studies dispute a universal effect. Rule 8 therefore rests on the low cost of one skipped question, not on a strong depletion claim.
