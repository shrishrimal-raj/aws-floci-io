# CodeGraph First Rule

For implementation tasks, do not read the full repository by default.

Use CodeGraph MCP first:
- codegraph_status
- codegraph_search
- codegraph_context
- codegraph_files
- codegraph_callers
- codegraph_callees
- codegraph_impact
- codegraph_explore

Rules:
- Prefer symbol-level and task-focused context.
- Open full files only when directly relevant.
- When benchmarking another service, inspect only the exact files needed.
- Summarize what files were inspected before editing.