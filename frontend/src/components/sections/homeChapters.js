import { useEffect, useState } from 'react'
import { THEMES } from '../../themes'
import { ARM_EXIT_SCREENS } from '../../three/cloudState'

// The home page's chapters - the stops the chapter index (ChapterRail) lists and jumps to: the opening screen, the four themes and the YouTube / LinkedIn
// stage. `color` tints the chapter's dot.
export const CHAPTERS = [
  { id: 'intro', label: 'Introduction', color: '#002843' },
  ...THEMES.map((theme) => ({ id: theme.slug, label: theme.short ?? theme.name, color: theme.color })),
  { id: 'social', label: 'Social Media', color: '#e87a95' },
]

/**
 * The scroll position (px) of each chapter, in the page's current layout. `still`: the plain page (every chapter a screen of its own, marked data-chapter) rather than
 * the animated one, where a theme's cloud is finished when its section reaches the top of the screen (the pinned stretch begins) and the social stage has no
 * section of its own: it is reached ARM_EXIT_SCREENS of scroll after the arm's pin releases (see ParticleCanvas's pinEnd). Never decreasing, and never
 * past the bottom of the page.
 */
export function chapterTargets(still) {
  const vh = window.innerHeight
  const max = Math.max(0, document.documentElement.scrollHeight - vh)
  const sectionTop = (id) => {
    const el = document.querySelector(`[data-chapter="${id}"]`)
    return el ? el.getBoundingClientRect().top + window.scrollY : null
  }
  let prev = 0
  return CHAPTERS.map(({ id }) => {
    let y = null
    if (id === 'intro') y = 0
    else if (id === 'social' && !still) {
      const arm = document.querySelector('[data-chapter="industry-4-0"]')
      if (arm) y = arm.getBoundingClientRect().bottom + window.scrollY - vh + ARM_EXIT_SCREENS * vh
    } else y = sectionTop(id)
    prev = Math.max(prev, Math.min(y ?? prev, max))
    return prev
  })
}

// The chapter the page is at: the one whose stop is nearest to the scroll position.
export function chapterIndexAt(y, targets) {
  let best = 0
  targets.forEach((target, i) => {
    if (Math.abs(target - y) < Math.abs(targets[best] - y)) best = i
  })
  return best
}

export const currentChapterId = (still) => CHAPTERS[chapterIndexAt(window.scrollY, chapterTargets(still))].id

/** Scrolls to a chapter's stop; smoothly unless the visitor asked for reduced motion (or `behavior` says otherwise). */
export function scrollToChapter(id, still, behavior = 'smooth') {
  const top = chapterTargets(still)[CHAPTERS.findIndex((c) => c.id === id)]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, left: 0, behavior: reduced ? 'instant' : behavior })
}

// Whether the footer has come into view: the chapter index and the view switch, which are fixed to the screen, leave it then so they do not sit over it.
export function useFooterInView() {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const footer = document.querySelector('footer')
    if (!footer) return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '0px 0px -80px 0px' })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])
  return inView
}
