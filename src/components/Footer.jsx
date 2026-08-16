import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

export default function Footer() {
  const [title, setTitle] = useState('אילן טניס')
  const [subtitle, setSubtitle] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('site_settings').select('key, value').in('key', ['footer_title', 'footer_subtitle']),
      supabase.from('footer_items').select('*').order('sort_order'),
    ]).then(([setRes, itemsRes]) => {
      setRes.data?.forEach(r => {
        if (r.key === 'footer_title' && r.value) setTitle(r.value)
        if (r.key === 'footer_subtitle') setSubtitle(r.value || '')
      })
      if (itemsRes.data) setItems(itemsRes.data)
    })
  }, [])

  return (
    <footer style={{
      background: '#1a472a', color: 'rgba(255,255,255,0.8)',
      textAlign: 'center', padding: '28px 24px', direction: 'rtl',
      fontSize: '14px', marginTop: 'auto',
    }}>
      <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: 'white', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Icon name="ball" size={18} />{title}
      </p>
      {subtitle && <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: '13px' }}>{subtitle}</p>}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 24px', margin: '0 0 12px' }}>
          {items.map(item => (
            <span key={item.id} style={{ fontSize: '13px' }}>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>
                  {item.icon && <span style={{ marginLeft: '4px' }}>{item.icon}</span>}{item.label}
                </a>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {item.icon && <span style={{ marginLeft: '4px' }}>{item.icon}</span>}{item.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <p style={{ margin: 0, opacity: 0.4, fontSize: '11px' }}>© {new Date().getFullYear()} כל הזכויות שמורות</p>
    </footer>
  )
}
