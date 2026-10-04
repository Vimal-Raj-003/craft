import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false while the server renders and during hydration, true afterwards (for browser-only values such as the saved cart). */
export const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);