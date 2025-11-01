# Feature Delivery Workflow

Use this workflow when implementing a new feature or substantial enhancement driven by a GitHub issue.

## 1. Intake (Coordinator)
- Review the issue description and confirm acceptance criteria.
- Identify stakeholders and dependencies.
- Draft a short execution plan (scope, tasks, owners, timeline) and share it in the issue.

## 2. Planning Hand-off (Coordinator → Executor)
- Ensure the executor has the plan, relevant context, and environment notes.
- Confirm code areas to touch and testing expectations.
- Set the expected branch name and due date.

## 3. Implementation (Executor)
- Create a feature branch from `main` and implement changes.
- Write or update automated tests and documentation.
- Run linting and test commands locally, noting results in the PR description.
- Open a pull request referencing the issue once ready for review.

## 4. Review (Reviewer)
- Read the issue and PR summary; confirm scope and design.
- Review code changes, tests, and docs.
- Request changes or approve. Document findings and unresolved risks.

## 5. Quality Assurance (QA Agent)
- Execute targeted manual and automated testing.
- Provide a QA report summarizing scenarios, results, and any defects.
- Coordinate with the executor on fixes; rerun tests until clean.

## 6. Merge and Close (Coordinator)
- Verify all review comments resolved and QA sign-off complete.
- Ensure the PR adheres to merge standards (CI passing, labels set).
- Merge or signal the maintainer to merge.
- Update the issue with a final summary and close it.

## Optional Extensions
- For hotfixes, adapt steps to fast-track review while preserving QA checks.
- For research spikes, swap implementation steps with exploration notes and decision logs.
