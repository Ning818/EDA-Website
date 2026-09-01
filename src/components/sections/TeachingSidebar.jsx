const NAV_ITEMS = ['Professors', 'Phd Students', 'Alumni', 'Administrative Clerks']

export default function TeachingSidebar({ active = 'Professors', onSelect }) {
  return (
    <aside className="w-full shrink-0 bg-[#f5f4f6] py-6 lg:w-[273px]">
      <div className="border-b-2 border-[#279aae] px-6 pb-4">
        <h2 className="font-heading text-xl font-bold text-navy">Teaching</h2>
      </div>
      <nav className="flex flex-col">
        {NAV_ITEMS.map((item) => {
          const isActive = item === active
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect?.(item)}
              className={`border-l-4 px-6 py-4 text-left font-body text-lg font-bold ${
                isActive ? 'border-[#279aae] bg-white text-navy' : 'border-transparent text-navy'
              }`}
            >
              {item}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
