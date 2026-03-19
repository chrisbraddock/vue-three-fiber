import { defineComponent, inject } from 'vue'
import { composerKey, type ComposerService } from './ComposerService'

function isComposerService(v: unknown): v is ComposerService {
  return v != null && typeof v === 'object' && 'selectedIndex' in v
}

function isInputElement(target: unknown): target is HTMLInputElement {
  return target instanceof HTMLInputElement
}

const panelStyle = {
  background: 'rgba(12, 14, 20, 0.88)',
  color: '#d6e4ff',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0px',
  width: '180px',
  minWidth: '180px',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  overflow: 'auto',
  resize: 'horizontal',
}

const sectionStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

const labelStyle = {
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  opacity: 0.5,
  marginBottom: '6px',
}

export const Sidebar = defineComponent({
  setup() {
    const injected = inject(composerKey)
    if (!isComposerService(injected)) throw new Error('ComposerService not provided')
    const service = injected

    return () => {
      const sel = service.selected.value

      return (
        <div style={panelStyle}>
          {/* Object list */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Objects</div>
            {service.objects.map((obj, i) => (
              <div
                key={obj.name}
                onClick={() => {
                  service.selectedIndex.value = i
                }}
                style={{
                  padding: '5px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  background: service.selectedIndex.value === i ? 'rgba(100,140,220,0.2)' : 'transparent',
                  color: service.selectedIndex.value === i ? '#88aaee' : '#d6e4ff',
                  fontWeight: service.selectedIndex.value === i ? '600' : '400',
                  transition: 'background 0.15s',
                }}>
                {service.selectedIndex.value === i ? '\u25B8 ' : '  '}
                {obj.name}
              </div>
            ))}
          </div>

          {/* Properties */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Properties</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ minWidth: '50px' }}>Color</span>
              <input
                type="color"
                value={sel.color}
                onInput={(e: Event) => {
                  if (isInputElement(e.target)) sel.color = e.target.value
                }}
                style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ minWidth: '50px' }}>Rough</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={String(sel.roughness)}
                onInput={(e: Event) => {
                  if (isInputElement(e.target)) sel.roughness = parseFloat(e.target.value)
                }}
                style={{ flex: 1, accentColor: '#6688cc' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ minWidth: '50px' }}>Metal</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={String(sel.metalness)}
                onInput={(e: Event) => {
                  if (isInputElement(e.target)) sel.metalness = parseFloat(e.target.value)
                }}
                style={{ flex: 1, accentColor: '#6688cc' }}
              />
            </label>
          </div>

          {/* Annotation */}
          <div style={{ ...sectionStyle, opacity: 0.4, fontSize: '10px', lineHeight: '1.5' }}>
            Vue provide/inject bridges this sidebar and the 3D scene. One service, two render targets.
          </div>
        </div>
      )
    }
  },
})
