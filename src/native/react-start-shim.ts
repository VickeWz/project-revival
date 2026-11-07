// Stand-in for @tanstack/react-start in the bundled iPhone app (no server runtime there).
export const useServerFn = <T>(fn: T): T => fn;
