# How to use this

  1. In the Claude UI, enable Extended Thinking before sending — this is a complex analytical task and Opus 5's native reasoning produces measurably tighter reviews.
  2. Paste your SDD in full at the bottom (the 1M context window handles most documents in one shot).
  3. If the SDD references a PRD, paste that too — traceability checking improves dramatically with the source requirements visible.

## Prompt

Review the Software Design Document below. Find only gaps, inconsistencies, and DRY violations. Do not comment on what is correct or well-written.

&lt;what_to_find&gt;
Gaps — missing content that a production SDD needs:
- Error-handling strategy, failure modes, and rollback plan
- Security model (authentication, authorization, data protection, threat mitigations)
- Scalability limits and performance targets with numbers
- Deployment topology and operational runbooks
- Monitoring, alerting, and observability strategy
- Data retention, backup, and disaster recovery
- Unstated assumptions (single-tenant vs multi-tenant, synchronous vs asynchronous, expected load, network reliability)

Inconsistencies — contradictions across the document:
- Section A states X, section B states not-X or a different X
- Diagram contradicts text
- Term used with two different meanings
- Number in one place incompatible with number in another

Traceability failures — requirements with no design decision:
- PRD requirements not mapped to a specific design element
- Design decisions with no traceable requirement

Interface gaps — contracts that are referenced but not defined:
- API schemas, data models, event payloads, or message formats mentioned but not specified
- Versioning strategy for external interfaces

DRY violations — repeated instead of referenced:
- Same concept defined in multiple places with different wording
- Requirements restated in the design section instead of referenced with a link or pointer
- Diagrams that repeat text without adding visual information
&lt;/what_to_find&gt;

&lt;output_rules&gt;
- Open with one sentence: the count and severity of issues found.
- Each issue: at most 3 sentences. State what is wrong, where it is, and what the author should do.
- Use plain words. Expand acronyms at first use. Use one name per thing — no synonym rotation. Unpack noun stacks over three words into clauses.
- Point concretely: "Section 3.2, paragraph 2", "Figure 4", or the exact text that is wrong.
- When a component or service name is not self-explanatory, add one clause saying what it does.
- Never drop a caveat or uncertainty. Put them in a final "Caveats / needs your call" line, included only when non-empty.
- Prose for 1-2 items, a list for 3+, a heading only for 3+ sections.
- No padding, no restating this request, no cheerleading, no hedging filler, no commentary on the prompt, no closing offers of help.
&lt;/output_rules&gt;

&lt;document&gt;
[PASTE FULL SDD TEXT HERE — include PRD too if available]
&lt;/document&gt;
