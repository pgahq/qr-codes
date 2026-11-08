import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

export interface QrContextMenuItem {
  label: string
  onSelect: () => void
  disabled?: boolean
}

interface QrContextMenuProps {
  x: number
  y: number
  label: string
  items: QrContextMenuItem[]
  onClose: () => void
}

const VIEWPORT_MARGIN = 8

/** A small right-click menu rendered in a portal so page transforms and overflow cannot clip it. */
export function QrContextMenu({ x, y, label, items, onClose }: QrContextMenuProps) {
  const menu = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect()
    if (!box) return
    setPosition({
      left: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - box.width - VIEWPORT_MARGIN)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - box.height - VIEWPORT_MARGIN))
    })
  }, [x, y])

  useEffect(() => {
    menu.current?.focus({ preventScroll: true })

    const close = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return
      onClose()
    }
    const dismiss = () => onClose()
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('contextmenu', close, true)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    window.addEventListener('blur', dismiss)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('contextmenu', close, true)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('blur', dismiss)
    }
  }, [onClose])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    const target = index < 0 ? (step === 1 ? 0 : buttons.length - 1) : (index + step + buttons.length) % buttons.length
    buttons[target]?.focus()
  }

  return createPortal(
    <div
      ref={menu}
      role="menu"
      tabIndex={-1}
      aria-label={label}
      className="pga-qr-menu"
      style={{ left: position.left, top: position.top }}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className="pga-qr-menu-item"
          disabled={item.disabled}
          onClick={() => {
            onClose()
            item.onSelect()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  )
}
