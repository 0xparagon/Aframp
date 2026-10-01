# Performance contribution — #667, #668, #671

This directory contains complete sandbox copies of the affected production files plus
focused tests. No protected root production paths are modified.

## #667 — Withdraw memoization
- `config` is memoized with `[asset]`.
- `available` is memoized with `[balances, asset]`.
- Comments explain why each memo is bounded.

## #668 — SWR dashboard fetching
- Replaces manual `useEffect` + local fetch state with `useSWR`.
- Uses `['dashboard', token]` as the cache key.
- Revalidates every 30 seconds.
- Keeps `AbortController` support and forwards the same signal to all three API calls.
- Uses SWR `mutate()` for retry.

### Dependency when promoted
The root production package currently does not include `swr`.
When maintainers promote this sandbox implementation, add:

```bash
npm install swr
```

The protected root `package.json` and lockfile are intentionally untouched here.

## #671 — WalletSidebar memoization
- Wraps the exported sidebar with `React.memo`.
- The current app layout passes `<WalletSidebar />` with no props, so there are no
  unstable layout prop references to stabilize.
- Internal pathname/session hook changes may still legitimately rerender the sidebar.
- Includes a `jest.fn()` render-count test proving unchanged parent rerenders are skipped.
