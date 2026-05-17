import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [loading, setLoading] = useState(false)

  const requestCameraPermission = async () => {
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stream.getTracks().forEach((track) => track.stop())
      setPermissionGranted(true)
      setPermissionDenied(false)
    } catch (err) {
      console.error('Camera permission denied:', err)
      setPermissionDenied(true)
      setPermissionGranted(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!permissionGranted) return

    const scannerId = 'qr-scanner-container'
    let isMounted = true

    async function startScanner() {
      try {
        const scanner = new Html5Qrcode(scannerId, { verbose: false })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isMounted) return
            if (scannedRef.current) return
            scannedRef.current = true
            onScan(decodedText)
          },
          () => {
            // per-frame decode error, ignore
          }
        )
      } catch (err) {
        console.error('QR scanner start error:', err)
      }
    }

    startScanner()

    return () => {
      isMounted = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          const stopResult = scanner.stop()
          if (stopResult && typeof stopResult.catch === 'function') {
            stopResult.catch((err) => {
              console.warn('QR scanner stop error (ignored):', err?.message || err)
            })
          }
        } catch (err) {
          console.warn('QR scanner stop threw (ignored):', err?.message || err)
        }
      }
    }
  }, [permissionGranted, onScan])

  if (!permissionGranted && !permissionDenied) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', padding: '20px' }}>
        <p style={{ fontSize: '14px', color: '#374151', textAlign: 'center', margin: 0 }}>카메라 접근 권한이 필요합니다</p>
        <button
          onClick={requestCameraPermission}
          disabled={loading}
          style={{
            backgroundColor: '#f97316',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingTop: '10px',
            paddingBottom: '10px',
            borderRadius: '8px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '권한 확인 중...' : '권한 허용'}
        </button>
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', padding: '20px' }}>
        <p style={{ fontSize: '14px', color: '#dc2626', textAlign: 'center', margin: 0 }}>카메라 권한이 거부되었습니다</p>
        <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: 0 }}>설정에서 카메라 권한을 허용해주세요</p>
        <button
          onClick={() => {
            setPermissionDenied(false)
            requestCameraPermission()
          }}
          style={{
            backgroundColor: '#f97316',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
      <div
        id="qr-scanner-container"
        style={{ width: '100%', maxWidth: '320px', borderRadius: '16px', overflow: 'hidden', aspectRatio: '1' }}
      />
      <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: 0 }}>매장 QR 코드를 스캔해주세요</p>
    </div>
  )
}
