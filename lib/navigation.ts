/**
 * Browser navigation, isolated behind a function.
 *
 * `window.location` is a non-configurable accessor in jsdom, so a test cannot
 * observe or intercept an assignment to `location.href` — not with
 * `Object.defineProperty`, not with `jest.spyOn`, not by replacing the whole
 * `window`. jsdom turns the assignment into a silent "not implemented"
 * console error and drops the URL on the floor.
 *
 * Routing every off-site redirect through one function means the Ozow flow
 * can be tested by mocking this module and asserting on the URL, instead of
 * shipping a test that cannot actually see where the user was sent.
 */

/** Leaves the current page for `url`. */
export function redirectTo(url: string): void {
  window.location.href = url
}
