import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

/**
 * iOS-style bottom sheet: backdrop fades, panel slides up, Escape closes,
 * and the page behind it stops scrolling while it's open.
 *
 * `footer` renders outside the scroll area, pinned to the bottom of the panel —
 * use it for the action that commits the form.
 */
export function Sheet({ open, onClose, title, footer, children }) {
  const panelRef = useRef(null)
  const scrollRef = useRef(null)
  const [moreBelow, setMoreBelow] = useState(false)

  // Whether the form continues past the bottom edge. Re-measured on scroll and
  // whenever the content changes size — ticking "I didn't work this day" or
  // adding an expense can make a sheet that fit start to overflow, or the
  // reverse.
  useEffect(() => {
    const el = scrollRef.current
    if (!open || !el) return

    const measure = () =>
      setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 24)

    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)

    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [open])

  function scrollDown() {
    const el = scrollRef.current
    el?.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the panel so screen readers land inside the sheet, not behind it.
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[94dvh] w-full animate-sheet-in flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-card outline-none sm:max-h-[92dvh] sm:max-w-md sm:rounded-[28px]"
      >
        {/* Grab handle: the sheet slides from the bottom, so it should look
            like something you can push back down. */}
        <span
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line sm:hidden"
        />

        <div className="flex items-center justify-between border-b border-line px-5 pt-3 pb-3">
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-full p-1.5 text-muted transition-colors active:bg-surface-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* min-h-0 with flex-1: the scroll area, not the panel, absorbs a form
            taller than the screen, so the header and the action bar keep their
            own height instead of being squeezed off a short phone viewport. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className={`no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pt-3.5 ${
              footer ? 'pb-6' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'
            }`}
          >
            {children}
          </div>

          {/* The scrollbar is hidden, so on a phone nothing said the form went
              on below the fold, or that the expenses were down there at all.
              This shows only while there is more to see, and scrolls to it. */}
          <button
            type="button"
            onClick={scrollDown}
            aria-label="Scroll down for more"
            tabIndex={moreBelow ? 0 : -1}
            aria-hidden={!moreBelow}
            className={`absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full bg-surface-2 py-1.5 pr-3 pl-2.5 text-[12px] font-semibold text-muted shadow-card ring-1 ring-line transition-all duration-200 hover:text-ink active:scale-95 ${
              moreBelow ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            }`}
          >
            <ChevronDown size={15} className="animate-bounce" />
            More below
          </button>
        </div>

        {/* A pinned action bar. These forms are long enough that on a phone
            the submit button sat below the fold, so committing an entry meant
            scrolling past every field to find it. */}
        {footer ? (
          <div className="relative shrink-0 border-t border-line bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Fade the last of the scroll area into the bar, so content that
                continues below reads as continuing rather than as cut off. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-7 h-7 bg-gradient-to-t from-surface to-transparent"
            />
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
