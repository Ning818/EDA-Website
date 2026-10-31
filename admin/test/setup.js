import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

// a page with a long list (the whole People list in a picker) has many buttons, and working out the accessible name of each of them takes jsdom longer than the default second
configure({ asyncUtilTimeout: 8000 })

// jsdom has no modal <dialog>; this keeps what the browser does that matters to the tests: `open`, and `close` firing its event.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// the pages scroll a new heading into view; jsdom does not implement it
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function scrollIntoView() {}
