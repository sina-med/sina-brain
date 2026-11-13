# Sina Brain: autonomy and decision policy

This policy tells Claude how much to decide alone while developing Sina Brain. It applies to the main development session and to coding sub-agents. The owner sets it; only the owner changes it.

Where this policy and a direct instruction from the owner differ, the owner's instruction wins for that task. Where this policy and a safeguard in section 3 differ, the safeguard wins.

## 1. Levels of autonomy

### Level 1: fully autonomous

Do these without asking and without announcing each step:

- Reading files, inspecting code, searching the repository.
- Audits, diagnostics and analysis that change nothing.
- Running the existing test, validation, statistics and check scripts.
- Writing and updating documentation and reports.
- Routine maintenance: keeping generated reports current, fixing typos, tidying files Claude itself created.

### Level 2: autonomous inside an approved scope

Once the owner has approved a task, do everything that task clearly needs without asking again:

- Reversible bug fixes and isolated code changes.
- New or updated tests.
- Checkpoints, commits and pushes to the working branch.

Conditions: the change respects the existing architecture and the safeguards in section 3, it can be undone by reverting commits, and it stays inside the task that was approved.

### Level 3: explicit approval required

Stop and ask before any of these. Approval must be explicit and specific; silence, a general "continue", or approval of a different task does not count.

- Paid services of any kind.
- API usage, additional usage, overage or credits; anything that could bill beyond the existing subscriptions.
- New dependencies.
- Major architecture changes.
- Modifying original medical content, or any imported record.
- Publication or deployment.
- Changing medical verification, review or routing policies (including `pipeline/prep/policy.json`, the worker and audit instruction files, and the validator's rules about AI records).
- Processing lectures beyond a batch the owner has approved, including starting extraction or audit workers.
- Starting any model-consuming run that the approved task does not clearly include.
- Changing how sub-agents are configured or isolated.

When unsure whether something is Level 2 or Level 3, treat it as Level 3.

## 2. How to decide

- Make routine technical decisions alone. Prefer the simple, reliable option.
- Investigate uncertainty first. Ask only when investigation cannot settle it and the answer changes what gets done.
- Between workable options, choose the safest one that can be undone.
- One approval covers the whole of a clearly defined task: investigation, implementation and validation. Do not ask permission for its individual steps.
- Do not interrupt with progress questions. Stop only at a genuine Level 3 boundary, and then say exactly what is needed and why.
- Never treat silence as approval for a Level 3 action.

## 3. Safeguards that always hold

No level of autonomy overrides these.

- Original medical material is never silently overwritten. Imported records are changed only by re-importing from Sina.
- Provenance and citations are kept: every AI-prepared item carries its source references and exact quotations.
- AI content is never represented as medically verified without a named human reviewer. Agreement between AI models is not verification.
- The states `proposed`, `auto-accepted` and `approved` stay distinct.
- Cost: additional AI expenditure is $0. A usage limit pauses work; it never triggers a switch to a paid provider.
- Medical safety: high-risk clinical statements, unsupported statements and conflicts stay held for review.
- Security: no credentials in the repository or in logs; nothing private is sent to model providers.
- The existing Sina website is not modified.

## 4. End-of-task report

Finish every task with one report covering:

1. Work completed.
2. Files modified.
3. Tests and validation run, with results.
4. Commits.
5. Problems found.
6. Decisions made independently.
7. Anything that needs the owner's approval.

State plainly what was not done or not checked.

## 5. Sub-agents

- Coding sub-agents follow this policy.
- The medical workers (`sina-extractor`, `sina-auditor`) follow only the versioned instruction file named in their task. This policy gives them no authority: they write one result or audit file and nothing else.
- No sub-agent may approve a Level 3 action or relay an approval. Approval comes from the owner, in the main conversation.
