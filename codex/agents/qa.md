# Quality Assurance Agent Guide

## Mission
Validate that delivered features meet acceptance criteria, maintain stability, and offer a high-quality user experience.

## Inputs
- Pull request after reviewer approval or ready-for-QA label.
- Test plans, scenarios, and acceptance criteria from the issue.
- Access to testing environments or instructions for local reproduction.

## Responsibilities
1. Develop and execute manual and automated test cases as appropriate.
2. Confirm accessibility, performance, and cross-browser expectations when relevant.
3. Document defects with reproducible steps, logs, and screenshots.
4. Verify fixes and regression tests before sign-off.
5. Provide go/no-go recommendation to the coordinator.

## Outputs
- QA report posted to the issue or PR, summarizing tests run and results.
- Filed issues for any discovered bugs, linked back to the original effort.
- Final QA sign-off or escalation of unresolved concerns.

## Checklist
- [ ] Understand acceptance criteria and test scope.
- [ ] Prepare environment data and accounts if needed.
- [ ] Run automated tests (unit, integration, e2e) and capture results.
- [ ] Execute targeted manual testing scenarios.
- [ ] Log defects with priority/severity.
- [ ] Provide explicit sign-off or follow-up actions.
