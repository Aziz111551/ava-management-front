import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { verifyTechToken, techTestAI } from '../../services/techTestInvite'

function isObjectLike(value) {
  return value != null && typeof value === 'object'
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (isObjectLike(a) && isObjectLike(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key) => deepEqual(a[key], b[key]))
  }
  return false
}

function formatValue(value) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getLandmarkCenter(landmark) {
  const points = Array.isArray(landmark?.locations) ? landmark.locations : []
  if (!points.length) return null
  const sum = points.reduce((acc, point) => ({ x: acc.x + (point?.x || 0), y: acc.y + (point?.y || 0) }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function detectFaceOrientation(face) {
  const landmarks = Array.isArray(face?.landmarks) ? face.landmarks : []
  const leftEye = getLandmarkCenter(landmarks.find((item) => /left.*eye/i.test(item?.type || '')))
  const rightEye = getLandmarkCenter(landmarks.find((item) => /right.*eye/i.test(item?.type || '')))
  const nose = getLandmarkCenter(landmarks.find((item) => /nose/i.test(item?.type || '')))
  if (!leftEye || !rightEye || !nose) return 'center'
  const eyeDistance = Math.abs(rightEye.x - leftEye.x) || 1
  const midX = (leftEye.x + rightEye.x) / 2
  const drift = (nose.x - midX) / eyeDistance
  if (drift <= -0.18) return 'left'
  if (drift >= 0.18) return 'right'
  return 'center'
}

function buildRunnableFunction(code, functionName) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(functionName)) {
    throw new Error('Nom de fonction invalide pour exécuter les exemples.')
  }
  return new Function(
    `"use strict";\n${code}\nif (typeof ${functionName} !== "function") {\n  throw new Error("La fonction ${functionName}() est introuvable dans votre code.")\n}\nreturn ${functionName};`,
  )()
}

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
  const [runningSamples, setRunningSamples] = useState(false)
  const [runAttempts, setRunAttempts] = useState(0)
  const [runFeedback, setRunFeedback] = useState(null)
  const [cameraStatus, setCameraStatus] = useState('Caméra inactive.')
  const [cameraSupport, setCameraSupport] = useState('basic')

  const stepRef = useRef(step)
  stepRef.current = step
  const cameraLockRef = useRef(false)

  const stopMedia = useCallback(() => {
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
    setStream(null)
    setMediaOk(false)
  }, [stream])

  const failForFraud = useCallback(
    (reason) => {
      if (cameraLockRef.current || stepRef.current !== 'test') return
      cameraLockRef.current = true
      setFailReason(reason)
      setStep('failed')
    },
    [],
  )

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
      cameraLockRef.current = false
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
      setMediaOk(true)
      setCameraStatus('Caméra et micro actifs.')
    } catch {
      setError('Caméra et micro obligatoires pour ce test.')
      setStep('error')
    }
  }, [])

  const startTest = useCallback(async () => {
    setStep('generating')
    setRunAttempts(0)
    setRunFeedback(null)
    setResult(null)
    setAutoPhase2(false)
    setFailReason(null)
    cameraLockRef.current = false
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
        failForFraud('page')
      }
    }
    const onFs = () => {
      if (!document.fullscreenElement && stepRef.current === 'test') {
        failForFraud('page')
      }
    }
    const onBlur = () => {
      if (stepRef.current === 'test') {
        failForFraud('page')
      }
    }
    const onPageHide = () => {
      if (stepRef.current === 'test') {
        failForFraud('page')
      }
    }
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('fullscreenchange', onFs)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('fullscreenchange', onFs)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [step, failForFraud])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream, step])

  useEffect(() => {
    if (stream && !['media', 'generating', 'test'].includes(step)) {
      stopMedia()
    }
  }, [step, stream, stopMedia])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stream])

  useEffect(() => {
    if (step !== 'test' || !stream) return

    const videoTrack = stream.getVideoTracks?.()[0]
    const audioTrack = stream.getAudioTracks?.()[0]
    let cancelled = false
    let timerId = null

    const stopFor = (reason) => {
      if (cancelled) return
      failForFraud(reason)
    }

    if (videoTrack) {
      videoTrack.onended = () => stopFor('camera')
      videoTrack.onmute = () => stopFor('camera')
      videoTrack.onunmute = () => setCameraStatus('Caméra active. Visage détecté.')
    }
    if (audioTrack) {
      audioTrack.onended = () => stopFor('camera')
      audioTrack.onmute = () => stopFor('camera')
    }

    if (!('FaceDetector' in window)) {
      setCameraSupport('basic')
      setCameraStatus('Caméra active. Surveillance basique active sur ce navigateur.')
      timerId = window.setInterval(() => {
        if (!videoTrack || videoTrack.readyState !== 'live') stopFor('camera')
      }, 1000)
      return () => {
        cancelled = true
        if (timerId) window.clearInterval(timerId)
      }
    }

    setCameraSupport('advanced')
    setCameraStatus('Caméra active. Gardez votre visage en face de l’écran.')
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 })

    const inspectFace = async () => {
      if (cancelled || stepRef.current !== 'test') return
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        timerId = window.setTimeout(inspectFace, 1200)
        return
      }
      try {
        const faces = await detector.detect(video)
        if (!faces.length) {
          setCameraStatus('Visage non détecté. Regardez la caméra.')
          stopFor('face-missing')
          return
        } else {
          const orientation = detectFaceOrientation(faces[0])
          if (orientation === 'left' || orientation === 'right') {
            setCameraStatus(`Visage tourné vers la ${orientation === 'left' ? 'gauche' : 'droite'}. Revenez face caméra.`)
            stopFor('face-turned')
            return
          } else {
            setCameraStatus('Caméra active. Visage détecté.')
          }
        }
      } catch {
        setCameraStatus('Caméra active. Analyse visage momentanément indisponible.')
      }
      timerId = window.setTimeout(inspectFace, 1500)
    }

    inspectFace()

    return () => {
      cancelled = true
      if (timerId) window.clearTimeout(timerId)
      if (videoTrack) {
        videoTrack.onended = null
        videoTrack.onmute = null
        videoTrack.onunmute = null
      }
      if (audioTrack) {
        audioTrack.onended = null
        audioTrack.onmute = null
      }
    }
  }, [step, stream, failForFraud])

  const runExamples = async () => {
    if (!exercise || runningSamples || evaluating || runAttempts >= 3) return
    const sampleTests = Array.isArray(exercise.sampleTests) ? exercise.sampleTests : []
    const functionName = String(exercise.functionName || '').trim()
    const nextAttempt = runAttempts + 1

    if (!sampleTests.length) {
      setRunAttempts(nextAttempt)
      setRunFeedback({
        type: 'error',
        attempt: nextAttempt,
        message: 'Aucun test d’exemple disponible pour cet exercice.',
      })
      return
    }

    setRunningSamples(true)
    try {
      const candidateFn = buildRunnableFunction(code, functionName)
      const results = []
      let passed = 0

      for (const sample of sampleTests) {
        let actual
        let ok = false
        let errorMessage = ''
        try {
          actual = candidateFn(...sample.args)
          if (actual && typeof actual.then === 'function') {
            actual = await actual
          }
          ok = deepEqual(actual, sample.expected)
          if (ok) passed += 1
        } catch (err) {
          errorMessage = err?.message || 'Erreur d’exécution'
        }

        results.push({
          label: sample.label,
          args: sample.args,
          expected: sample.expected,
          actual,
          ok,
          errorMessage,
        })
      }

      setRunAttempts(nextAttempt)
      setRunFeedback({
        type: 'result',
        attempt: nextAttempt,
        passed,
        total: results.length,
        results,
      })
    } catch (err) {
      setRunAttempts(nextAttempt)
      setRunFeedback({
        type: 'error',
        attempt: nextAttempt,
        message: err?.message || 'Impossible d’exécuter votre code.',
      })
    } finally {
      setRunningSamples(false)
    }
  }

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
  const faceDetectorNote =
    'Point important: la détection gauche/droite est plus fiable sur les navigateurs qui supportent FaceDetector (Chrome/Edge récents). Sinon, la page garde une surveillance basique caméra/micro active.'

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
        <div
          style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'rgba(32,178,170,0.08)',
            border: '1px solid rgba(32,178,170,0.2)',
            color: 'var(--text2)',
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          {faceDetectorNote}
        </div>
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
            : failReason === 'camera'
              ? 'La caméra ou le micro ont été coupés pendant le test.'
              : failReason === 'face-missing'
                ? 'Votre visage n’a plus été détecté par la caméra.'
                : failReason === 'face-turned'
                  ? 'Vous avez trop longtemps détourné le visage de la caméra.'
                  : 'Temps écoulé.'}
        </p>
      </div>
    )
  }

  if (step === 'test' && exercise) {
    const attemptsLeft = Math.max(0, 3 - runAttempts)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '16px', alignItems: 'start' }}>
          <div>
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
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
              <button
                type="button"
                disabled={runningSamples || evaluating || secondsLeft <= 0 || runAttempts >= 3}
                onClick={runExamples}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid var(--border2)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: runningSamples ? 'wait' : 'pointer',
                }}
              >
                {runningSamples ? 'Exécution…' : `Exécuter exemples (${attemptsLeft} restant${attemptsLeft > 1 ? 's' : ''})`}
              </button>
              <button
                type="button"
                disabled={evaluating || secondsLeft <= 0}
                onClick={submitCode}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--grad-cyan)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: evaluating ? 'wait' : 'pointer',
                }}
              >
                {evaluating ? 'Envoi final…' : 'Terminer et envoyer'}
              </button>
            </div>
            {runFeedback && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--card)',
                  border: '1px solid var(--border2)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>
                  Exécution exemple #{runFeedback.attempt}
                </div>
                {runFeedback.type === 'error' ? (
                  <div style={{ color: 'var(--amber)', fontSize: '13px' }}>{runFeedback.message}</div>
                ) : (
                  <>
                    <div style={{ color: runFeedback.passed === runFeedback.total ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
                      {runFeedback.passed} / {runFeedback.total} exemples réussis
                    </div>
                    <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                      {runFeedback.results.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${item.ok ? 'rgba(0,230,118,0.28)' : 'rgba(255,179,0,0.28)'}`,
                            background: item.ok ? 'rgba(0,230,118,0.06)' : 'rgba(255,179,0,0.06)',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                            {item.label} {item.ok ? 'OK' : 'KO'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
                            Entrée: {formatValue(item.args)}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
                            Attendu: {formatValue(item.expected)}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
                            Obtenu: {item.errorMessage ? item.errorMessage : formatValue(item.actual)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <aside
            style={{
              marginTop: '16px',
              border: '1px solid var(--border2)',
              borderRadius: '10px',
              padding: '12px',
              background: 'var(--card)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '10px' }}>Surveillance</div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', borderRadius: '8px', background: '#000', aspectRatio: '4 / 3', objectFit: 'cover' }}
            />
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
              {cameraStatus}
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>
              {cameraSupport === 'advanced'
                ? 'Détection active: caméra ouverte, visage présent, tête non détournée.'
                : 'Détection basique active: caméra et flux audio/vidéo obligatoires.'}
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text3)', lineHeight: 1.6 }}>
              {faceDetectorNote}
            </div>
            <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text3)', lineHeight: 1.6 }}>
              Vous pouvez exécuter les exemples au maximum 3 fois sans note finale. La note apparaît seulement après « Terminer et envoyer ».
            </div>
          </aside>
        </div>
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
