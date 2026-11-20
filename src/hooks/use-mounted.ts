import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True once the component has hydrated in the browser and false during
 * server rendering and the first hydration pass. Lets a component render a
 * same sized placeholder first, so it causes no hydration mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
