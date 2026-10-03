const NAV_ITEMS = ['Professors', 'Phd Students', 'Alumni', 'Administrative Clerks']

export default function TeachingSidebar({ active = 'Professors', onSelect }) {
  return (
    <aside className="w-full shrink-0 bg-[#f5f4f6] py-6 lg:w-[273px]">
      <div className="border-b-2 border-transparent px-6 pb-4">
        <h2 className="font-heading text-xl font-bold text-navy">Teaching</h2>
      </div>
      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item === active
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect?.(item)}
              className={`cursor-pointer border-l-4 px-5 py-[13px] text-left font-body text-lg font-bold text-navy ${
                isActive ? 'border-navy bg-[#dcebf5]' : 'border-[#d9d9d9]'
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
