/**
 * A cloud's still picture in the place of the live cloud (see stillClouds.js). The box has two layouts: below xl it takes the height the copy leaves in
 * its one-screen row (at least 240px, on a tablet 400px; up to 560px wide), under or over the copy like the live cloud's box on the phone; from xl up it is
 * the box the live cloud is anchored to (STILL_BOX / STILL_BRAIN_BOX: its size on the live page), beside the copy. The picture is sized and placed in it by
 * `cloud.fit` in cqw, so it follows the box's width - and it is also kept within the box's height (below xl) or the height of the screen under the
 * header (from xl up), so on a short screen it shrinks rather than runs over the copy or the row above or below.
 * `near`: on the phone layout (below md) only the picture's place is changed, not its size: it stands at the top of its box when the copy is above the
 * box, at the bottom when the copy is under it, so it is next to its copy and the box's spare height is on the far side, not between the two.
 * The picture is wider than its box and not transparent, so its box goes behind the page's text (-z-10 on the box, not the picture: the box of
 * a layout with a transform would otherwise be a layer of its own above the text), as the live canvas does.
 */
export const STILL_BOX = 'min-h-[240px] w-full max-w-[560px] flex-1 md:min-h-[400px] xl:h-[478px] xl:min-h-0 xl:max-w-[531px] xl:flex-none xl:shrink-0'
// the social pictures' box: on the phone layout as high as the picture itself (--bar, so the picture keeps the size it has in STILL_BOX), not the height
// the copy leaves, so the row can centre the picture and its copy on the screen
export const STILL_CENTERED_BOX = 'w-full max-w-[560px] max-md:aspect-(--bar) max-md:flex-none md:min-h-[400px] md:flex-1 xl:h-[478px] xl:min-h-0 xl:max-w-[531px] xl:flex-none xl:shrink-0'
export const STILL_BRAIN_BOX = 'min-h-[240px] w-full max-w-[560px] flex-1 md:min-h-[400px] xl:h-full xl:max-h-[692px] xl:min-h-0 xl:max-w-[615px] xl:flex-none xl:shrink-0'

// the header's height is kept in --header-h by the header itself (93px until it has measured itself)
const HEADER = 'var(--header-h, 93px)'
const CROP_TOP = `linear-gradient(to bottom, transparent ${HEADER}, #000 calc(${HEADER} + 24px))`

// the picture's vertical place: the middle of its box (by `fit`), or on the phone layout the top / the bottom of the box - moved so that its dots, not its
// empty margin (--et / --eb, % of its height; --cy: what the header-height mask and its soft edge have taken off its top), stand at that end
const PLACE = {
  middle: 'top-[calc(50%_+_var(--sy)*1cqw)] -translate-y-1/2',
  top: 'top-0 translate-y-[calc((var(--et)*1%_+_var(--cy))*-1)] md:top-[calc(50%_+_var(--sy)*1cqw)] md:-translate-y-1/2',
  bottom: 'bottom-0 translate-y-[calc(var(--eb)*1%)] md:bottom-auto md:top-[calc(50%_+_var(--sy)*1cqw)] md:-translate-y-1/2',
}

export default function StillCloud({ cloud, className = '', near = 'middle' }) {
  const { desk, stack } = cloud.fit
  return (
    <div
      className={`${className} relative -z-10 [container-type:size]`}
      style={{ '--w': desk.w, '--x': desk.x, '--y': desk.y, '--sw': stack.w, '--sx': stack.x, '--sy': stack.y, '--ar': cloud.aspect, '--bar': (cloud.aspect * 100) / stack.w, '--et': cloud.edge.top, '--eb': cloud.edge.bottom, '--cy': cloud.cropTop ? `calc(${HEADER} + 10px)` : '0px' }}
    >
      <img
        src={cloud.src}
        alt={cloud.alt}
        style={cloud.cropTop ? { maskImage: CROP_TOP, WebkitMaskImage: CROP_TOP } : undefined}
        className={`pointer-events-none absolute left-[calc(50%_+_var(--sx)*1cqw)] ${PLACE[near]} w-[min(calc(var(--sw)*1cqw),calc(100cqh*var(--ar)))] max-w-none -translate-x-1/2 xl:left-[calc(50%_+_var(--x)*1cqw)] xl:top-[calc(50%_+_var(--y)*1cqw)] xl:bottom-auto xl:-translate-y-1/2 xl:w-[min(calc(var(--w)*1cqw),calc((100vh_-_var(--header-h,93px)_-_16px)*var(--ar)))]`}
      />
    </div>
  )
}
