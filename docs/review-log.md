# Review Log — 001 Member Registry

Tags: [test] weak/missing test · [scope] change outside the task · [dep] dependency · [privacy] personal data/secrets
      [rule] business rule wrong · [order] task/test-first order · [process] git/workflow · [ci] CI failure
Auto? = could a script, lint rule, reviewer agent, or CI gate have caught this? (yes / maybe / no)

| Date | Task(s) | Tag | What I found | Action | Auto? |
|---|---|---|---|---|---|

| 2026-10-23 | spec review | [rule] | US1-AS4 referenced FR-027; permissions table is FR-025 (renumbering error) | Fixed reference | yes: FR-reference checker |
| 2026-10-23 | plan review | [rule] | Delete-member conflicted with append-only history (Principle I vs IV) | Plan split history into two sheets | maybe: /speckit-analyze |
| 2026-10-26 | SPIKE-001 | [rule] | Multi-account browsers break sign-in (F1); refresh shows error (F3) | Owner decision; tasks added | no: needs real browsers |
| 2026-10-27 | tasks review | [order] | MVP shipped public form without Admin deletion (analyze I1) | Deletion moved into MVP | yes: /speckit-analyze |
| 2026-10-27 | tasks review | [order] | T012 marked [P] but depends on T011 output | Ran T011 first | yes: [P] dependency checker |
| 2026-10-28 | tasks review | [order] | T046 (implement) listed before T047 (its tests) | Run T047 first | yes: test-before-impl order check |
| 2026-10-27 | — | [process] | Typed commit command inside git diff pager; created stray file | Use --no-pager; press q | maybe: git config core.pager |
| 2026-10-22 | — | [process] | Edited brief on wrong branch (not merged with main) | Check branch before edits | yes: pre-edit hook showing branch |
| 2026-10-29 | T017–T021 | [privacy] | Checked tests use only example.org / 555-01xx | OK | yes: check:fixtures already does this |
| 2026-10-29 | T017–T025 | [test] | "Missing module" red proves nothing; added throwing stubs so each assertion fails individually | Changed 2a prompt | yes: CI check "no test passes against stubs" |
| 2026-10-29 | T017–T021 | [test] | null phone/email keys could falsely match (null === null) — no test | Added FR-012 null-key test | maybe: reviewer-agent checklist "null/empty inputs" |
| 2026-10-29 | T017–T021 | [ci] | CI red by design (tests before implementation) | Expected until 2b | — |
| 2026-10-30 | T022–T025 | [rule] | Deletion design: reason as fixed code in ChangeHistory; delete only for test/spam/mistake; no name kept; audit entry before purge | Spec FR-016/018, data model, tests updated | maybe: reviewer checks "audit write before destructive step" |