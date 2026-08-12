// Sits at the bottom edge of a `position: relative` section and cuts it into a soft wave.
export default function SectionCurve({ fill = '#f3f6f3' }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ width: '100%', height: '56px', display: 'block' }}>
        <path d="M0,28 C 260,64 520,4 760,22 C 1000,40 1200,8 1440,26 L1440,70 L0,70 Z" fill={fill} />
      </svg>
    </div>
  )
}
