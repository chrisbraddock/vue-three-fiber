import { defineComponent, inject } from 'vue'
import { composerKey, type ComposerService } from './ComposerService'

function isComposerService(v: unknown): v is ComposerService {
  return v != null && typeof v === 'object' && 'selectedIndex' in v
}

function isInputElement(target: unknown): target is HTMLInputElement {
  return target instanceof HTMLInputElement
}

const chipStyle = (active: boolean) => ({
  padding: '3px 10px',
  borderRadius: '999px',
  border: `1px solid ${active ? 'rgba(100,140,220,0.5)' : 'rgba(255,255,255,0.12)'}`,
  background: active ? 'rgba(100,140,220,0.18)' : 'rgba(10,12,18,0.7)',
  color: active ? '#aaccff' : 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontSize: '10px',
  fontFamily: "'Inter', system-ui, sans-serif",
  transition: 'all 0.15s',
  userSelect: 'none' as const,
})

export const OverlayControls = defineComponent({
  setup() {
    const injected = inject(composerKey)
    if (!isComposerService(injected)) throw new Error('ComposerService not provided')
    const service = injected

    return () => (
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: '999px',
          background: 'rgba(10, 12, 18, 0.76)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
        {/* Bloom toggle */}
        <div
          style={chipStyle(service.bloom.value)}
          onClick={() => {
            service.bloom.value = !service.bloom.value
          }}>
          bloom
        </div>

        {/* Bloom intensity */}
        {service.bloom.value && (
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={String(service.bloomIntensity.value)}
            onInput={(e: Event) => {
              if (isInputElement(e.target)) service.bloomIntensity.value = parseFloat(e.target.value)
            }}
            style={{ width: '60px', accentColor: '#6688cc' }}
          />
        )}

        {/* Vignette toggle */}
        <div
          style={chipStyle(service.vignette.value)}
          onClick={() => {
            service.vignette.value = !service.vignette.value
          }}>
          vignette
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)' }} />

        {/* Render mode */}
        <div
          style={chipStyle(service.frameloop.value === 'demand')}
          onClick={() => {
            service.frameloop.value = service.frameloop.value === 'always' ? 'demand' : 'always'
          }}>
          {service.frameloop.value === 'demand' ? 'demand' : 'continuous'}
        </div>
      </div>
    )
  },
})
