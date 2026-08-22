# Kavi AI Agent V2

Agentic evolution of Kavi AI Agent. The original Kavi-Ai-Agent repository remains unchanged.

This branch introduces the goal-driven AgentState / ToolRegistry / AgentLoop foundation. Existing Kavi capabilities are migrated incrementally into agent-controlled tools.

## Core loop

`Observe → Plan → Act → Observe → Evaluate → Replan`

## Migration rule

The agent owns the decision; deterministic systems own execution, validation, permissions, and safety.
