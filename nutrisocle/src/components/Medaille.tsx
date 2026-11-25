/** Médaille d'un badge : pleine (sauge et abricot) si obtenue, en pointillés sinon. */
export default function Medaille({ marque, obtenu, taille = 56 }: { marque: string; obtenu: boolean; taille?: number }) {
  const police = marque.length >= 3 ? 15 : marque.length === 2 ? 19 : 22
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true">
      {obtenu ? (
        <>
          <circle cx="32" cy="32" r="31" fill="#FDE8DA" />
          <circle cx="32" cy="32" r="25" fill="#2F7A5F" />
          <circle cx="32" cy="32" r="25" fill="none" stroke="#F08A4B" strokeWidth="2.5" strokeDasharray="3 4" />
          <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fontFamily="Nunito, system-ui, sans-serif" fontWeight="900" fontSize={police} fill="#FFFFFF">{marque}</text>
        </>
      ) : (
        <>
          <circle cx="32" cy="32" r="29" fill="#F3ECE3" stroke="#D9CFC4" strokeWidth="2" strokeDasharray="4 4" />
          <rect x="24" y="30" width="16" height="12" rx="2.5" fill="none" stroke="#6B6873" strokeWidth="2.2" />
          <path d="M27 30v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#6B6873" strokeWidth="2.2" />
        </>
      )}
    </svg>
  )
}
