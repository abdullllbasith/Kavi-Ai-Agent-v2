# Kavi Agent V2 Core

V2 is being migrated toward a goal-driven, tool-using architecture while the original Kavi-Ai-Agent remains untouched.

## End-to-end shopping flow

`runKaviShoppingAgent()` now composes:

1. `AgentState`
2. `GoalManager`
3. `ToolRegistry`
4. Kapruka product-search adapter
5. `AgentLoop`
6. search evaluation and bounded refinement
7. product selection

### Runtime model

```text
User message
  ↓
Goal Manager
  ↓
AgentState
  ↓
Planner
  ↓
search_products
  ↓
Observation
  ↓
evaluate_product_search
  ↓
weak? → refined search → evaluate
  ↓
good enough
  ↓
complete_product_search
```

The important architectural rule is that the agent chooses the action while existing MCP/REST/catalog code remains execution infrastructure.
