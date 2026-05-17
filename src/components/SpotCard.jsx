import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Ticket } from 'phosphor-react-native'
import { CATEGORY_ICONS } from '../lib/mapCategories'

export function RichText({ text, className = '' }) {
  if (!text) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: text }} />
}

function Lightbox({ imgs, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, imgs.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [imgs.length, onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '20px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          borderRadius: '999px',
          width: '36px',
          height: '36px',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
      >
        ×
      </button>

      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIndex((i) => i - 1)
          }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            borderRadius: '999px',
            width: '44px',
            height: '44px',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          ‹
        </button>
      )}

      <img
        src={imgs[index]}
        alt={'사진 ' + (index + 1)}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: '12px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      />

      {index < imgs.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIndex((i) => i + 1)
          }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            borderRadius: '999px',
            width: '44px',
            height: '44px',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          ›
        </button>
      )}

      {imgs.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {imgs.map((_, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                setIndex(i)
              }}
              style={{
                width: i === index ? '8px' : '6px',
                height: i === index ? '8px' : '6px',
                borderRadius: '999px',
                background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SpotCard({ selected, onClose }) {
  const [cardHeight, setCardHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [closing, setClosing] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const lastYRef = useRef(0)
  const cardRef = useRef(null)
  const swipeStartXRef = useRef(0)

  const imgs = selected?.['image_urls'] || []
  const hasImages = imgs.length > 0

  const { WIN_H, WIN_W } = useMemo(() => ({
    WIN_H: typeof window !== 'undefined' ? window.innerHeight : 700,
    WIN_W: typeof window !== 'undefined' ? window.innerWidth : 1024,
  }), [])

  const isDesktop = WIN_W >= 768
  const MIN_HEIGHT = Math.min(WIN_H * 0.38, 260)
  const MAX_HEIGHT = isDesktop ? 460 : WIN_H * 0.88

  useEffect(() => {
    setCardHeight(MIN_HEIGHT)
    setSlideIndex(0)
    setClosing(false)
  }, [selected, MIN_HEIGHT])

  const triggerClose = () => {
    setClosing(true)
    setTimeout(() => onClose(), 300)
  }

  const snapTo = (height) => setCardHeight(height)

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return
    startYRef.current = e.touches[0].clientY
    lastYRef.current = e.touches[0].clientY
    startHeightRef.current = hasImages ? cardHeight : cardRef.current?.offsetHeight || MIN_HEIGHT
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches || e.touches.length === 0) return
    lastYRef.current = e.touches[0].clientY
    const delta = startYRef.current - e.touches[0].clientY
    if (!hasImages && delta > 0) return
    if (hasImages) {
      const newHeight = Math.min(MAX_HEIGHT, Math.max(0, startHeightRef.current + delta))
      setCardHeight(newHeight)
    }
  }

  const handleTouchEnd = (e) => {
    setIsDragging(false)
    const delta = startYRef.current - lastYRef.current
    const startH = startHeightRef.current
    const wasMax = startH >= MAX_HEIGHT * 0.85
    const wasMin = startH <= MIN_HEIGHT * 1.15

    if (!hasImages) {
      if (delta < -40) triggerClose()
      return
    }
    if (delta > 40) {
      snapTo(MAX_HEIGHT)
    } else if (delta < -40) {
      if (wasMax) snapTo(MIN_HEIGHT)
      else if (wasMin) triggerClose()
      else snapTo(MIN_HEIGHT)
    } else {
      const mid = (MIN_HEIGHT + MAX_HEIGHT) / 2
      snapTo(startH >= mid ? MAX_HEIGHT : MIN_HEIGHT)
    }
  }

  const handleMobileSwipeStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      swipeStartXRef.current = e.touches[0].clientX
    }
  }

  const handleMobileSwipeEnd = (e) => {
    if (!swipeStartXRef.current || !e.changedTouches || e.changedTouches.length === 0) return
    const dx = e.changedTouches[0].clientX - swipeStartXRef.current
    swipeStartXRef.current = 0
    if (dx < -40 && slideIndex < imgs.length - 1) {
      e.stopPropagation()
      setSlideIndex((i) => i + 1)
    } else if (dx > 40 && slideIndex > 0) {
      e.stopPropagation()
      setSlideIndex((i) => i - 1)
    }
  }

  const isMax = cardHeight >= MAX_HEIGHT * 0.85

  const noImageStyle = {
    transform: closing ? 'translateY(110%)' : 'translateY(0)',
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32,0,0.67,0)',
    height: 'auto',
  }

  const imageStyle = {
    height: cardHeight + 'px',
    transform: closing ? 'translateY(110%)' : 'translateY(0)',
    transition: isDragging
      ? 'none'
      : 'height 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.32,0,0.67,0)',
  }

  const iconSvg = CATEGORY_ICONS[selected?.category]

  if (!selected) return null

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox imgs={imgs} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          ...(hasImages ? imageStyle : noImageStyle),
          zIndex: 1000,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.13)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => {
          if (e.button !== 0) return
          startYRef.current = e.clientY
          lastYRef.current = e.clientY
          startHeightRef.current = hasImages ? cardHeight : cardRef.current?.offsetHeight || MIN_HEIGHT
          setIsDragging(true)
        }}
        onMouseMove={(e) => {
          if (!isDragging) return
          lastYRef.current = e.clientY
          const delta = startYRef.current - e.clientY
          if (!hasImages && delta > 0) return
          if (hasImages) {
            const newHeight = Math.min(MAX_HEIGHT, Math.max(0, startHeightRef.current + delta))
            setCardHeight(newHeight)
          }
        }}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => setIsDragging(false)}
        onWheel={(e) => {
          if (!hasImages) {
            if (e.deltaY < 0) triggerClose()
          } else {
            if (e.deltaY > 0) snapTo(MAX_HEIGHT)
            else if (e.deltaY < 0) {
              if (cardHeight >= MAX_HEIGHT * 0.85) snapTo(MIN_HEIGHT)
              else triggerClose()
            }
          }
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '8px', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '9999px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'hidden' }}>
          <div style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '2px', paddingBottom: '10px' }}>
            {/* Category / badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  paddingLeft: '6px',
                  paddingRight: '6px',
                  paddingTop: '2px',
                  paddingBottom: '2px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {iconSvg && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: iconSvg.replace('fill="currentColor"', 'fill="#f97316"'),
                    }}
                    style={{ width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                )}
                {selected.category || '기타'}
              </span>
              {selected.price_range && (
                <span
                  style={{
                    fontSize: '11px',
                    backgroundColor: '#fed7aa',
                    color: '#b45309',
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    borderRadius: '9999px',
                  }}
                >
                  {selected.price_range}
                </span>
              )}
              {selected.is_sponsored && (
                <span
                  style={{
                    fontSize: '11px',
                    backgroundColor: '#fed7aa',
                    color: '#b45309',
                    paddingLeft: '5px',
                    paddingRight: '5px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    borderRadius: '9999px',
                  }}
                >
                  제휴
                </span>
              )}
            </div>

            {/* Name + rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '14px' }}>{selected.name}</p>
              {selected.rating > 0 && (
                <p style={{ fontSize: '11px', color: '#f59e0b', margin: 0 }}>
                  {'★'.repeat(Math.round(selected.rating)) + ' ' + selected.rating}
                </p>
              )}
            </div>

            {selected.description && (
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', margin: 0, lineHeight: '1.3' }}>
                <RichText text={selected.description} />
              </p>
            )}
            {selected.address && (
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', margin: 0 }}>
                <MapPin size={11} weight="fill" />
                {selected.address}
              </p>
            )}
            {selected.discount_info && (
              <p style={{ fontSize: '11px', color: '#f97316', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', margin: 0 }}>
                <Ticket size={12} weight="fill" />
                <RichText text={selected.discount_info} />
              </p>
            )}
            {selected.discount_terms && (
              <p style={{ fontSize: '10px', color: '#1f2937', marginTop: '1px', margin: 0, lineHeight: '1.3' }}>
                ※ <RichText text={selected.discount_terms} />
              </p>
            )}
            {(selected.review || selected.reviewer_name) && (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f3f4f6' }}>
                {selected.review && (
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: '1.4' }}>
                    <RichText text={selected.review} />
                  </p>
                )}
                {selected.reviewer_name && (
                  <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px', margin: 0 }}>{'— ' + selected.reviewer_name}</p>
                )}
              </div>
            )}
          </div>

          {!hasImages && <div style={{ paddingBottom: '64px' }} />}

          {/* ── Images ── */}
          {hasImages && (
            <div style={{ paddingBottom: '24px' }}>
              {/* Mobile slider - 4:5 portrait ratio */}
              <div
                style={{
                  display: isDesktop ? 'none' : 'block',
                  touchAction: 'pan-y',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  paddingBottom: '80px',
                }}
                onTouchStart={handleMobileSwipeStart}
                onTouchEnd={handleMobileSwipeEnd}
              >
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    backgroundColor: '#f3f4f6',
                    aspectRatio: '4/5',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      height: '100%',
                      transform: 'translateX(-' + slideIndex * 100 + '%)',
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    {imgs.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          width: '100%',
                          height: '100%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f3f4f6',
                        }}
                      >
                        <img
                          src={url}
                          alt={'사진 ' + (i + 1)}
                          loading={i === slideIndex ? 'eager' : 'lazy'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                          draggable={false}
                        />
                      </div>
                    ))}
                  </div>
                  {imgs.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      {imgs.map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: i === slideIndex ? '8px' : '6px',
                            height: i === slideIndex ? '8px' : '6px',
                            borderRadius: '9999px',
                            backgroundColor: i === slideIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => setSlideIndex(i)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop grid - horizontal scrollable thumbnails with 4:5 ratio */}
              <div
                style={{
                  display: isDesktop ? 'flex' : 'none',
                  gap: '12px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  paddingBottom: '80px',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {imgs.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    style={{
                      flexShrink: 0,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      aspectRatio: '4/5',
                      width: '140px',
                      minWidth: '140px',
                      maxWidth: '360px',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <img
                      src={url}
                      alt={'사진 ' + (i + 1)}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom gradient + Google Maps button */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
            height: '72px',
            background: isMax ? 'transparent' : 'linear-gradient(to bottom, transparent, white)',
            zIndex: 10,
          }}
        >
          <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <a
              href={
                'https://www.google.com/maps/search/?api=1&query=' +
                encodeURIComponent(selected.name + ' ' + (selected.address || ''))
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{
                pointerEvents: 'auto',
                backgroundColor: '#f97316',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '500',
                paddingLeft: '14px',
                paddingRight: '14px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '9999px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <MapPin size={14} weight="fill" color="#fff" />
              Google Maps에서 열기
            </a>
          </div>
        </div>
      </div>
    </>
  )
}