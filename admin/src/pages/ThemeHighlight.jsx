import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button, CheckboxField, ErrorSummary, FileField, Loading, LoadError, Notice, PageHeading, TextAreaField, TextField } from '../components/ui'
import { isWebAddress, useForm } from '../useForm'
import { useLoad } from '../useLoad'

const MAX_IMAGE = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FIELDS = ['title', 'subtitle', 'authors_full', 'authors_short', 'venue', 'tags', 'text', 'url', 'image_alt', 'image']

const toTags = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

function CardForm({ theme, kind, card }) {
  const navigate = useNavigate()
  const paper = kind === 'paper'
  const initial = {
    title: card?.title ?? '',
    subtitle: card?.subtitle ?? '',
    authors_full: card?.authors_full ?? '',
    authors_short: card?.authors_short ?? '',
    venue: card?.venue ?? '',
    tags: (card?.tags ?? []).join('\n'),
    text: card?.text ?? '',
    url: card?.url ?? '',
    image_alt: card?.image_alt ?? '',
  }
  const form = useForm(initial)
  const [image, setImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  const hasCurrent = Boolean(card?.image_url)
  const hasPicture = Boolean(image) || (hasCurrent && !removeImage)

  const validate = (v) => {
    const found = {}
    const need = (key, label, max, empty) => {
      const value = v[key].trim()
      if (!value) found[`card-${key}`] = empty
      else if (value.length > max) found[`card-${key}`] = `${label} must be at most ${max} characters long.`
    }
    need('title', 'The title', 300, 'Enter the title.')
    if (paper) {
      need('authors_full', 'The authors', 600, 'Enter the authors, in full.')
      need('authors_short', 'The short forms', 600, "Enter the authors' short forms.")
      need('venue', 'The journal or conference', 200, 'Enter the journal or conference.')
    } else {
      need('subtitle', 'The second line', 300, 'Enter the second line of the title.')
    }
    need('text', 'The summary', 1200, 'Write the summary.')
    if (!v.url.trim()) found['card-url'] = 'Enter the address of the card.'
    else if (!isWebAddress(v.url)) found['card-url'] = 'The address must be a web address starting with http:// or https://.'
    const tags = toTags(v.tags)
    if (tags.length > 8) found['card-tags'] = 'There can be at most 8 keywords.'
    else if (tags.some((tag) => tag.length > 100)) found['card-tags'] = 'A keyword must be at most 100 characters long.'
    if (image) {
      if (!IMAGE_TYPES.includes(image.type)) found['card-image'] = 'The picture must be a JPEG, PNG or WebP image.'
      else if (image.size > MAX_IMAGE) found['card-image'] = 'The picture is larger than 5 MB.'
    }
    if (hasPicture && !v.image_alt.trim()) found['card-image_alt'] = 'Describe the picture for people who cannot see it.'
    return found
  }

  // a card is written as a whole, so every field is sent; the picture only when a new one was chosen or the old one is taken away
  const send = async (v) => {
    const data = new FormData()
    for (const key of ['title', 'text', 'url']) data.append(key, v[key].trim())
    if (paper) for (const key of ['authors_full', 'authors_short', 'venue']) data.append(key, v[key].trim())
    else data.append('subtitle', v.subtitle.trim())
    toTags(v.tags).forEach((tag) => data.append('tags', tag))
    if (hasPicture) data.append('image_alt', v.image_alt.trim())
    if (image) data.append('image', image)
    if (removeImage && !image) data.append('remove_image', 'true')
    await api.putForm(`/api/admin/themes/${theme.slug}/highlights/${kind}`, data)
    navigate(`/themes/${theme.slug}`, { state: { notice: `The highlight ${kind} of ${theme.name} was saved.` } })
  }

  const fieldFor = (error) => {
    if (error.code === 'invalid_input' && FIELDS.includes(error.field)) return `card-${error.field}`
    if (error.code === 'image_invalid' || error.code === 'image_too_large') return 'card-image'
    return null
  }

  return (
    <form onSubmit={(event) => form.submit(event, { validate, send, fieldFor })} noValidate className="card stack-lg">
      <ErrorSummary errors={form.errors} version={form.version} />
      {form.failure && (
        <Notice kind="error" focusOnShow>
          {form.failure}
        </Notice>
      )}
      <TextAreaField id="card-title" label="Title" required rows={2} hint={paper ? 'The title of the paper.' : 'The project\'s code and a colon, for example "R3-PowerUP:".'} {...form.bind('title')} error={form.errors['card-title']} />
      {!paper && <TextField id="card-subtitle" label="Second line of the title" required autoComplete="off" hint='For example "a 300mm pilot line for smart power".' {...form.bind('subtitle')} error={form.errors['card-subtitle']} />}
      {paper && (
        <>
          <TextAreaField id="card-authors_full" label="Authors, in full" required rows={2} hint="For example: Andrea Calimera, Alberto Macii, Enrico Macii." {...form.bind('authors_full')} error={form.errors['card-authors_full']} />
          <TextAreaField id="card-authors_short" label="Authors, in short form" required rows={2} hint="For the phone, where the full names do not fit. For example: A. Calimera, A. Macii, E. Macii." {...form.bind('authors_short')} error={form.errors['card-authors_short']} />
          <TextField id="card-venue" label="Journal or conference" required autoComplete="off" {...form.bind('venue')} error={form.errors['card-venue']} />
        </>
      )}
      <TextAreaField id="card-tags" label="Keywords" rows={4} hint="One to a line, at most 8." {...form.bind('tags')} error={form.errors['card-tags']} />
      <TextAreaField id="card-text" label="Summary" required rows={5} hint="A few sentences. Plain text, at most 1200 characters." {...form.bind('text')} error={form.errors['card-text']} />
      <TextField
        id="card-url"
        label="Address of the card"
        required
        type="url"
        inputMode="url"
        autoComplete="off"
        hint={paper ? "Where the card leads, for example the paper's page on IRIS. Nothing is read from it: everything on the card is typed here." : "Where the card leads, for example the project's page on CORDIS."}
        {...form.bind('url')}
        error={form.errors['card-url']}
      />

      <fieldset>
        <legend>Picture (optional)</legend>
        <div className="stack">
          {hasCurrent && !image && !removeImage && <img className="logo-current" src={card.image_url} alt={card.image_alt ? `Current picture: ${card.image_alt}` : 'Current picture'} />}
          {preview && <img className="logo-current" src={preview} alt="The picture you chose, as it will be used" />}
          <FileField
            id="card-image"
            label={hasCurrent ? 'Choose a new picture' : 'Choose a picture'}
            hint="A JPEG, PNG or WebP image of up to 5 MB, shown 4 to 3. Check that you may use it. It is made smaller and stripped of everything but the picture."
            accept={IMAGE_TYPES.join(',')}
            onChange={(event) => {
              setImage(event.target.files?.[0] ?? null)
              if (event.target.files?.[0]) setRemoveImage(false)
            }}
            error={form.errors['card-image']}
          />
          {hasCurrent && !image && <CheckboxField id="card-remove-image" label="Take the picture away" hint="The card then shows a neutral placeholder." checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} />}
          {hasPicture && (
            <TextAreaField
              id="card-image_alt"
              label="What the picture shows"
              required
              rows={2}
              hint="A few words for people who cannot see it, for example: A plot of the leakage power of SRAM cells."
              {...form.bind('image_alt')}
              error={form.errors['card-image_alt']}
            />
          )}
        </div>
      </fieldset>

      <div>
        <Button type="submit" variant="primary" busy={form.busy}>
          Save the card
        </Button>
      </div>
    </form>
  )
}

/** The highlight paper or highlight project of a theme: everything on the card is typed by hand. */
export default function ThemeHighlight() {
  const { slug, kind } = useParams()
  const theme = useLoad(() => api.get(`/api/admin/themes/${slug}`), [slug])
  const known = kind === 'paper' || kind === 'project'
  const card = theme.data ? (kind === 'paper' ? theme.data.highlight_paper : theme.data.highlight_project) : null
  return (
    <div className="page page-narrow">
      <Link to={`/themes/${slug}`} className="back-link">
        Back to the theme
      </Link>
      <PageHeading>{known ? `Highlight ${kind}` : 'Highlight card not found'}</PageHeading>
      {!known && <p>A theme has a highlight paper and a highlight project.</p>}
      {known && theme.status === 'loading' && <Loading>Loading the theme…</Loading>}
      {known && theme.status === 'error' && <LoadError error={theme.error} onRetry={theme.reload} />}
      {known && theme.status === 'ok' && (
        <>
          <p className="lead">
            {kind === 'paper' ? "The paper shown on the theme's Research page." : "The project shown on the theme's Funded Projects page."} Everything on it is typed here, by hand.
          </p>
          <CardForm theme={theme.data} kind={kind} card={card} />
        </>
      )}
    </div>
  )
}
