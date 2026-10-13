// A tiny reporter for the check scripts: collect failures and warnings, print them, exit non-zero on a failure.
// A warning never fails a check - it marks something worth fixing (a placeholder, a count that disagrees with its list).
export function createReport(title) {
  const failures = []
  const warnings = []
  let passed = 0
  return {
    warn: (msg) => void warnings.push(msg),
    /** Assert a condition; `msg` is reported as a failure when it does not hold. Returns the condition. */
    check(cond, msg) {
      if (cond) passed++
      else failures.push(msg)
      return Boolean(cond)
    },
    /** Print the outcome and return the process exit code (0 = no failure). */
    finish() {
      for (const w of warnings) console.log(`  warn  ${w}`)
      for (const f of failures) console.log(`  FAIL  ${f}`)
      const summary = `${title}: ${passed} passed, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}, ${failures.length} failure${failures.length === 1 ? '' : 's'}`
      console.log(failures.length ? `✗ ${summary}` : `✓ ${summary}`)
      return failures.length ? 1 : 0
    },
  }
}
