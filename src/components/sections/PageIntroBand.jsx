/**
 * The dark navy title band used at the top of Research/Funded Projects pages:
 * a small teal category label, a large white page title, and an intro paragraph.
 */
export default function PageIntroBand({ category, title, children }) {
  return (
    <section className="bg-navy">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2.5 px-8 pt-16 lg:px-[120px]">
        <p className="font-heading text-[36px] font-bold tracking-tight text-[#279aae]">{category}</p>
        {title && <p className="font-heading text-[36px] font-bold tracking-tight text-white">{title}</p>}
      </div>
      {children && (
        <div className="mx-auto max-w-[1440px] px-8 pb-10 pt-6 lg:px-[120px]">
          <p className="font-body text-lg leading-6 text-[#f5f4f6]">{children}</p>
        </div>
      )}
    </section>
  )
}
