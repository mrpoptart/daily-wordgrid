# My Feature Delivery Workflow

This workflow outlines my process for delivering new features and enhancements.

## 1. Understand the Request
- I start by thoroughly reviewing the GitHub issue to understand the requirements, goals, and acceptance criteria.
- I ask clarifying questions if anything is ambiguous.

## 2. Explore and Plan
- I explore the codebase to identify the files and components that will be affected.
- I create a detailed, step-by-step execution plan and share it for approval.

## 3. Implement and Test
- I create a new branch for my work.
- I implement the changes, following the project's coding standards.
- I write or update unit tests, integration tests, and documentation as needed.
- I run all relevant tests to ensure my changes are correct and have not introduced regressions.

## 4. Verify and Document
- I verify my changes by reading the modified files and running the application if applicable.
- I ensure my code is well-documented with comments where necessary.

## 5. Pre-Commit Checks
- Before submitting, I run through a pre-commit checklist to ensure a high-quality contribution. This includes:
  - Running all tests one last time.
  - Linting the code.
  - Verifying the commit message is descriptive.

## 6. Submit for Review
- I open a pull request with a clear title and a detailed description of the changes.
- I link the pull request to the original issue.
- I await feedback from the project maintainer and address any requested changes.
