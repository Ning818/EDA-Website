import BrainScene from '../../three/BrainScene'

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-8 py-16 md:flex-row md:justify-between md:py-[120px] lg:px-[120px]">
      <div className="flex max-w-[539px] flex-col gap-6">
        <h1 className="font-heading text-[32px] font-medium leading-none text-navy">EDA Group</h1>
        <p className="font-body text-2xl text-navy">
          EDA (Electronic Design Automation) Group is an interdepartmental research group including researchers from
          the Department of Control and Computer Engineering (DAUIN) and the Interuniversity Department of Regional
          and Urban Studies and Planning (DIST) of Politecnico di Torino.
        </p>
      </div>
      <BrainScene className="h-[692px] w-full max-w-[615px] shrink-0" />
    </section>
  )
}
