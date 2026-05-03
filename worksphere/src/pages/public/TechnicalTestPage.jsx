import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { FilesetResolver, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision'
import { verifyTechToken, techTestAI } from '../../services/techTestInvite'

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const OBJECT_DETECTOR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'

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

function detectFaceOrientationFromMesh(landmarks) {
  const nose = landmarks?.[1]
  const leftEye = landmarks?.[33]
  const rightEye = landmarks?.[263]
  if (!nose || !leftEye || !rightEye) return 'unknown'
  const eyeDistance = Math.abs(rightEye.x - leftEye.x) || 1
  const eyeMidX = (leftEye.x + rightEye.x) / 2
  const horizontalDrift = (nose.x - eyeMidX) / eyeDistance
  if (horizontalDrift <= -0.12) return 'left'
  if (horizontalDrift >= 0.12) return 'right'
  return 'center'
}

function detectionsContainPhone(detections) {
  if (!Array.isArray(detections)) return false
  return detections.some((detection) =>
    Array.isArray(detection?.categories) &&
    detection.categories.some((category) => {
      const label = String(category?.categoryName || category?.displayName || '').toLowerCase()
      const score = Number(category?.score || 0)
      return score >= 0.35 && (
        label.includes('phone') ||
        label.includes('cell phone') ||
        label.includes('mobile phone') ||
        label.includes('telephone')
      )
    }),
  )
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
  const faceLandmarkerRef = useRef(null)
  const objectDetectorRef = useRef(null)
  const visionInitPromiseRef = useRef(null)

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

  const initAdvancedSurveillance = useCallback(async () => {
    if (faceLandmarkerRef.current && objectDetectorRef.current) return true
    if (visionInitPromiseRef.current) return visionInitPromiseRef.current

    visionInitPromiseRef.current = (async () => {
      try {
        setCameraSupport('loading')
        setCameraStatus('Initialisation de la surveillance avancée…')
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)
        const [faceLandmarker, objectDetector] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_LANDMARKER_MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.6,
            minFacePresenceConfidence: 0.6,
            minTrackingConfidence: 0.6,
          }),
          ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: OBJECT_DETECTOR_MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            maxResults: 5,
            scoreThreshold: 0.3,
          }),
        ])
        faceLandmarkerRef.current = faceLandmarker
        objectDetectorRef.current = objectDetector
        setCameraSupport('advanced')
        setCameraStatus('Surveillance avancée active. Gardez votre visage bien en face.')
        return true
      } catch {
        faceLandmarkerRef.current = null
        objectDetectorRef.current = null
        setCameraSupport('basic')
        setCameraStatus('Caméra active. Surveillance avancée indisponible, contrôle basique actif.')
        return false
      } finally {
        visionInitPromiseRef.current = null
      }
    })()

    return visionInitPromiseRef.current
  }, [])

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
      void initAdvancedSurveillance()
    } catch {
      setError('Caméra et micro obligatoires pour ce test.')
      setStep('error')
    }
  }, [initAdvancedSurveillance])

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
      faceLandmarkerRef.current?.close?.()
      objectDetectorRef.current?.close?.()
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

    const inspectFace = async () => {
      if (cancelled || stepRef.current !== 'test') return
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        timerId = window.setTimeout(inspectFace, 500)
        return
      }
      if (!videoTrack || videoTrack.readyState !== 'live') {
        stopFor('camera')
        return
      }
      try {
        const ready = await initAdvancedSurveillance()
        if (!ready || !faceLandmarkerRef.current || !objectDetectorRef.current) {
          timerId = window.setTimeout(inspectFace, 700)
          return
        }

        const now = performance.now()
        const faceResult = faceLandmarkerRef.current.detectForVideo(video, now)
        const landmarks = Array.isArray(faceResult?.faceLandmarks) ? faceResult.faceLandmarks : []
        if (landmarks.length !== 1) {
          setCameraStatus('Visage non détecté. Regardez la caméra.')
          stopFor('face-missing')
          return
        }
        const orientation = detectFaceOrientationFromMesh(landmarks[0])
        if (orientation === 'left' || orientation === 'right') {
          setCameraStatus(`Visage tourné vers la ${orientation === 'left' ? 'gauche' : 'droite'}. Revenez face caméra.`)
          stopFor('face-turned')
          return
        }

        const objectResult = objectDetectorRef.current.detectForVideo(video, now)
        if (detectionsContainPhone(objectResult?.detections)) {
          setCameraStatus('Téléphone détecté devant la caméra.')
          stopFor('phone')
          return
        }

        setCameraStatus('Surveillance avancée active. Visage détecté face caméra.')
      } catch {
        setCameraStatus('Caméra active. Analyse vidéo momentanément indisponible.')
      }
      timerId = window.setTimeout(inspectFace, 700)
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
    background:
      'radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 26%), radial-gradient(circle at bottom right, rgba(6,182,212,0.1), transparent 24%), var(--bg)',
    color: 'var(--text)',
    padding: '32px 24px 56px',
    fontFamily: 'var(--font-body)',
  }
  const faceDetectorNote =
    'Point important: la surveillance avancée visage/téléphone est plus fiable sur les navigateurs modernes. Si elle ne peut pas être chargée, la page garde au minimum un contrôle basique caméra/micro actif.'
  const shellStyle = {
    maxWidth: '1180px',
    margin: '0 auto',
    width: '100%',
  }
  const centerWrapStyle = {
    ...shellStyle,
    minHeight: 'calc(100vh - 88px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const panelStyle = {
    width: '100%',
    maxWidth: '620px',
    background: 'linear-gradient(180deg, rgba(26,58,82,0.94), rgba(15,41,64,0.94))',
    border: '1px solid var(--border2)',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
    backdropFilter: 'blur(14px)',
  }
  const pageEyebrowStyle = {
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--cyan)',
    fontWeight: 700,
  }
  const panelTitleStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    lineHeight: 1.15,
    margin: '10px 0 0',
    color: 'var(--text)',
  }
  const panelTextStyle = {
    color: 'var(--text2)',
    marginTop: '12px',
    lineHeight: 1.65,
    fontSize: '14px',
  }
  const inputBaseStyle = {
    width: '100%',
    marginTop: '18px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border2)',
    background: 'rgba(15, 41, 64, 0.78)',
    color: 'var(--text)',
    outline: 'none',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
  }
  const primaryButtonStyle = {
    padding: '13px 22px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--grad-cyan)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 32px rgba(6,182,212,0.26)',
  }
  const secondaryButtonStyle = {
    padding: '13px 22px',
    borderRadius: '12px',
    border: '1px solid var(--border2)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  }
  const noteCardStyle = {
    marginTop: '18px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: 'rgba(6,182,212,0.12)',
    border: '1px solid var(--border2)',
    color: 'var(--text2)',
    fontSize: '13px',
    lineHeight: 1.7,
  }
  const simpleStatusStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'var(--text2)',
    fontSize: '12px',
    fontWeight: 600,
  }
  const testCardStyle = {
    background: 'linear-gradient(180deg, rgba(22,56,77,0.96), rgba(15,41,64,0.96))',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    padding: '20px',
    boxShadow: '0 18px 56px rgba(0,0,0,0.24)',
  }
  const sideCardStyle = {
    ...testCardStyle,
    padding: '16px',
    position: 'sticky',
    top: '18px',
  }
  const timerBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '92px',
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid var(--border2)',
    background: 'rgba(15,41,64,0.92)',
    fontSize: '20px',
    fontWeight: 800,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  }
  const sectionLabelStyle = {
    fontSize: '12px',
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
    marginBottom: '10px',
  }
  const helperTextStyle = {
    marginTop: '10px',
    fontSize: '12px',
    color: 'var(--text3)',
    lineHeight: 1.6,
  }

  if (step === 'loading') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '460px', textAlign: 'center' }}>
            <div style={pageEyebrowStyle}>Test technique</div>
            <h1 style={{ ...panelTitleStyle, fontSize: '26px' }}>Vérification du lien</h1>
            <p style={panelTextStyle}>Préparation de votre session sécurisée…</p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '560px' }}>
            <div style={pageEyebrowStyle}>Accès impossible</div>
            <h1 style={panelTitleStyle}>Une erreur est survenue</h1>
            <p style={{ ...panelTextStyle, color: 'var(--red)' }}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '520px' }}>
            <div style={pageEyebrowStyle}>Étape 1</div>
            <h1 style={panelTitleStyle}>Vérification de l’identité</h1>
            <p style={panelTextStyle}>
              Bonjour {name}. Confirmez l’adresse e-mail associée à votre dossier pour accéder au test.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="votre@email.com"
              style={inputBaseStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
              <span style={simpleStatusStyle}>Session sécurisée</span>
              <button
                type="button"
                onClick={() => {
                  if (emailInput.trim().toLowerCase() !== emailExpected.toLowerCase()) {
                    alert('L’e-mail ne correspond pas à l’invitation.')
                    return
                  }
                  setStep('fullscreen')
                }}
                style={primaryButtonStyle}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'fullscreen') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '620px' }}>
            <div style={pageEyebrowStyle}>Étape 2</div>
            <h1 style={panelTitleStyle}>Plein écran obligatoire</h1>
            <p style={panelTextStyle}>
              Le test doit être passé en plein écran. Quitter le plein écran, changer d’onglet ou perdre le focus entraînera l’arrêt de la session.
            </p>
            <div style={noteCardStyle}>
              Pour une expérience fluide, fermez les applications inutiles avant de continuer et gardez uniquement cette page ouverte.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={async () => {
                  await enterFullscreen()
                  setStep('media')
                }}
                style={primaryButtonStyle}
              >
                Passer en plein écran
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'media') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '720px' }}>
            <div style={pageEyebrowStyle}>Étape 3</div>
            <h1 style={panelTitleStyle}>Caméra et micro</h1>
            <p style={panelTextStyle}>
              Autorisez l’accès à la caméra et au microphone. Votre visage doit rester visible et bien en face pendant toute l’épreuve.
            </p>
            <div style={noteCardStyle}>{faceDetectorNote}</div>
            <div
              style={{
                marginTop: '20px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(79,172,254,0.14)',
                background: '#05080d',
                width: '100%',
                maxWidth: '440px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover', background: '#000' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
              <span style={simpleStatusStyle}>{mediaOk ? 'Caméra et micro actifs' : 'Autorisation requise'}</span>
              {!mediaOk ? (
                <button type="button" onClick={startMedia} style={primaryButtonStyle}>
                  Activer caméra & micro
                </button>
              ) : (
                <button type="button" onClick={startTest} style={primaryButtonStyle}>
                  Démarrer le test
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'generating') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '520px', textAlign: 'center' }}>
            <div style={pageEyebrowStyle}>Préparation</div>
            <h1 style={{ ...panelTitleStyle, fontSize: '26px' }}>Génération de l’exercice</h1>
            <p style={panelTextStyle}>L’énoncé est en cours de préparation. Cela peut prendre quelques secondes.</p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'failed') {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '620px', textAlign: 'center' }}>
            <div style={{ ...pageEyebrowStyle, color: 'var(--red)' }}>Session interrompue</div>
            <h1 style={{ ...panelTitleStyle, color: 'var(--red)' }}>Test terminé</h1>
            <p style={panelTextStyle}>
              {failReason === 'page'
                ? 'Vous avez quitté la page, perdu le focus ou quitté le plein écran : échec (anti-triche).'
                : failReason === 'camera'
                  ? 'La caméra ou le micro ont été coupés pendant le test.'
                  : failReason === 'face-missing'
                    ? 'Votre visage n’a plus été détecté par la caméra.'
                    : failReason === 'face-turned'
                      ? 'Votre visage n’était plus en face de la caméra.'
                      : failReason === 'phone'
                        ? 'Un téléphone a été détecté devant la caméra.'
                      : 'Temps écoulé.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'test' && exercise) {
    const attemptsLeft = Math.max(0, 3 - runAttempts)
    return (
      <div style={bg}>
        <div style={shellStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <div style={{ maxWidth: '860px' }}>
              <div style={pageEyebrowStyle}>Épreuve en cours</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', lineHeight: 1.15, margin: '10px 0 0' }}>{exercise.title}</h1>
              <p style={{ color: 'var(--text2)', marginTop: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px' }}>
                {exercise.instructionsFr}
              </p>
            </div>
            <div style={{ ...timerBadgeStyle, color: secondsLeft < 300 ? 'var(--red)' : 'var(--cyan)' }}>{fmt(secondsLeft)}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '20px', alignItems: 'start' }}>
            <div style={testCardStyle}>
              <div style={sectionLabelStyle}>Éditeur de code</div>
              <div style={{ border: '1px solid var(--border2)', borderRadius: '14px', overflow: 'hidden', minHeight: 420, background: 'rgba(5,11,20,0.92)' }}>
                <Editor
                  height="420px"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, padding: { top: 14 } }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px' }}>
                <button
                  type="button"
                  disabled={runningSamples || evaluating || secondsLeft <= 0 || runAttempts >= 3}
                  onClick={runExamples}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: runningSamples || evaluating || secondsLeft <= 0 || runAttempts >= 3 ? 0.6 : 1,
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
                    ...primaryButtonStyle,
                    opacity: evaluating || secondsLeft <= 0 ? 0.7 : 1,
                    cursor: evaluating ? 'wait' : 'pointer',
                  }}
                >
                  {evaluating ? 'Envoi final…' : 'Terminer et envoyer'}
                </button>
              </div>
              <div style={helperTextStyle}>
                Vous pouvez tester vos exemples jusqu’à 3 fois. La note finale n’apparaît qu’après l’envoi final.
              </div>
              {runFeedback && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(8,19,34,0.88)',
                    border: '1px solid rgba(79,172,254,0.12)',
                  }}
                >
                  <div style={{ ...sectionLabelStyle, marginBottom: '8px' }}>Résultat d’exécution</div>
                  <div style={{ fontWeight: 700, marginBottom: '10px', fontSize: '15px' }}>Exécution exemple #{runFeedback.attempt}</div>
                  {runFeedback.type === 'error' ? (
                    <div style={{ color: 'var(--amber)', fontSize: '13px', lineHeight: 1.6 }}>{runFeedback.message}</div>
                  ) : (
                    <>
                      <div style={{ color: runFeedback.passed === runFeedback.total ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>
                        {runFeedback.passed} / {runFeedback.total} exemples réussis
                      </div>
                      <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
                        {runFeedback.results.map((item) => (
                          <div
                            key={item.label}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: `1px solid ${item.ok ? 'rgba(0,230,118,0.24)' : 'rgba(255,179,0,0.24)'}`,
                              background: item.ok ? 'rgba(0,230,118,0.05)' : 'rgba(255,179,0,0.05)',
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                              {item.label} {item.ok ? 'OK' : 'KO'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>
                              Entrée: {formatValue(item.args)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>
                              Attendu: {formatValue(item.expected)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>
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
            <aside style={sideCardStyle}>
              <div style={sectionLabelStyle}>Surveillance</div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', borderRadius: '14px', background: '#000', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6, fontWeight: 600 }}>
                {cameraStatus}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text3)', lineHeight: 1.6 }}>
                {cameraSupport === 'advanced'
                  ? 'Détection avancée active: visage face caméra et recherche de téléphone dans le cadre.'
                  : cameraSupport === 'loading'
                    ? 'Chargement de la détection avancée…'
                    : 'Détection basique active: caméra et flux audio/vidéo obligatoires.'}
              </div>
              <div style={{ ...noteCardStyle, marginTop: '14px', fontSize: '12px' }}>{faceDetectorNote}</div>
              <div style={{ ...helperTextStyle, marginTop: '14px' }}>
                Toute sortie de page, perte de focus, visage absent, tête détournée ou téléphone détecté peut interrompre immédiatement la session.
              </div>
            </aside>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div style={bg}>
        <div style={centerWrapStyle}>
          <div style={{ ...panelStyle, maxWidth: '720px' }}>
            <div style={pageEyebrowStyle}>Évaluation terminée</div>
            <h1 style={panelTitleStyle}>Résultat</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '18px' }}>
              <p style={{ fontSize: '42px', fontWeight: 800, color: 'var(--cyan)', margin: 0 }}>
                {result.score ?? '—'} / 100
              </p>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '999px',
                  background: result.passed ? 'rgba(0,230,118,0.08)' : 'rgba(255,179,0,0.08)',
                  border: `1px solid ${result.passed ? 'rgba(0,230,118,0.24)' : 'rgba(255,179,0,0.24)'}`,
                  color: result.passed ? 'var(--green)' : 'var(--amber)',
                  fontWeight: 700,
                }}
              >
                {result.passed ? 'Réussi' : 'À retravailler'}
              </span>
            </div>
            {autoPhase2 && (
              <p
                style={{
                  marginTop: '18px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(0,230,118,0.08)',
                  border: '1px solid rgba(0,230,118,0.22)',
                  color: 'var(--green)',
                  fontWeight: 600,
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                Votre score est supérieur à 80/100 : vous passez automatiquement à l’étape suivante (test physique / entretien). Le service RH pourra vous convoquer via e-mail (Teams).
              </p>
            )}
            <div style={{ ...noteCardStyle, marginTop: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ ...sectionLabelStyle, marginBottom: '8px' }}>Retour du correcteur</div>
              <p style={{ color: 'var(--text2)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px' }}>
                {result.feedbackFr}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
