import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { verifyTechToken, techTestAI } from '../../services/techTestInvite'

/** Page publique : test technique (sans layout RH). */
export default function TechnicalTestPage() {
  const [searchParams] = useSearchParams()
  /** Jeton URL : trim + retirer espaces (copier-coller depuis certains clients mail) */
  const token = (searchParams.get('t') || '').trim().replace(/\s/g, '')

  const [step, setStep] = useState('loading')
  const [error, setError] = useState('')
  const [emailExpected, setEmailExpected] = useState('')
  const [name, setName] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [mediaOk, setMediaOk] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)

  const [exercise, setExercise] = useState(null)
  const [code, setCode] = useState('// Votre code ici')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [evaluating, setEvaluating] = useState(false)
  const [result, setResult] = useState(null)
  const [autoPhase2, setAutoPhase2] = useState(false)
  const [failReason, setFailReason] = useState(null)

  const stepRef = useRef(step)
  stepRef.current = step

  useEffect(() => {
    if (!token) {
      setError('Lien invalide (paramètre t manquant).')
      setStep('error')
      return
    }
    let cancelled = false
    ;(async () => {
      const data = await verifyTechToken(token)
      if (cancelled) return
      if (!data.ok) {
        setError(data.error || 'Lien invalide ou expiré.')
        setStep('error')
        return
      }
      setEmailExpected(data.email || '')
      setName(data.name || '')
      setStep('email')
    })()
    return () => { cancelled = true }
  }, [token])

  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement
    try {
      if (el.requestFullscreen) await el.requestFullscreen()
    } catch {
      setError('Plein écran refusé — le test exige le mode plein écran.')
      setStep('error')
    }
  }, [])

  const startMedia = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
      setMediaOk(true)
    } catch {
      setError('Caméra et micro obligatoires pour ce test.')
      setStep('error')
    }
  }, [])

  const startTest = useCallback(async () => {
    setStep('generating')
    const data = await techTestAI({ action: 'generate', token })
    if (!data.ok) {
      setError(data.error || 'Impossible de générer l’exercice.')
      setStep('error')
      return
    }
    const ex = data.exercise || {}
    setExercise(ex)
    setCode(typeof ex.starterCode === 'string' ? ex.starterCode : '// ...')
    const mins = Number(ex.durationMinutes) || 45
    setSecondsLeft(mins * 60)
    setStep('test')
  }, [token])

  useEffect(() => {
    if (step !== 'test') return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          setFailReason('time')
          setStep('failed')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [step])

  useEffect(() => {
    if (step !== 'test') return
    const onVis = () => {
      if (document.visibilityState === 'hidden' && stepRef.current === 'test') {
        setFailReason('cheat')
        setStep('failed')
      }
    }
    const onFs = () => {
      if (!document.fullscreenElement && stepRef.current === 'test') {
        setFailReason('cheat')
        setStep('failed')
      }
    }
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [step])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stream])

  const submitCode = async () => {
    setEvaluating(true)
    try {
      const data = await techTestAI({
        action: 'evaluate',
        token,
        code,
        exercise,
      })
      if (!data.ok) {
        setError(data.error || 'Évaluation impossible.')
        setStep('error')
        return
      }
      setResult(data.result)
      setAutoPhase2(Boolean(data.autoPhase2))
      setStep('done')
    } finally {
      setEvaluating(false)
    }
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const bg = {
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    padding: '24px',
    fontFamily: 'var(--font-body)',
  }

  if (step === 'loading') {
    return (
      <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text3)' }}>Vérification du lien…</span>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={{ ...bg, maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Erreur</h1>
        <p style={{ color: 'var(--red)', marginTop: '12px' }}>{error}</p>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <div style={{ ...bg, maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>Test technique</h1>
        <p style={{ color: 'var(--text2)', marginTop: '12px', lineHeight: 1.5 }}>
          Bonjour {name}. Confirmez votre adresse e-mail (celle du dossier) pour continuer.
        </p>
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="votre@email.com"
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border2)',
            background: 'var(--card)',
            color: 'var(--text)',
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (emailInput.trim().toLowerCase() !== emailExpected.toLowerCase()) {
              alert('L’e-mail ne correspond pas à l’invitation.')
              return
            }
            setStep('fullscreen')
          }}
          style={{
            marginTop: '16px',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--grad-cyan)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Continuer
        </button>
      </div>
    )
  }

  if (step === 'fullscreen') {
    return (
      <div style={{ ...bg, maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Plein écran obligatoire</h1>
        <p style={{ color: 'var(--text2)', marginTop: '12px' }}>
          Le test se déroule en plein écran. Quitter le plein écran ou changer d’onglet entraîne l’échec.
        </p>
        <button
          type="button"
          onClick={async () => {
            await enterFullscreen()
            setStep('media')
          }}
          style={{
            marginTop: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--grad-cyan)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Passer en plein écran
        </button>
      </div>
    )
  }

  if (step === 'media') {
    return (
      <div style={{ ...bg, maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Caméra & micro</h1>
        <p style={{ color: 'var(--text2)', marginTop: '12px' }}>
          Autorisez la caméra et le microphone pour démarrer.
        </p>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', maxWidth: 400, borderRadius: '8px', marginTop: '16px', background: '#000' }}
        />
        {!mediaOk ? (
          <button
            type="button"
            onClick={startMedia}
            style={{
              marginTop: '16px',
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--grad-cyan)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Activer caméra & micro
          </button>
        ) : (
          <button
            type="button"
            onClick={startTest}
            style={{
              marginTop: '16px',
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--grad-cyan)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Démarrer le test
          </button>
        )}
      </div>
    )
  }

  if (step === 'generating') {
    return (
      <div style={{ ...bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text3)' }}>Génération de l’exercice (IA)…</span>
      </div>
    )
  }

  if (step === 'failed') {
    return (
      <div style={{ ...bg, maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--red)', fontFamily: 'var(--font-display)' }}>Test terminé</h1>
        <p style={{ marginTop: '16px', color: 'var(--text2)' }}>
          {failReason === 'cheat'
            ? 'Vous avez quitté le plein écran ou changé d’onglet : échec (anti-triche).'
            : 'Temps écoulé.'}
        </p>
      </div>
    )
  }

  if (step === 'test' && exercise) {
    return (
      <div style={{ ...bg, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: 0 }}>{exercise.title}</h1>
          <span style={{ fontSize: '20px', fontWeight: 800, color: secondsLeft < 300 ? 'var(--red)' : 'var(--cyan)' }}>
            {fmt(secondsLeft)}
          </span>
        </div>
        <p style={{ color: 'var(--text2)', marginTop: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {exercise.instructionsFr}
        </p>
        <div style={{ marginTop: '16px', border: '1px solid var(--border2)', borderRadius: '8px', overflow: 'hidden', minHeight: 360 }}>
          <Editor
            height="360px"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || '')}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        </div>
        <button
          type="button"
          disabled={evaluating || secondsLeft <= 0}
          onClick={submitCode}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--grad-cyan)',
            color: '#fff',
            fontWeight: 700,
            cursor: evaluating ? 'wait' : 'pointer',
          }}
        >
          {evaluating ? 'Évaluation…' : 'Envoyer pour correction IA'}
        </button>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div style={{ ...bg, maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px' }}>Résultat</h1>
        <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--cyan)', marginTop: '12px' }}>
          {result.score ?? '—'} / 100
        </p>
        <p style={{ color: result.passed ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
          {result.passed ? 'Réussi' : 'À retravailler'}
        </p>
        {autoPhase2 && (
          <p
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(0,230,118,0.08)',
              border: '1px solid rgba(0,230,118,0.25)',
              color: 'var(--green)',
              fontWeight: 600,
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            Votre score est supérieur à 80/100 : vous passez automatiquement à l’étape suivante (test physique / entretien). Le service RH
            pourra vous convoquer via e-mail (Teams).
          </p>
        )}
        <p style={{ color: 'var(--text2)', marginTop: '16px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {result.feedbackFr}
        </p>
      </div>
    )
  }

  return null
}
