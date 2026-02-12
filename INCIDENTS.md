# Incidents And Learnings

## Entry Schema
- Date
- Trigger
- Impact
- Root Cause
- Fix
- Prevention Rule
- Evidence
- Commit
- Confidence

## Entries

### 2026-02-10: `/bgp` Build Failure From Missing Suspense Boundary
- Date: 2026-02-10
- Trigger: `npm run build` failed while prerendering `/bgp` after introducing `useSearchParams()` in the route.
- Impact: Local build failure; caught before pushing a broken commit.
- Root Cause: App Router requires `useSearchParams()` usage to be wrapped in a Suspense boundary to handle CSR bailouts.
- Fix: Split `/bgp` into a server component wrapper (`src/app/bgp/page.tsx`) with `<Suspense>` and a client component (`src/app/bgp/ui.tsx`).
- Prevention Rule: When adding `useSearchParams` / other client-only navigation hooks to a route, run `npm run build` and ensure the client code is wrapped by a Suspense boundary at the page/segment level.
- Evidence: `npm run build` then successful rebuild after fix.
- Commit: `c282510`
- Confidence: high

### 2026-02-12T20:01:47Z | Codex execution failure
- Date: 2026-02-12T20:01:47Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-2.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:05:14Z | Codex execution failure
- Date: 2026-02-12T20:05:14Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-3.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:08:45Z | Codex execution failure
- Date: 2026-02-12T20:08:45Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-4.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:12:11Z | Codex execution failure
- Date: 2026-02-12T20:12:11Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-5.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:15:42Z | Codex execution failure
- Date: 2026-02-12T20:15:42Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-6.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:19:12Z | Codex execution failure
- Date: 2026-02-12T20:19:12Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-7.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:22:38Z | Codex execution failure
- Date: 2026-02-12T20:22:38Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-8.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:26:18Z | Codex execution failure
- Date: 2026-02-12T20:26:18Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-9.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:29:47Z | Codex execution failure
- Date: 2026-02-12T20:29:47Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-10.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:33:15Z | Codex execution failure
- Date: 2026-02-12T20:33:15Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-11.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:36:43Z | Codex execution failure
- Date: 2026-02-12T20:36:43Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-12.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:40:12Z | Codex execution failure
- Date: 2026-02-12T20:40:12Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-13.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:43:40Z | Codex execution failure
- Date: 2026-02-12T20:43:40Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-14.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:47:14Z | Codex execution failure
- Date: 2026-02-12T20:47:14Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-15.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:50:45Z | Codex execution failure
- Date: 2026-02-12T20:50:45Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-16.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:54:21Z | Codex execution failure
- Date: 2026-02-12T20:54:21Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-17.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:57:48Z | Codex execution failure
- Date: 2026-02-12T20:57:48Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-18.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:01:15Z | Codex execution failure
- Date: 2026-02-12T21:01:15Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-19.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:04:44Z | Codex execution failure
- Date: 2026-02-12T21:04:44Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-20.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:08:16Z | Codex execution failure
- Date: 2026-02-12T21:08:16Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-21.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:11:47Z | Codex execution failure
- Date: 2026-02-12T21:11:47Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-22.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:15:19Z | Codex execution failure
- Date: 2026-02-12T21:15:19Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-23.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:18:47Z | Codex execution failure
- Date: 2026-02-12T21:18:47Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-24.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:22:01Z | Codex execution failure
- Date: 2026-02-12T21:22:01Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-25.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:25:18Z | Codex execution failure
- Date: 2026-02-12T21:25:18Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-26.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:28:36Z | Codex execution failure
- Date: 2026-02-12T21:28:36Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-27.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:31:59Z | Codex execution failure
- Date: 2026-02-12T21:31:59Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-bgp-explorer-cycle-28.log
- Commit: pending
- Confidence: medium
