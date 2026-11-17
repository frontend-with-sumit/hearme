import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Postgres only, per spec 0001 (stack & architecture): no Neon Auth,
  // AI Gateway, Object Storage, Functions, or Realtime in this project's decided stack.
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
