import { Search } from 'lucide-react'

import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { cn } from '#/lib/utils'
import { field, fieldLabel } from './styles'

export function RegistryToolbar({
  search,
  onSearch,
  categories,
  category,
  onCategory,
}: {
  search: string
  onSearch: (value: string) => void
  categories: Array<string>
  category: string
  onCategory: (value: string) => void
}) {
  return (
    <section
      aria-label="Registry controls"
      className="mb-7 grid items-end gap-4 md:grid-cols-[minmax(240px,360px)_1fr]"
    >
      <div className="grid gap-2">
        <Label htmlFor="gift-search" className={fieldLabel}>
          Search
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <Input
            id="gift-search"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Dinnerware, lamp, spa..."
            className={cn(field, 'pl-10')}
          />
        </div>
      </div>

      <Tabs value={category} onValueChange={onCategory}>
        <TabsList
          aria-label="Gift categories"
          className="w-full flex-wrap justify-start gap-2 bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto md:justify-end"
        >
          {categories.map((name) => (
            <TabsTrigger
              key={name}
              value={name}
              className="h-11 flex-none rounded-full border-emerald/30 bg-surface/85 px-4 text-sm font-extrabold text-emerald-dark hover:-translate-y-px hover:bg-emerald-dark hover:text-surface data-[state=active]:bg-emerald-dark data-[state=active]:text-surface data-[state=active]:shadow-none"
            >
              {name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </section>
  )
}
