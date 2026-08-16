const PATHS = {
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" /><path d="M12 13v3M9 20h6M9.5 20c0-2 1-2.5 2.5-3s2.5-1 2.5-3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3" /></>,
  pin: <><path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.3" /></>,
  cap: <><path d="M12 4 2 9l10 5 10-5-10-5z" /><path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" /></>,
  school: <><path d="M4 21V10l8-5 8 5v11" /><path d="M9 21v-6h6v6M4 21h16" /></>,
  tent: <><path d="M3 20 12 5l9 15" /><path d="M8 20l4-8 4 8M3 20h18" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  tag: <><circle cx="8.5" cy="8.5" r="1" /><path d="M4 4h6l10 10-6 6L4 14V4z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 6l9 7 9-7" /></>,
  check: <path d="M4 12.5 9.5 18 20 6" />,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13.9a7.6 7.6 0 0 0 0-3.8l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-3.3-1.9L13.4 2h-4l-.4 2.2a7.6 7.6 0 0 0-3.3 1.9l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.8l-2 1.5 2 3.4 2.3-.9c1 .9 2.1 1.5 3.3 1.9L9.4 22h4l.4-2.2c1.2-.4 2.3-1 3.3-1.9l2.3.9 2-3.4-2-1.5z" /></>,
}

export function TennisBall({ size = 20, style, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} {...rest}>
      <circle cx="12" cy="12" r="10" fill="#d4e157" stroke="#aebd3f" strokeWidth="0.5" />
      <path d="M12 2 C 7 5.5 7 18.5 12 22" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M12 2 C 17 5.5 17 18.5 12 22" fill="none" stroke="#fff" strokeWidth="1.6" />
    </svg>
  )
}

export default function Icon({ name, size = 20, color = 'currentColor', style, ...rest }) {
  if (name === 'ball') return <TennisBall size={size} style={style} {...rest} />
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      {...rest}
    >
      {path}
    </svg>
  )
}
