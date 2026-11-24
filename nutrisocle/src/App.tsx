import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav, ToastProvider } from './components/ui'
import { useProfile } from './hooks'
import Accueil from './pages/Accueil'
import Activite from './pages/Activite'
import AjoutAliment from './pages/AjoutAliment'
import Bienvenue from './pages/Bienvenue'
import InjectionPage from './pages/InjectionPage'
import Nutrition from './pages/Nutrition'
import Profil from './pages/Profil'

function Routed() {
  const profile = useProfile()
  const location = useLocation()

  // null = lecture en cours, undefined = aucun profil (premier lancement).
  if (profile === null) return null
  if (!profile) return <Bienvenue />

  const sansNav = location.pathname.startsWith('/nutrition/ajouter')
  return (
    <>
      <Routes>
        <Route path="/" element={<Accueil profile={profile} />} />
        <Route path="/injection" element={<InjectionPage profile={profile} />} />
        <Route path="/nutrition" element={<Nutrition profile={profile} />} />
        <Route path="/nutrition/ajouter" element={<AjoutAliment />} />
        <Route path="/activite" element={<Activite profile={profile} />} />
        <Route path="/profil" element={<Profil profile={profile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!sansNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="app">
          <Routed />
        </div>
      </ToastProvider>
    </HashRouter>
  )
}
