// The picture of the Highlight cards: a paper's card on a Research page and a project's card on a Funded Projects page, 4:3. The pictures are kept by the API
// (a highlight's `image_url`, backend/), so the staff can change them with the card's words; where a card has none, a neutral placeholder is shown.
import placeholder from '../../assets/images/highlights/placeholder.svg'
import { apiUrl } from '../../api/client'

/** `imageUrl`: the highlight's `image_url` as the API gives it (or null). */
export const highlightImage = (imageUrl) => apiUrl(imageUrl) ?? placeholder
