import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const DAYS_HE = {
  sunday: 'ראשון',
  monday: 'שני',
  tuesday: 'שלישי',
  wednesday: 'רביעי',
  thursday: 'חמישי',
  friday: 'שישי',
  saturday: 'שבת',
}

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchActivities() {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('day_of_week')
      if (!error) setActivities(data)
      setLoading(false)
    }
    fetchActivities()
  }, [])

  function handleEnroll(activityId) {
    if (!user) {
      navigate('/login')
      return
    }
    navigate(`/register?activity=${activityId}`)
  }

  return (
    <main style={{ direction: 'rtl', flex: 1, maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#1a472a', marginBottom: '8px' }}>הפעילויות שלנו</h1>
      <p style={{ color: '#555', marginBottom: '32px' }}>בחר חוג והירשם</p>

      {loading ? (
        <p style={{ color: '#888', textAlign: 'center' }}>טוען חוגים...</p>
      ) : activities.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center' }}>אין חוגים זמינים כרגע</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {activities.map(activity => (
            <div key={activity.id} style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <h2 style={{ color: '#1a472a', margin: 0, fontSize: '20px' }}>{activity.name}</h2>
              {activity.description && (
                <p style={{ color: '#555', margin: 0, fontSize: '14px' }}>{activity.description}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', color: '#333' }}>
                <span>📅 יום {DAYS_HE[activity.day_of_week] || activity.day_of_week}</span>
                <span>🕐 {activity.time}</span>
                <span>💰 ₪{activity.price} לחודש</span>
                {activity.max_students && (
                  <span>👥 עד {activity.max_students} תלמידים</span>
                )}
              </div>
              <button
                onClick={() => handleEnroll(activity.id)}
                style={{
                  marginTop: '8px',
                  background: '#1a472a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 0',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                הירשם לחוג
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
