import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * iOS-style bottom sheet: backdrop fades, panel slides up, Escape closes,
 * and the page behind it stops scrolling while it's open.
 *
 * `footer` renders outside the scroll area, pinned to the bottom of the panel —
 * use it for the action that commits the form.
 */
export function Sheet({ open, onClose, title, footer, children }) {
  const panelRef = useRef(null)

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
        <div
          className={`no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pt-3.5 ${
            footer ? 'pb-6' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'
          }`}
        >
          {children}
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
