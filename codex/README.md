# Codex Agent Collaboration Hub

This directory defines how Codex agents should collaborate on the Daily Wordgrid project. It provides roles, workflows, and shared resources so that multiple agents can work together on GitHub issues in a coordinated way.

## Core Idea

1. **Start with an issue** – Every effort begins with an open GitHub issue. The coordinator agent collects requirements and scopes the work.
2. **Run the workflow** – The coordinator assigns work to the executor, reviewer, and QA agents according to the workflow documents in this folder.
3. **Produce artifacts** – Each agent leaves notes in the `codex/logs/` directory (created as needed) or in GitHub comments summarizing their actions and decisions.
4. **Close the loop** – The coordinator verifies that review and QA feedback are addressed, finalizes the pull request, and closes the issue when acceptance criteria are met.

## Directory Layout

- `agents/` – Individual role guides with responsibilities, inputs, outputs, and checklists.
- `workflows/` – Step-by-step procedures for running multi-agent efforts (e.g., issue triage, feature delivery).
- `templates/` *(optional)* – Add reusable templates for plans, status updates, or PR summaries here.

## Getting Started

1. Read the role description for your agent in `agents/`.
2. Follow the relevant workflow (usually `feature-delivery.md`).
3. Record progress in GitHub issues and, optionally, a log file inside `codex/logs/`.
4. Use pull requests to integrate changes, ensuring review and QA are completed before merging.

## Adding New Agents or Workflows

- Add a new markdown file under `agents/` following the existing pattern.
- Update `workflows/` with any new processes or checklists.
- Document shared conventions (naming, communication) in this README to keep the team aligned.

## Communication Expectations

- Prefer GitHub issue comments for decisions that impact scope or schedule.
- Keep commit messages scoped and descriptive to help reviewers understand changes.
- Mention related issues and pull requests in summaries so the history remains traceable.

By following this structure, Codex agents can collaborate predictably and reduce coordination overhead across the project.
