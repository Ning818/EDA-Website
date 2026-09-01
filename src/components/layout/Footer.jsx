import edaLogoText from '../../assets/images/eda-logo-text.png'
import politoLogo from '../../assets/images/polito-logo.svg'
import linkedinIcon from '../../assets/images/linkedin-icon.svg'
import youtubeIcon from '../../assets/images/youtube-icon.svg'

export default function Footer() {
  return (
    <footer className="w-full">
      <div className="bg-[rgba(175,226,227,0.2)]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-y-10 px-8 py-12 lg:px-[120px]">
          <div className="flex shrink-0 items-center gap-6">
            <img src={politoLogo} alt="Politecnico di Torino" className="h-[106px] w-[240px]" />
            <img src={edaLogoText} alt="EDA Group" className="h-[105px] w-[210px] object-cover" />
          </div>

          <div className="flex flex-col gap-3 font-body text-lg text-[#676767]">
            <p className="font-bold tracking-[-0.36px]">Politecnico di Torino</p>
            <p className="font-medium tracking-[-0.36px]">Department of Control and Computer Engineering (DAUIN)</p>
            <p className="leading-6">
              Corso Duca Degli Abruzzi, 24
              <br />
              10129, Torino, Italy
              <br />
              Tel. +39 011 090 7042
              <br />
              Fax. +39 011 090 7099
            </p>
          </div>

          <div className="flex flex-col gap-3 font-body text-lg text-[#676767]">
            <p className="font-bold tracking-[-0.36px]">Visit</p>
            <p className="leading-6">
              Polito website
              <br />
              Department website
              <br />
              Polito maps
            </p>
            <div className="flex items-center gap-6 pt-2">
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
                <img src={linkedinIcon} alt="LinkedIn" className="size-6" />
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
                <img src={youtubeIcon} alt="YouTube" className="h-5 w-[25px]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-navy">
        <div className="mx-auto max-w-[1440px] px-8 py-6 lg:px-[120px]">
          <p className="font-body text-sm text-white">
            Copyright © 2026{' '}
            <a href="https://eda.polito.it/" target="_blank" rel="noreferrer" className="underline">
              EDA
            </a>
            . All rights reserved. Theme Spacious by .... Powered by:...
          </p>
        </div>
      </div>
    </footer>
  )
}
