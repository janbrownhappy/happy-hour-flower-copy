"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Drawer as Vaul } from "vaul"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

// On small screens, selects open as a Vaul bottom drawer; desktop keeps the Radix dropdown.
const MOBILE_QUERY = "(max-width: 640px)"
const MobileCtx = React.createContext(null)
const ItemModeCtx = React.createContext("drawer")

function useIsSmall() {
  const [small, setSmall] = React.useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches)
  React.useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const f = () => setSmall(mq.matches)
    mq.addEventListener("change", f)
    return () => mq.removeEventListener("change", f)
  }, [])
  return small
}

function MobileSelect({ children, value, defaultValue, onValueChange, open, onOpenChange, disabled }) {
  const [inner, setInner] = React.useState(defaultValue)
  const [innerOpen, setInnerOpen] = React.useState(false)
  const labelsRef = React.useRef({})
  const [, bump] = React.useReducer((n) => n + 1, 0)
  const current = value !== undefined ? value : inner
  const isOpen = open !== undefined ? open : innerOpen
  const setOpen = (o) => { setInnerOpen(o); onOpenChange?.(o) }
  const ctx = {
    value: current,
    open: isOpen,
    disabled,
    setOpen,
    select: (v) => { if (value === undefined) setInner(v); onValueChange?.(v); setOpen(false) },
    labels: labelsRef.current,
    register: (v, label) => {
      const prev = labelsRef.current[v]
      if (prev === undefined || (typeof label === "string" && prev !== label)) {
        labelsRef.current[v] = label
        bump()
      }
    },
  }
  return <MobileCtx.Provider value={ctx}>{children}</MobileCtx.Provider>
}

function Select(props) {
  const isSmall = useIsSmall()
  if (isSmall) return <MobileSelect {...props} />
  return <SelectPrimitive.Root {...props} />
}

const SelectGroup = React.forwardRef((props, ref) => {
  const m = React.useContext(MobileCtx)
  if (m) return <div ref={ref} role="group" {...props} />
  return <SelectPrimitive.Group ref={ref} {...props} />
})
SelectGroup.displayName = "SelectGroup"

const SelectValue = React.forwardRef(({ placeholder, children, className, ...props }, ref) => {
  const m = React.useContext(MobileCtx)
  if (!m) return <SelectPrimitive.Value ref={ref} placeholder={placeholder} className={className} {...props}>{children}</SelectPrimitive.Value>
  const has = m.value !== undefined && m.value !== null && m.value !== ""
  const label = children ?? (has ? (m.labels[m.value] ?? m.value) : null)
  return (
    <span ref={ref} className={cn(!label && "text-muted-foreground", className)}>
      {label ?? placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const triggerClass = "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"

const SelectTrigger = React.forwardRef(({ className, children, asChild, ...props }, ref) => {
  const m = React.useContext(MobileCtx)
  if (m) {
    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={m.open}
        disabled={m.disabled || props.disabled}
        onClick={() => m.setOpen(true)}
        className={cn(triggerClass, className)}
        id={props.id}
        aria-label={props["aria-label"]}
        style={props.style}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
  return (
    <SelectPrimitive.Trigger ref={ref} asChild={asChild} className={cn(triggerClass, className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const m = React.useContext(MobileCtx)
  if (m) {
    return (
      <>
        {/* Hidden pass so the trigger can show the selected item's label while closed */}
        <ItemModeCtx.Provider value="register">
          <div hidden>{children}</div>
        </ItemModeCtx.Provider>
        <Vaul.Root open={m.open} onOpenChange={m.setOpen}>
          <Vaul.Portal>
            <Vaul.Overlay className="fixed inset-0 z-[70] bg-black/40" />
            <Vaul.Content className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[70vh] flex-col rounded-t-2xl border-t border-border bg-popover text-popover-foreground pb-[env(safe-area-inset-bottom)] outline-none">
              <div className="mx-auto mt-3 mb-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
              <Vaul.Title className="sr-only">Select an option</Vaul.Title>
              <div role="listbox" className="overflow-y-auto overscroll-contain px-2 pb-3">{children}</div>
            </Vaul.Content>
          </Vaul.Portal>
        </Vaul.Root>
      </>
    )
  }
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => {
  const m = React.useContext(MobileCtx)
  const cls = cn("px-2 py-1.5 text-sm font-semibold", className)
  if (m) return <div ref={ref} className={cls} {...props} />
  return <SelectPrimitive.Label ref={ref} className={cls} {...props} />
})
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, value, disabled, ...props }, ref) => {
  const m = React.useContext(MobileCtx)
  const mode = React.useContext(ItemModeCtx)
  React.useEffect(() => {
    if (m && mode === "register") m.register(value, children)
  })
  if (m) {
    if (mode === "register") return null
    const selected = m.value === value
    return (
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={() => m.select(value)}
        className={cn(
          "relative flex w-full min-h-[44px] select-none items-center rounded-lg py-2 pl-3 pr-10 text-left text-base outline-none active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          selected && "font-semibold text-primary",
          className
        )}
      >
        {selected && (
          <span className="absolute right-3 flex h-4 w-4 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
        {children}
      </button>
    )
  }
  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => {
  const m = React.useContext(MobileCtx)
  const cls = cn("-mx-1 my-1 h-px bg-muted", className)
  if (m) return <div ref={ref} className={cls} {...props} />
  return <SelectPrimitive.Separator ref={ref} className={cls} {...props} />
})
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}