import BrainScene from '../../three/BrainScene'

// header height + hero height = 100vh on first load (a laptop screen shows exactly the header
// and the hero, nothing more). --header-h is kept in sync with the real header by Header.jsx's
// own ResizeObserver; 93px is just the fallback for the instant before that JS runs.
export default function Hero() {
  return (
    <section className="mx-auto flex h-[calc(100vh-var(--header-h,93px))] max-w-[1440px] flex-col items-center justify-center gap-10 px-8 md:flex-row md:justify-between lg:px-[120px]">
      <div className="flex max-w-[539px] flex-col gap-6">
        <h1 className="font-heading text-[32px] font-medium leading-none text-navy">EDA Group</h1>
        <p className="font-body text-2xl text-navy">
          EDA (Electronic Design Automation) Group is an interdepartmental research group including researchers from
          the Department of Control and Computer Engineering (DAUIN) and the Interuniversity Department of Regional
          and Urban Studies and Planning (DIST) of Politecnico di Torino.
        </p>
      </div>
      <BrainScene className="h-full max-h-[692px] w-full max-w-[615px] shrink-0" />
    </section>
  )
}
