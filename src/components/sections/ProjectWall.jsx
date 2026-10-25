import { themeBySlug } from '../../themes'
import WallParticles from './WallParticles'

const MAX_TILES = 9
const MAX_CODE_LENGTH = 12 // longer acronyms do not fit a tile on one line

// The theme's project acronyms for the wall: ongoing projects first, then ended ones, without repeats; the ones listed without an acronym are skipped.
function wallCodes({ ongoing, ended }) {
  const codes = [...ongoing, ...ended].map((p) => p.code).filter((code) => code && code.length <= MAX_CODE_LENGTH)
  return [...new Set(codes)].slice(0, MAX_TILES)
}

/**
 * `projects`: the theme's { ongoing, ended } lists as the API gives them (backend/).
 * The picture of a Research page's "Funded projects" card: a wall of tiles, one per project acronym of the theme, tinted with the page's
 * colour (`--theme`), over a small still picture of flat particles for the theme (WallParticles). It stands where an image would, in the same 4:3 frame (see
 * FeatureCard's `visual`); the tiles light up with the card's hover.
 */
export default function ProjectWall({ theme, projects }) {
  const { color } = themeBySlug(theme)
  return (
    <div className="@container relative aspect-[4/3] w-full overflow-hidden bg-[color-mix(in_srgb,var(--theme,#279aae)_10%,white)]">
      <WallParticles theme={theme} color={color} />
      {/* the padding is on an inner box: cqw units refer to the nearest ancestor container, not to the element itself */}
      <ul aria-label="Funded projects" className="relative flex size-full flex-wrap content-center justify-center gap-[3cqw] p-[6cqw] pb-[24cqw]">
        {wallCodes(projects).map((code) => (
          <li
            key={code}
            className="flex w-[calc((100%-6cqw)/3)] items-center justify-center rounded-[2cqw] border border-[color:var(--theme,#279aae)]/30 bg-white/95 px-[0.8cqw] py-[3.6cqw] text-center font-heading font-bold leading-none tracking-[0.02em] text-navy transition-colors duration-300 group-hover:border-[color:var(--theme,#279aae)]"
            style={{ fontSize: 'clamp(11px, 3.3cqw, 19px)' }}
          >
            {code}
          </li>
        ))}
      </ul>
    </div>
  )
}
