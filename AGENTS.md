# Project Constraints and Rules

## UI Components Locking Rule
The following components are considered **FINAL** and **LOCKED**. No modifications, visual changes, or structural updates are permitted to these files unless the user explicitly includes the keyword **"UNLOCK"** in their request.

- `src/components/Dashboard.tsx`
- `src/components/DealerApplicationForm.tsx`

**Strict Directive:** If a request involves modifying these files without the "UNLOCK" keyword, the agent MUST decline the change and remind the user that these components are locked.
