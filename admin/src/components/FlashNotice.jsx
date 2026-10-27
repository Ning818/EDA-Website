import { useLocation } from 'react-router-dom'
import { Notice } from './ui'

/** A message that the page before sent along with the navigation (for example "Grace Hopper was added."), shown at the top of this page. */
export default function FlashNotice() {
  const { state } = useLocation()
  if (!state?.notice) return null
  return <Notice kind="ok">{state.notice}</Notice>
}
