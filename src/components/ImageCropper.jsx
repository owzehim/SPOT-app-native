import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, Plus, Minus } from '@phosphor-icons/react'
import imageCompression from 'browser-image-compression'

// ── Compression helper ────────────────────────────────────────────────────────
const compressImage = async (file) => {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    })
    console.log(
      `Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`
    )
    return compressed
  } catch (err) {
    console.error('Compression failed, using original:', err)
    return file
  }
}

export function ImageCropper({ file, imageUrl, onCrop, onCancel, aspectRatios = ['1:1', '4:5'] }) {
  const [selectedRatio, setSelectedRatio] = useState(aspectRatios[0])
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastPinchDist, setLastPinchDist] = useState(null)
  const [cropBox, setCropBox] = useState(null)
  const [isCompressing, setIsCompressing] = useState(false) // ← NEW

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const rafRef = useRef(null)

  const [pan, setPan] = useState({ x: 0, y: 0 })

  const CANVAS_W = 340
  const CANVAS_H = 340

  // ── Load image ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setZoom(1)
      setPan({ x: 0, y: 0 })
      initCropBox(selectedRatio)
    }
    if (file) {
      img.src = URL.createObjectURL(file)
    } else if (imageUrl) {
      img.onerror = () => {
        const img2 = new Image()
        img2.onload = () => {
          imageRef.current = img2
          setZoom(1)
          setPan({ x: 0, y: 0 })
          initCropBox(selectedRatio)
        }
        img2.src = imageUrl
        imageRef.current = null
      }
      img.src = imageUrl
    }
  }, [file, imageUrl])

  // ── Init crop box ─────────────────────────────────────────────────────────────
  const initCropBox = useCallback((ratio) => {
    const [wPart, hPart] = ratio.split(':').map(Number)
    const maxW = CANVAS_W * 0.85
    const maxH = CANVAS_H * 0.85
    let boxW = maxW
    let boxH = boxW * (hPart / wPart)
    if (boxH > maxH) {
      boxH = maxH
      boxW = boxH * (wPart / hPart)
    }
    setCropBox({
      x: (CANVAS_W - boxW) / 2,
      y: (CANVAS_H - boxH) / 2,
      w: boxW,
      h: boxH,
    })
  }, [])

  // ── Draw ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [cropBox, zoom, pan])

  const draw = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !cropBox) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    const imgAspect = img.width / img.height
    const canvasAspect = CANVAS_W / CANVAS_H
    let baseW, baseH
    if (imgAspect > canvasAspect) {
      baseW = CANVAS_W
      baseH = CANVAS_W / imgAspect
    } else {
      baseH = CANVAS_H
      baseW = CANVAS_H * imgAspect
    }
    const drawW = baseW * zoom
    const drawH = baseH * zoom
    const drawX = (CANVAS_W - drawW) / 2 + pan.x
    const drawY = (CANVAS_H - drawH) / 2 + pan.y
    ctx.drawImage(img, drawX, drawY, drawW, drawH)

    const { x, y, w, h } = cropBox
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, CANVAS_W, y)
    ctx.fillRect(0, y + h, CANVAS_W, CANVAS_H - y - h)
    ctx.fillRect(0, y, x, h)
    ctx.fillRect(x + w, y, CANVAS_W - x - w, h)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + (w / 3) * i, y); ctx.lineTo(x + (w / 3) * i, y + h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y + (h / 3) * i); ctx.lineTo(x + w, y + (h / 3) * i); ctx.stroke()
    }

    const hs = 14
    ctx.fillStyle = '#3b82f6'
    ;[[x, y], [x + w - hs, y], [x, y + h - hs], [x + w - hs, y + h - hs]].forEach(([hx, hy]) => {
      ctx.fillRect(hx, hy, hs, hs)
    })
  }

  // ── Pointer helpers ───────────────────────────────────────────────────────────
  const getCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  const getPinchDist = (e) => {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // ── Drag / pinch ──────────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (e.touches?.length === 2) { setLastPinchDist(getPinchDist(e)); return }
    e.preventDefault()
    setIsDragging(true)
    setDragStart(getCanvasPoint(e))
  }

  const handlePointerMove = useCallback((e) => {
    if (e.touches?.length === 2) {
      if (lastPinchDist === null) return
      const dist = getPinchDist(e)
      const delta = (dist - lastPinchDist) / 150
      setZoom(z => Math.min(4, Math.max(1, z + delta)))
      setLastPinchDist(dist)
      return
    }
    if (!isDragging) return
    e.preventDefault()
    const pt = getCanvasPoint(e)
    const dx = pt.x - dragStart.x
    const dy = pt.y - dragStart.y
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    setDragStart(pt)
  }, [isDragging, dragStart, lastPinchDist])

  const handlePointerUp = () => { setIsDragging(false); setLastPinchDist(null) }

  useEffect(() => {
    document.addEventListener('mousemove', handlePointerMove, { passive: false })
    document.addEventListener('mouseup', handlePointerUp)
    document.addEventListener('touchmove', handlePointerMove, { passive: false })
    document.addEventListener('touchend', handlePointerUp)
    return () => {
      document.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('mouseup', handlePointerUp)
      document.removeEventListener('touchmove', handlePointerMove)
      document.removeEventListener('touchend', handlePointerUp)
    }
  }, [handlePointerMove])

  // ── Ratio change ──────────────────────────────────────────────────────────────
  const handleRatioChange = (ratio) => {
    setSelectedRatio(ratio)
    initCropBox(ratio)
  }

  // ── Crop + Compress ───────────────────────────────────────────────────────────
  const handleCrop = async () => {
    const img = imageRef.current
    if (!img || !cropBox) return

    const imgAspect = img.width / img.height
    const canvasAspect = CANVAS_W / CANVAS_H
    let baseW, baseH
    if (imgAspect > canvasAspect) {
      baseW = CANVAS_W
      baseH = CANVAS_W / imgAspect
    } else {
      baseH = CANVAS_H
      baseW = CANVAS_H * imgAspect
    }
    const drawW = baseW * zoom
    const drawH = baseH * zoom
    const drawX = (CANVAS_W - drawW) / 2 + pan.x
    const drawY = (CANVAS_H - drawH) / 2 + pan.y

    const scaleX = img.width / drawW
    const scaleY = img.height / drawH
    const srcX = (cropBox.x - drawX) * scaleX
    const srcY = (cropBox.y - drawY) * scaleY
    const srcW = cropBox.w * scaleX
    const srcH = cropBox.h * scaleY

    const clampedX = Math.max(0, srcX)
    const clampedY = Math.max(0, srcY)
    const clampedW = Math.min(srcW, img.width - clampedX)
    const clampedH = Math.min(srcH, img.height - clampedY)

    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(clampedW))
    out.height = Math.max(1, Math.round(clampedH))
    out.getContext('2d').drawImage(img, clampedX, clampedY, clampedW, clampedH, 0, 0, out.width, out.height)

    const mimeType = file?.type || 'image/jpeg'
    const fileName = file?.name || 'cropped.jpg'

    out.toBlob(async (blob) => {
      if (!blob) return

      setIsCompressing(true) // ← show loading state
      try {
        let croppedFile = new File([blob], fileName, { type: mimeType })
        croppedFile = await compressImage(croppedFile) // ← COMPRESSION
        onCrop(croppedFile)
      } finally {
        setIsCompressing(false)
      }
    }, mimeType, 0.92)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-sm space-y-3 max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="font-semibold text-gray-900 text-sm">이미지 자르기</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="mx-4 rounded-xl overflow-hidden bg-black touch-none select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', aspectRatio: '1/1' }}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full h-full block"
          />
        </div>

        <p className="px-4 text-xs text-gray-400">
          💡 이미지를 드래그하여 위치 조정, 핀치 또는 슬라이더로 확대
        </p>

        {/* Zoom */}
        <div className="px-4 flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(1, +(z - 0.1).toFixed(2)))}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0"
          >
            <Minus size={14} />
          </button>
          <input
            type="range" min="1" max="4" step="0.05" value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <button
            onClick={() => setZoom(z => Math.min(4, +(z + 0.1).toFixed(2)))}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0"
          >
            <Plus size={14} />
          </button>
          <span className="text-xs text-gray-400 w-8 text-right">{zoom.toFixed(1)}x</span>
        </div>

        {/* Ratio */}
        <div className="px-4">
          <p className="text-xs text-gray-500 mb-2">비율 선택</p>
          <div className="flex gap-2">
            {aspectRatios.map(ratio => (
              <button
                key={ratio}
                onClick={() => handleRatioChange(ratio)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRatio === ratio
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ratio === '4:5' ? '4:5 세로' : '1:1 정사각'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleCrop}
            disabled={isCompressing}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCompressing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                압축 중...
              </>
            ) : (
              <><Check size={16} weight="bold" />자르기</>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isCompressing}
            className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            취소
          </button>
        </div>

      </div>
    </div>
  )
}