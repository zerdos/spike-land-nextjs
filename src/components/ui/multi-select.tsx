"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type Option = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className)}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className="text-muted-foreground font-normal">
                {placeholder}
              </span>
            )}
            {selected.map((item) => {
              const option = options.find((o) => o.value === item)
              return (
                <Badge
                  key={item}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {option?.label ?? item}
                  <div
                    role="button"
                    tabIndex={0}
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={() => handleUnselect(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleUnselect(item)
                      }
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </div>
                </Badge>
              )
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No item found.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                role="button"
                tabIndex={0}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  selected.includes(option.value) && "bg-accent/50"
                )}
                onClick={() => {
                  onChange(
                    selected.includes(option.value)
                      ? selected.filter((item) => item !== option.value)
                      : [...selected, option.value]
                  )
                  // Keep open to allow multiple selections
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value]
                    )
                  }
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.includes(option.value)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {option.label}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
