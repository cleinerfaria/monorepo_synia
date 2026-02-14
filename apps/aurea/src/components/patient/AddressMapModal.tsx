import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet'
import { ButtonNew, Modal, ModalFooter } from '@/components/ui'
import { Input } from '@/components/ui'
import { useGoogleMapsApiError } from '@/hooks/useGoogleMapsApiError'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para os ícones padrão do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface AddressMapModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number | null
  longitude: number | null
  address: string
  onConfirm: (lat: number, lng: number) => void
  isManuallyEdited?: boolean
}

const mapContainerStyle = {
  width: '100%',
  height: '470px',
}

const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333,
}

// Componente para capturar cliques no mapa Leaflet
function LeafletClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Componente para atualizar centro do mapa Leaflet
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMapEvents({})

  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

// Função para buscar endereços usando Nominatim (OpenStreetMap - gratuito)
const searchAddressNominatim = async (
  query: string
): Promise<{ lat: number; lng: number; display_name: string } | null> => {
  if (!query.trim()) return null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=BR`
    )

    if (!response.ok) throw new Error('Erro na busca')

    const data = await response.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      }
    }

    return null
  } catch {
    return null
  }
}

// Função para geocodificar endereço usando Google Maps ou fallback
const geocodeAddress = async (
  address: string,
  hasApiKey: boolean
): Promise<{ lat: number; lng: number } | null> => {
  if (!address.trim()) return null

  try {
    if (hasApiKey && window.google?.maps) {
      const geocoder = new google.maps.Geocoder()
      const result = await geocoder.geocode({ address })

      if (result.results && result.results.length > 0) {
        const { lat, lng } = result.results[0].geometry.location
        return { lat: lat(), lng: lng() }
      }
    } else {
      // Fallback para Nominatim
      const result = await searchAddressNominatim(address)
      if (result) {
        return { lat: result.lat, lng: result.lng }
      }
    }

    return null
  } catch {
    return null
  }
}

// Função para comparar coordenadas com tolerância (4 casas decimais = ~11 metros de precisão)
const coordinatesAreEqual = (
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number },
  tolerance: number = 0.0001
): boolean => {
  const latDiff = Math.abs(coord1.lat - coord2.lat)
  const lngDiff = Math.abs(coord1.lng - coord2.lng)
  return latDiff <= tolerance && lngDiff <= tolerance
}

// Função para reverse geocoding (coordenadas -> endereço) usando Nominatim
const reverseGeocodeNominatim = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    )

    if (!response.ok) throw new Error('Erro na busca reversa')

    const data = await response.json()
    if (data && data.display_name) {
      return data.display_name
    }

    return null
  } catch {
    return null
  }
}

// Função para reverse geocoding usando Google Maps ou fallback
const _reverseGeocode = async (
  lat: number,
  lng: number,
  hasApiKey: boolean
): Promise<string | null> => {
  try {
    if (hasApiKey && window.google?.maps) {
      const geocoder = new google.maps.Geocoder()
      const result = await geocoder.geocode({ location: { lat, lng } })

      if (result.results && result.results.length > 0) {
        return result.results[0].formatted_address
      }
    } else {
      // Fallback para Nominatim
      return await reverseGeocodeNominatim(lat, lng)
    }

    return null
  } catch {
    // Tentar fallback
    return await reverseGeocodeNominatim(lat, lng)
  }
}

export default function AddressMapModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  address,
  onConfirm,
  isManuallyEdited = false,
}: AddressMapModalProps) {
  const [markerPosition, setMarkerPosition] = useState<{
    lat: number
    lng: number
  }>(() => {
    // Garantir que sempre temos coordenadas válidas na inicialização
    const initialLat = latitude && !isNaN(latitude) ? latitude : defaultCenter.lat
    const initialLng = longitude && !isNaN(longitude) ? longitude : defaultCenter.lng
    return { lat: initialLat, lng: initialLng }
  })

  // Estado local para controlar se foi editado manualmente nesta sessão
  const [isEditedInSession, setIsEditedInSession] = useState(false)

  // Estado para forçar re-render do marcador
  const [markerKey, setMarkerKey] = useState(0)

  // Estado para armazenar coordenadas do endereço (para comparação)
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(
    null
  )

  // Estado para controlar exibição do alerta de confirmação
  const [showSearchConfirm, setShowSearchConfirm] = useState(false)

  const [searchAddress, setSearchAddress] = useState(address || '')
  const [center, setCenter] = useState<{ lat: number; lng: number }>(() => {
    const initialLat = latitude && !isNaN(latitude) ? latitude : defaultCenter.lat
    const initialLng = longitude && !isNaN(longitude) ? longitude : defaultCenter.lng
    return { lat: initialLat, lng: initialLng }
  })
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<string>('')
  const [useFallback, setUseFallback] = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const hasApiKey = Boolean(
    apiKey && apiKey.trim() !== '' && apiKey !== 'your-google-maps-api-key-here'
  )

  // Detectar erros específicos da Google Maps API
  const googleMapsError = useGoogleMapsApiError()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: hasApiKey ? apiKey : '',
    libraries: ['places'],
  })

  // Determinar se deve usar fallback
  const shouldUseFallback = !hasApiKey || loadError || googleMapsError || useFallback

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      }
      setMarkerPosition(newPosition)
      setIsEditedInSession(true) // Marcar como editado manualmente
    }
  }

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      }
      setMarkerPosition(newPosition)
      setIsEditedInSession(true) // Marcar como editado manualmente
    }
  }

  // Função que verifica se precisa confirmar antes de buscar
  const handleSearchWithConfirm = () => {
    // Usar a mesma lógica da tag de "Editado Manualmente"
    const isShowingManualTag = (() => {
      // Se foi editado nesta sessão, é manual
      if (isEditedInSession) return true

      // Se já estava marcado como manual anteriormente e temos coordenadas do endereço para comparar
      if (isManuallyEdited && addressCoordinates) {
        // Verificar se as coordenadas atuais ainda são diferentes das do endereço
        return !coordinatesAreEqual(markerPosition, addressCoordinates)
      }

      // Se não foi marcado como manual anteriormente, é automático
      return false
    })()

    if (isShowingManualTag) {
      setShowSearchConfirm(true)
      return
    }

    handleSearch()
  }

  // Função chamada quando o usuário confirma a busca
  const confirmSearch = () => {
    setShowSearchConfirm(false)
    handleSearch()
  }

  const handleSearch = useCallback(async () => {
    if (!searchAddress.trim()) return

    setIsSearching(true)
    setSearchResult('')

    try {
      if (!shouldUseFallback && isLoaded && hasApiKey) {
        // Tentar usar Google Maps primeiro
        const geocoder = new google.maps.Geocoder()
        const result = await geocoder.geocode({ address: searchAddress })

        if (result.results && result.results.length > 0) {
          const { lat, lng } = result.results[0].geometry.location
          const newPosition = {
            lat: lat(),
            lng: lng(),
          }
          setMarkerPosition(newPosition)
          setCenter(newPosition)
          setSearchResult(`Encontrado: ${result.results[0].formatted_address}`)
          // Resetar edição manual pois é resultado de busca automática
          setIsEditedInSession(false)
        } else {
          setSearchResult('Nenhum resultado encontrado')
        }
      } else {
        // Usar fallback (Nominatim)
        const result = await searchAddressNominatim(searchAddress)

        if (result) {
          const newPosition = {
            lat: result.lat,
            lng: result.lng,
          }
          setMarkerPosition(newPosition)
          setCenter(newPosition)
          setSearchResult(`Encontrado: ${result.display_name}`)
          // Resetar edição manual pois é resultado de busca automática
          setIsEditedInSession(false)
        } else {
          setSearchResult('Nenhum resultado encontrado')
        }
      }
    } catch {
      setSearchResult('Erro ao buscar endereço')

      // Se falhou com Google Maps, tentar fallback
      if (!shouldUseFallback) {
        setUseFallback(true)
        setSearchResult('Tentando busca alternativa...')
        setTimeout(() => handleSearch(), 1000)
      }
    } finally {
      setIsSearching(false)
    }
  }, [searchAddress, shouldUseFallback, isLoaded, hasApiKey])

  const handleLeafletMapClick = (lat: number, lng: number) => {
    setMarkerPosition({ lat, lng })
    setIsEditedInSession(true) // Marcar como editado manualmente
  }

  const handleConfirm = () => {
    // Validar se os valores são números válidos
    if (isNaN(markerPosition.lat) || isNaN(markerPosition.lng)) {
      console.error('Coordenadas inválidas!', markerPosition)
      return
    }

    // Arredondar para 6 dígitos decimais
    const roundedLat = Math.round(markerPosition.lat * 1000000) / 1000000
    const roundedLng = Math.round(markerPosition.lng * 1000000) / 1000000

    onConfirm(roundedLat, roundedLng)
    onClose()
  }

  // Verificar se as coordenadas atuais correspondem ao endereço ao abrir o modal
  useEffect(() => {
    const checkAddressCoordinates = async () => {
      if (isOpen && address && address.trim() !== '' && latitude && longitude) {
        const coords = await geocodeAddress(address, hasApiKey)
        if (coords) {
          setAddressCoordinates(coords)
          // Se as coordenadas atuais são similares às do endereço, não é edição manual
          const areEqual = coordinatesAreEqual({ lat: latitude, lng: longitude }, coords)
          if (areEqual) {
            setIsEditedInSession(false)
          }
        }
      }
    }

    checkAddressCoordinates()
  }, [isOpen, address, latitude, longitude, hasApiKey])

  useEffect(() => {
    // Apenas atualizar se temos coordenadas válidas e diferentes das atuais
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      const newPosition = { lat: latitude, lng: longitude }

      // Verificar se é realmente diferente para evitar atualizações desnecessárias
      if (
        Math.abs(newPosition.lat - markerPosition.lat) > 0.000001 ||
        Math.abs(newPosition.lng - markerPosition.lng) > 0.000001
      ) {
        setMarkerPosition(newPosition)
        setCenter(newPosition)
      }
    }

    // Resetar estado de edição quando modal abrir
    if (isOpen) {
      setIsEditedInSession(false)
    }
  }, [latitude, longitude, isOpen, markerPosition.lat, markerPosition.lng])

  // Sincronizar centro do mapa com posição do marcador
  useEffect(() => {
    setCenter(markerPosition)
  }, [markerPosition])

  // Buscar endereço automaticamente quando o modal abrir com um endereço, mas SÓ se não houver coordenadas já definidas
  useEffect(() => {
    // Só buscar automaticamente se não há coordenadas já definidas
    if (isOpen && address && address.trim() !== '' && (!latitude || !longitude)) {
      const timer = setTimeout(() => {
        handleSearch()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen, address, latitude, longitude, shouldUseFallback, isLoaded, hasApiKey, handleSearch])

  // Executar busca para exibir marcador quando o modal abrir com coordenadas
  // Posiciona nas coordenadas SALVAS e depois faz busca só para comparação
  useEffect(() => {
    if (isOpen && latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      const timer = setTimeout(async () => {
        // Posicionar o marcador nas coordenadas SALVAS
        const savedPosition = { lat: latitude, lng: longitude }
        setMarkerPosition(savedPosition)
        setCenter(savedPosition)

        // Forçar re-render do marcador incrementando a key
        setMarkerKey((prev) => prev + 1)

        // Se tem endereço, buscar coordenadas do endereço para comparar (não para usar)
        if (address && address.trim() !== '') {
          try {
            const coords = await geocodeAddress(address, hasApiKey)
            if (coords) {
              setAddressCoordinates(coords)
              const areEqual = coordinatesAreEqual(savedPosition, coords)
              setIsEditedInSession(!areEqual)
            }
          } catch {
            // Erro ao verificar endereço
          }
        }
      }, 800)

      return () => clearTimeout(timer)
    }
  }, [isOpen, latitude, longitude, address, hasApiKey])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-lg dark:bg-gray-900">
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Localizar Endereço no Mapa
          </h2>
        </div>

        <div className="space-y-4 p-6">
          {shouldUseFallback ? (
            <>
              {/* Aviso sobre o modo fallback */}
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Usando mapa alternativo
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                      O Google Maps não está disponível. Usando OpenStreetMap como alternativa.
                      {hasApiKey && (
                        <button
                          onClick={() => {
                            setUseFallback(false)
                            window.location.reload()
                          }}
                          className="ml-2 underline hover:no-underline"
                        >
                          Tentar Google Maps novamente
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de busca para fallback */}
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Digite um endereço para buscar..."
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch()
                        }
                      }}
                    />
                  </div>
                  <ButtonNew
                    type="button"
                    onClick={handleSearchWithConfirm}
                    disabled={isSearching}
                    className="h-8"
                    showIcon={false}
                    variant="outline"
                    label={isSearching ? 'Buscando...' : 'Buscar'}
                  />
                </div>
                {/* Dica */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Dica:</strong> Clique no mapa para definir o ponto.
                </div>
              </div>

              {/* Resultado da busca */}
              {searchResult && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    searchResult.includes('Erro') || searchResult.includes('Nenhum')
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  }`}
                >
                  {searchResult}
                </div>
              )}

              {/* Mapa Leaflet */}
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <MapContainer
                  key={`leaflet-${markerPosition.lat}-${markerPosition.lng}`}
                  center={[markerPosition.lat, markerPosition.lng]}
                  zoom={15}
                  style={{ width: '100%', height: '470px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LeafletMarker
                    position={[markerPosition.lat, markerPosition.lng]}
                    key={`leaflet-marker-${markerPosition.lat}-${markerPosition.lng}`}
                    eventHandlers={{}}
                  />
                  <MapCenterUpdater center={[markerPosition.lat, markerPosition.lng]} />
                  <LeafletClickHandler onMapClick={handleLeafletMapClick} />
                </MapContainer>
              </div>
            </>
          ) : (
            <>
              {/* Barra de busca para Google Maps */}
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Digite um endereço para buscar..."
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch()
                        }
                      }}
                    />
                  </div>
                  <ButtonNew
                    type="button"
                    onClick={handleSearchWithConfirm}
                    disabled={!isLoaded || isSearching}
                    className="h-8"
                    showIcon={false}
                    variant="outline"
                    label={isSearching ? 'Buscando...' : 'Buscar'}
                  />
                </div>
                {/* Dica */}
                <div className="px-4 text-xs text-gray-600 dark:text-gray-400">
                  <strong>Dica:</strong> Clique no mapa para definir o ponto ou arraste o marcador
                  para ajustar a posição.
                </div>
              </div>

              {/* Resultado da busca */}
              {searchResult && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    searchResult.includes('Erro') || searchResult.includes('Nenhum')
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  }`}
                >
                  {searchResult}
                </div>
              )}

              {/* Mapa Google Maps */}
              {isLoaded && (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={15}
                    onClick={handleMapClick}
                    onLoad={(_map) => {}}
                  >
                    <Marker
                      position={markerPosition}
                      draggable={true}
                      onDragEnd={handleMarkerDragEnd}
                      onLoad={(marker) => {
                        // Forçar visibilidade
                        marker.setVisible(true)
                      }}
                      visible={true}
                      clickable={true}
                      key={`marker-${markerKey}-${markerPosition.lat}-${markerPosition.lng}`}
                    />
                  </GoogleMap>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé com coordenadas e botões */}
        <div className="border-t border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-start justify-between gap-6">
            {/* Coordenadas à esquerda com indicador de origem */}
            <div className="flex items-start gap-8">
              <div>
                <span className="font-xs text-gray-600 dark:text-gray-400">Latitude:</span>
                <div className="mt-0 font-semibold text-gray-900 dark:text-white">
                  {markerPosition.lat.toFixed(6)}
                </div>
              </div>
              <div>
                <span className="font-xs text-gray-600 dark:text-gray-400">Longitude:</span>
                <div className="mt-0 font-semibold text-gray-900 dark:text-white">
                  {markerPosition.lng.toFixed(6)}
                </div>
              </div>

              {/* Indicador de origem das coordenadas */}
              <div className="mt-3 flex items-center">
                {(() => {
                  // Se foi editado nesta sessão, é manual
                  if (isEditedInSession) return true

                  // Se já estava marcado como manual anteriormente e temos coordenadas do endereço para comparar
                  if (isManuallyEdited && addressCoordinates) {
                    // Verificar se as coordenadas atuais ainda são diferentes das do endereço
                    return !coordinatesAreEqual(markerPosition, addressCoordinates)
                  }

                  // Se não foi marcado como manual anteriormente, é automático
                  return false
                })() ? (
                  <div
                    className="flex items-center rounded-md bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    title="Coordenadas editadas manualmente"
                  >
                    <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs font-medium">Editado Manualmente</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center rounded-md bg-green-50 px-2 py-1 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    title="Coordenadas obtidas automaticamente do endereço"
                  >
                    <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs font-medium">Localização Automática</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botões à direita */}
            <div className="flex gap-4">
              <ButtonNew
                type="button"
                variant="neutral"
                onClick={onClose}
                showIcon={false}
                label="Cancelar"
              />
              <ButtonNew
                type="button"
                onClick={handleConfirm}
                showIcon={false}
                label="Confirmar Localização"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Busca */}
      <Modal
        isOpen={showSearchConfirm}
        onClose={() => setShowSearchConfirm(false)}
        title="Localização Manual Detectada"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Você possui uma localização salva manualmente. Ao buscar o endereço, as coordenadas atuais
          serão substituídas pelas novas coordenadas encontradas.
        </p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Deseja continuar com a busca?</p>

        <ModalFooter>
          <ButtonNew
            type="button"
            variant="neutral"
            onClick={() => setShowSearchConfirm(false)}
            showIcon={false}
            label="Cancelar"
          />
          <ButtonNew
            type="button"
            onClick={confirmSearch}
            showIcon={false}
            label="Continuar com a Busca"
          />
        </ModalFooter>
      </Modal>
    </div>
  )
}
