# Code Review Skill

Perform a thorough code review of all changes on the current branch compared to main.

## Steps

1. **Identify changed files:**
   Run `git diff --name-only main` to get the list of all modified files.

2. **Read and review each changed file.** Check for:
   - **Race conditions** — concurrent state updates, missing locks, stale closures, unguarded async operations
   - **Missing error handling** — uncaught promises, missing try/catch on API calls, silent failures
   - **TypeScript strict mode issues** — `any` types, missing null checks, incorrect type assertions
   - **Supabase query patterns** — verify `.select()` chaining, check RLS assumptions, confirm return types match schema
   - **Security** — auth verification in server actions, input validation, exposed secrets, SQL injection vectors

3. **Check for regressions:**
   - For each changed file, read the surrounding code to confirm existing functionality is preserved
   - Verify imports, exports, and component props haven't broken downstream consumers
   - Check that state management changes don't break other components using the same state

4. **Run the build:**
   Execute `npm run build` and `npm run lint`. Report any errors with file paths and line numbers.

5. **Report findings:**
   List all issues as actionable items in this format:
   ```
   ## Review Findings

   ### Critical
   - [file:line] Description of issue

   ### Warnings
   - [file:line] Description of concern

   ### Build Status
   - ✅ Build passed / ❌ Build failed (details)
   - ✅ Lint passed / ❌ Lint failed (details)
   ```

   If no issues found, confirm the review passed clean.
