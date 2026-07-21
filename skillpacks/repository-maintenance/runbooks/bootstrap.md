# Bootstrap repository maintenance

GBrain displays these steps; it does not execute them.

1. Read the consuming repository's `AGENTS.md` and identify canonical planning documents, validation commands, label policy, default branch, and optional GitHub Project.
2. Copy `skills/conventions/issue-policy.example.json` to a repository-owned location only if the default audit policy is useful, then customize it deliberately.
3. Run the issue audit against a deterministic fixture or in read-only live mode before authorizing repairs.
4. Confirm `.agents/skills` and `.claude/skills` use relative links to the canonical scaffolded skill directories where those hosts need links.
