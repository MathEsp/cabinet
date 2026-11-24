import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { fmt } from '../lib/text'
import { IconClose, IconHome, IconLeaf, IconSyringe, IconUser } from './Icons'

export function BottomNav() {
  const items = [
    { to: '/', label: 'Accueil', icon: <IconHome />, end: true },
    { to: '/injection', label: 'Injection', icon: <IconSyringe />, end: false },
    { to: '/nutrition', label: 'Nutrition', icon: <IconLeaf />, end: false },
    { to: '/profil', label: 'Profil', icon: <IconUser />, end: false },
  ]
  return (
    <nav className="nav" aria-label="Navigation principale">
      <ul>
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <span className="icone">{it.icon}</span>
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Gauge({ label, value, target, unit, color, track }: {
  label: string; value: number; target: number; unit: string; color: string; track: string
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="jauge">
      <div className="haut">
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: 'var(--doux)' }}>
          <strong style={{ color: 'var(--encre)' }}>{fmt(value)}</strong> / {fmt(target)} {unit}
        </span>
      </div>
      <div className="piste" style={{ background: track }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.round(value)}>
        <div className="rempli" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="segment" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fond-modal" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="ligne">
          <h2 className="pousse">{title}</h2>
          <button type="button" className="btn rond discret" aria-label="Fermer" onClick={onClose}><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((msg: string) => {
    setMessage(msg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 2800)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && <div className="toast" role="status">{message}</div>}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
