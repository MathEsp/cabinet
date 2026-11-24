import { useState } from 'react'
import { db, type SymptomType } from '../db'
import { SYMPTOMES } from './symptomes'
import { dayKey } from '../lib/dates'
import { Modal, Segmented, useToast } from './ui'

export default function SymptomForm({ jourCycle, onClose }: { jourCycle: number | null; onClose: () => void }) {
  const [choix, setChoix] = useState<Partial<Record<SymptomType, 1 | 2 | 3>>>({})
  const toast = useToast()
  const types = Object.keys(choix) as SymptomType[]

  function basculer(type: SymptomType) {
    setChoix((c) => {
      const copie = { ...c }
      if (copie[type]) delete copie[type]
      else copie[type] = 1
      return copie
    })
  }

  async function enregistrer() {
    const key = dayKey()
    await db.symptoms.bulkAdd(types.map((type) => ({ dayKey: key, type, intensite: choix[type] ?? 1, jourCycle })))
    toast(types.length ? 'Noté. Prendre soin de soi, ça compte aussi.' : 'Super, une bonne journée !')
    onClose()
  }

  return (
    <Modal title="Comment je me sens" onClose={onClose}>
      <p className="petit">Touche ce que tu ressens aujourd’hui. Ça t’aidera, toi et ton soignant, à repérer ce qui revient selon le jour du cycle.</p>
      <div className="puces">
        {SYMPTOMES.map((s) => (
          <button key={s.type} type="button" className="puce" aria-pressed={Boolean(choix[s.type])} onClick={() => basculer(s.type)}>{s.label}</button>
        ))}
      </div>
      {types.map((type) => {
        const s = SYMPTOMES.find((x) => x.type === type)!
        return (
          <div key={type} className="carte" style={{ gap: 8 }}>
            <strong>{s.label}</strong>
            <Segmented
              label={`Intensité : ${s.label}`}
              value={choix[type] ?? 1}
              onChange={(v) => setChoix((c) => ({ ...c, [type]: v }))}
              options={[{ value: 1, label: 'Léger' }, { value: 2, label: 'Modéré' }, { value: 3, label: 'Fort' }]}
            />
            <p className="petit">{s.conseil}</p>
          </div>
        )
      })}
      <button type="button" className="btn large" onClick={enregistrer}>
        {types.length ? 'Enregistrer' : 'Tout va bien aujourd’hui'}
      </button>
    </Modal>
  )
}
