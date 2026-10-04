import ArrowLink from '../ui/ArrowLink'
import meetingPhoto from '../../assets/images/linkedin-meeting-photo.png'

import { LINKEDIN_COPY } from './socialCopyText'

const LINKEDIN_URL = 'https://www.linkedin.com/company/eda-group-polito/'

export default function LinkedInSection() {
  return (
    <section className="mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-8 py-16 md:flex-row md:justify-between md:gap-16 md:py-24 lg:px-[120px]">
      <div className="flex max-w-[554px] flex-col gap-8">
        <p className="font-body text-2xl leading-[1.45] text-navy">{LINKEDIN_COPY.text}</p>
        <ArrowLink to={LINKEDIN_URL} variant="circle" underline>
          {LINKEDIN_COPY.cta}
        </ArrowLink>
      </div>
      <img src={meetingPhoto} alt="EDA Group meeting" className="w-full shrink-0 rounded-sm object-cover md:w-[564px]" />
    </section>
  )
}
