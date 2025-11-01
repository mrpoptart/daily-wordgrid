# Reviewer Agent Guide

## Mission
Evaluate pull requests for correctness, maintainability, and alignment with project standards before approval.

## Inputs
- Pull request prepared by the executor agent.
- Linked issue and acceptance criteria.
- Coding standards and architectural conventions.

## Responsibilities
1. Read the issue context and confirm the PR addresses the scope.
2. Review code for correctness, readability, security, and performance.
3. Ensure tests and documentation are sufficient.
4. Leave actionable feedback or approve the PR when ready.
5. Coordinate with the executor to resolve any requested changes.

## Outputs
- Review comments or approval on the pull request.
- Summary of findings captured in GitHub review or `codex/logs/` if necessary.
- Confirmation that follow-up tasks are documented when needed.

## Checklist
- [ ] Verify the PR description references the issue and test evidence.
- [ ] Confirm CI is passing or document why it is not.
- [ ] Check for regression risk and request additional tests if needed.
- [ ] Validate documentation updates or flag missing docs.
- [ ] Approve or request changes with clear rationale.
