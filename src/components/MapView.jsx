import { useEffect, useRef } from 'react'
import { View, TouchableOpacity, Text, ScrollView, Platform } from 'react-native'
import { MapPin } from 'phosphor-react-native'
import { getMapIconSvg, CATEGORY_ICONS } from '../lib/mapCategories'

const AMSTERDAM = [4.9041, 52.3676]
// MapTiler 스타일: 역/버스/공원 위주 커스텀 스타일
const MAP_STYLE_DAY =
  'https://api.maptiler.com/maps/019e7070-5813-7575-95ff-c237a9f5c363/style.json?key=wZ6avS4xf2jy9IGm9IJR'

function getMapStyle() {
  return MAP_STYLE_DAY
}

function createMarkerHtml(r, isSelected = false) {
  const isSponsored = r.is_sponsored
  const size = isSponsored ? 42 : 34
  const bg = isSponsored ? '#f97316' : 'white'
  const border = isSponsored
    ? '3px solid white'
    : isSelected
      ? '3px solid #f97316'
      : '2px solid #e5e7eb'
  const shadow = isSelected
    ? '0 3px 12px rgba(249,115,22,0.5)'
    : isSponsored
      ? '0 3px 12px rgba(249,115,22,0.4)'
      : '0 2px 6px rgba(0,0,0,0.15)'

  const displayName = r.map_label || r.name || ''
  const name = displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName

  const iconColor = isSponsored ? 'white' : '#f97316'
  const iconSvg = getMapIconSvg(r.category, iconColor)

  return (
    '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">' +
    '<div style="width:' +
    size +
    'px;height:' +
    size +
    'px;background:' +
    bg +
    ';border:' +
    border +
    ';border-radius:50%;display:flex;align-items:center;' +
    'justify-content:center;box-shadow:' +
    shadow +
    ';flex-shrink:0;' +
    'transition:transform 0.15s,box-shadow 0.15s;transform:' +
    (isSelected ? 'scale(1.25)' : 'scale(1)') +
    ';' +
    '">' +
    '<div style="width:' +
    (isSponsored ? 24 : 16) +
    'px;height:' +
    (isSponsored ? 24 : 16) +
    'px;display:flex;align-items:center;justify-content:center;">' +
    iconSvg +
    '</div></div>' +
    '<div style="background:white;color:#374151;font-size:9px;font-weight:600;' +
    'padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);' +
    'max-width:90px;overflow:hidden;text-overflow:ellipsis;">' +
    name +
    '</div></div>'
  )
}

function WebMap({ restaurants, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const initializedRef = useRef(false)

  // 초기 지도 생성
  useEffect(() => {
    if (initializedRef.current || !mapRef.current) return
    initializedRef.current = true

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (!document.getElementById('maplibre-css')) {
        const link = document.createElement('link')
        link.id = 'maplibre-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }

      const map = new maplibregl.Map({
        container: mapRef.current,
        style: getMapStyle(), // 항상 낮 스타일
        center: AMSTERDAM,
        zoom: 13,
        attributionControl: false,
      })

      map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

      mapInstanceRef.current = map

      map.on('styleimagemissing', () => {
        // Silently ignore missing images
      })

      map.on('load', () => {
        const layers = map.getStyle().layers
layers.forEach((layer) => {
  if (layer.type !== 'symbol') return
  const id = layer.id.toLowerCase()

  const isImportantPoi =
    id.includes('transit') ||
    id.includes('station') ||
    id.includes('bus') ||
    id.includes('rail') ||
    id.includes('metro') ||
    id.includes('subway') ||
    id.includes('tram') ||
    id.includes('stop') ||
    id.includes('park') // 공원 아이콘 유지

  if (!isImportantPoi) {
    map.setLayoutProperty(layer.id, 'visibility', 'none')
  }
})

        renderMarkers(maplibregl, map, restaurants, selected, onSelect, markersRef)
      })
    })

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current = []
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
      initializedRef.current = false
    }
  }, [])

  // 레스토랑 목록 변경 시 마커 다시 그림
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (map.loaded()) {
        renderMarkers(maplibregl, map, restaurants, selected, onSelect, markersRef)
      } else {
        map.once('load', () =>
          renderMarkers(maplibregl, map, restaurants, selected, onSelect, markersRef)
        )
      }
    })
  }, [restaurants])

  // 선택된 장소 변경 시 마커 하이라이트/재생성
  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('maplibre-gl').then(({ default: maplibregl }) => {
      markersRef.current.forEach(({ r, marker }) => {
        const isSelected = !!(selected && r.id === selected.id)
        if (marker._isSelected === isSelected) return

        marker._isSelected = isSelected

        const el = document.createElement('div')
        el.innerHTML = createMarkerHtml(r, isSelected)
        const wrapper = el.firstChild
        wrapper.addEventListener('click', () => onSelect(r))

        marker.getElement().replaceWith(wrapper)
        marker.remove()

        const newMarker = new maplibregl.Marker({
          element: wrapper,
          anchor: 'bottom',
        })
          .setLngLat([r.longitude, r.latitude])
          .addTo(mapInstanceRef.current)

        newMarker._isSelected = isSelected

        const idx = markersRef.current.findIndex((m) => m.r.id === r.id)
        if (idx !== -1) {
          markersRef.current[idx] = { r, marker: newMarker, el: wrapper }
        }
      })
    })
  }, [selected])

  // 선택된 장소로 카메라 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return

    mapInstanceRef.current.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: 16,
      speed: 1.2,
    })
  }, [selected])

  // 🔥 기존의 "1분마다 밤/낮 스타일 재설정" useEffect는 제거함

  const locateMe = () => {
    const map = mapInstanceRef.current
    if (!map) return

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 16,
        })
      },
      () => alert('위치를 가져올 수 없어요. 위치 권한을 허용해주세요.')
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', minHeight: '300px', zIndex: 1 }}
      />
      <button
        onClick={locateMe}
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '10px',
          zIndex: 1000,
          background: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="현재 위치"
      >
        <MapPin size={20} weight="fill" color="#f97316" />
      </button>
    </div>
  )
}

function renderMarkers(maplibregl, map, restaurants, selected, onSelect, markersRef) {
  const valid = (restaurants || []).filter((r) => r.latitude && r.longitude)

  const newIds = valid.map((r) => r.id).join(',')
  const oldIds = markersRef.current.map((m) => m.r.id).join(',')
  if (newIds === oldIds) return

  markersRef.current.forEach(({ marker }) => marker.remove())
  markersRef.current = []

  if (valid.length === 0) return

  const sorted = [...valid].sort(
    (a, b) => (a.is_sponsored ? 1 : 0) - (b.is_sponsored ? 1 : 0)
  )

  sorted.forEach((r) => {
    const isSelected = !!(selected && r.id === selected.id)

    const el = document.createElement('div')
    el.innerHTML = createMarkerHtml(r, isSelected)
    const wrapper = el.firstChild
    wrapper.addEventListener('click', () => onSelect(r))

    const marker = new maplibregl.Marker({
      element: wrapper,
      anchor: 'bottom',
    })
      .setLngLat([r.longitude, r.latitude])
      .addTo(map)

    marker._isSelected = isSelected
    markersRef.current.push({ r, marker, el: wrapper })
  })

  if (valid.length === 1) {
    map.flyTo({
      center: [valid[0].longitude, valid[0].latitude],
      zoom: 15,
    })
  } else if (valid.length > 1) {
    const lngs = valid.map((r) => r.longitude)
    const lats = valid.map((r) => r.latitude)

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: [40, 40],
        maxZoom: 16,
      }
    )
  }
}

function NativeList({ restaurants, selected, onSelect }) {
  const valid = (restaurants || []).filter((r) => r.latitude && r.longitude)

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, gap: 8 }}
    >
      {valid.length === 0 ? (
        <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 32 }}>
          등록된 장소가 없어요
        </Text>
      ) : (
        valid.map((r) => {
          const iconSvg = CATEGORY_ICONS[r.category]
          const iconOrange = iconSvg
            ? iconSvg.replace('fill="currentColor"', 'fill="#f97316"')
            : ''

          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => onSelect(r)}
              style={{
                backgroundColor: selected?.id === r.id ? '#fff7ed' : 'white',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected?.id === r.id ? '#f97316' : '#f3f4f6',
                padding: 14,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: r.is_sponsored ? '#f97316' : 'white',
                  borderWidth: 2,
                  borderColor: r.is_sponsored ? 'white' : '#e5e7eb',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin
                  size={16}
                  weight="fill"
                  color={r.is_sponsored ? 'white' : '#f97316'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  {iconOrange && (
                    <div
                      dangerouslySetInnerHTML={{ __html: iconOrange }}
                      style={{
                        width: '14px',
                        height: '14px',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: '#4b5563',
                    }}
                  >
                    {r.category || '기타'}
                  </Text>
                </View>

                <Text
                  style={{
                    fontWeight: '600',
                    color: '#111827',
                    fontSize: 14,
                  }}
                >
                  {r.name}
                </Text>

                {r.address ? (
                  <Text
                    style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}
                  >
                    {r.address}
                  </Text>
                ) : null}

                {r.discount_info ? (
                  <Text
                    style={{ fontSize: 12, color: '#f97316', marginTop: 4 }}
                  >
                    {r.discount_info.replace(/<[^>]+>/g, '')}
                  </Text>
                ) : null}
              </View>

              {r.is_sponsored && (
                <View
                  style={{
                    backgroundColor: '#fff7ed',
                    borderRadius: 999,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#ea580c' }}>제휴</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })
      )}
    </ScrollView>
  )
}

export default function MapViewComponent({ restaurants, selected, onSelect }) {
  if (Platform.OS === 'web') {
    return (
      <WebMap
        restaurants={restaurants}
        selected={selected}
        onSelect={onSelect}
      />
    )
  }

  return (
    <NativeList
      restaurants={restaurants}
      selected={selected}
      onSelect={onSelect}
    />
  )
}