import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Lead, Sentences, sentencesOf } from '../src/components/ui'

// A line that would break a sentence in two is broken before the sentence: each sentence is a block of its own.

describe('the sentences of a text', () => {
  it.each([
    ['One sentence only.', ['One sentence only.']],
    ['The person shows on the People page as soon as you save. You can correct or delete the entry at any time.', ['The person shows on the People page as soon as you save.', 'You can correct or delete the entry at any time.']],
    ['Is it ready? Yes! Then go.', ['Is it ready?', 'Yes!', 'Then go.']],
    ['Use a web address, e.g. https://example.org/x. Then save.', ['Use a web address, e.g. https://example.org/x.', 'Then save.']],
    ['Ask Prof. Rossi. She knows.', ['Ask Prof. Rossi.', 'She knows.']],
    ['At most 450 characters. A longer text can break the page.', ['At most 450 characters.', 'A longer text can break the page.']],
    ['Version 1.5 is out. Update it.', ['Version 1.5 is out.', 'Update it.']],
    ['No full stop at the end', ['No full stop at the end']],
    ['For example https://cordis.europa.eu/id/… Leave it empty.', ['For example https://cordis.europa.eu/id/…', 'Leave it empty.']],
    ['A "quoted" start. "Then a quote." And more.', ['A "quoted" start.', '"Then a quote."', 'And more.']],
    ['lower case after the stop. like this', ['lower case after the stop. like this']],
  ])('cuts %j at the ends of its sentences', (text, expected) => {
    expect(sentencesOf(text)).toEqual(expected)
  })
})

describe('the text of a page', () => {
  const two = 'The first sentence is here. The second sentence follows it.'

  it('puts each sentence in a block of its own, with the same words and the same spaces', () => {
    const { container } = render(<Lead>{two}</Lead>)
    const paragraph = container.querySelector('p.lead')
    expect([...paragraph.querySelectorAll('.sentence')].map((s) => s.textContent)).toEqual(['The first sentence is here.', 'The second sentence follows it.'])
    expect(paragraph.textContent).toBe(two) // what a screen reader reads, and what is copied, is the same text
    expect(screen.getByText('The second sentence follows it.')).toBeInTheDocument()
  })

  it('leaves a text of one sentence as it is', () => {
    const { container } = render(<Lead>Just one sentence here.</Lead>)
    expect(container.querySelectorAll('.sentence')).toHaveLength(0)
    expect(container.querySelector('p.lead').textContent).toBe('Just one sentence here.')
  })

  it('does not cut a text that holds a link or a name in bold, since a sentence goes on through it', () => {
    const { container } = render(
      <Lead>
        Signed in as <strong>Ada</strong>. Welcome back.
      </Lead>,
    )
    expect(container.querySelectorAll('.sentence')).toHaveLength(0)
    expect(container.querySelector('p.lead').textContent).toBe('Signed in as Ada. Welcome back.')
  })

  it('joins the pieces of a text that came in several parts', () => {
    const name = 'the account'
    const { container } = render(<Sentences>{`Look at ${name}. Then decide.`}</Sentences>)
    expect([...container.querySelectorAll('.sentence')].map((s) => s.textContent)).toEqual(['Look at the account.', 'Then decide.'])
  })

  it('shows nothing for nothing', () => {
    const { container } = render(<Sentences>{''}</Sentences>)
    expect(container).toBeEmptyDOMElement()
  })
})
