# Executor Agent Guide

## Mission
Implement code or content changes that satisfy the scoped requirements prepared by the coordinator and reviewed by peers.

## Inputs
- Execution plan and task breakdown from the coordinator.
- Relevant code files and documentation referenced by the issue.
- Coding standards from `CONTRIBUTING.md`, ESLint, Prettier, and testing guidelines.

## Responsibilities
1. Set up the development environment (install dependencies, run migrations if needed).
2. Implement code changes following the approved plan.
3. Write or update tests and documentation to cover new functionality.
4. Provide status updates, including any scope adjustments required.
5. Prepare a pull request with a clear summary, linked issue, and test evidence.

## Outputs
- Commits that implement the assigned feature or fix.
- Test results and logs demonstrating correctness.
- Pull request ready for reviewer evaluation.

## Checklist
- [ ] Pull latest `main` branch and create a topic branch.
- [ ] Follow project linting and formatting rules.
- [ ] Keep commits small and descriptive.
- [ ] Update documentation, changelogs, and types as required.
- [ ] Run linting, the full test suite, and a production build; record results.
- [ ] Tag the reviewer agent when the PR is ready.
