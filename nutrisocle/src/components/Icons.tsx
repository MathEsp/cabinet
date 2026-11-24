import type { ReactNode } from 'react'

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const IconHome = () => (
  <Svg><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>
)
export const IconSyringe = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 0 1 0-1.4L15 5" />
    <path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" />
  </Svg>
)
export const IconLeaf = () => (
  <Svg><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.9-5.4 5.1-6" /></Svg>
)
export const IconDumbbell = () => (
  <Svg><path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" /><path d="M3 9.5v5" /><path d="M21 9.5v5" /><path d="M6.5 12h11" /></Svg>
)
export const IconUser = () => (
  <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
)
export const IconPlus = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
)
export const IconMinus = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M5 12h14" /></Svg>
)
export const IconBack = () => (
  <Svg size={20}><path d="m15 6-6 6 6 6" /></Svg>
)
export const IconChevron = () => (
  <Svg size={20}><path d="m9 6 6 6-6 6" /></Svg>
)
export const IconSearch = () => (
  <Svg size={18}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
)
export const IconBarcode = () => (
  <Svg>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 8v8" /><path d="M10 8v8" /><path d="M13 8v8" /><path d="M17 8v8" />
  </Svg>
)
export const IconTrash = () => (
  <Svg size={18}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></Svg>
)
export const IconMail = () => (
  <Svg size={18}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>
)
export const IconPhone = () => (
  <Svg size={18}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Svg>
)
export const IconCheck = () => (
  <Svg size={20}><path d="M20 6 9 17l-5-5" /></Svg>
)
export const IconClose = () => (
  <Svg size={20}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
)

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="9" y="4" width="10" height="6" rx="2.5" fill="#F08A4B" />
      <rect x="5" y="11" width="18" height="6" rx="2.5" fill="#5FA585" />
      <rect x="1" y="18" width="26" height="6" rx="2.5" fill="#2F7A5F" />
    </svg>
  )
}
