import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_T = {
  draft:     { label: 'טיוטה',      color: '#9ca3af' },
  groups:    { label: 'שלב בתים',   color: '#d97706' },
  knockout:  { label: 'נוק-אאוט',   color: '#7c3aed' },
  completed: { label: 'הסתיים 🏆',  color: '#16a34a' },
}
const ROUND_NAMES = { 1: 'גמר', 2: 'חצי גמר', 4: 'רבע גמר', 8: 'שמינית גמר' }
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tPlayers, setTPlayers] = useState([])
  const [tMatches, setTMatches] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const [tRes, pRes] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('players').select('id, name, birth_year').order('name'),
    ])
    if (tRes.data) setTournaments(tRes.data.filter(t => t.status !== 'draft'))
    if (pRes.data) setAllPlayers(pRes.data)
    setLoading(false)
  }

  async function loadDetail(t) {
    setSelected(t)
    setLoadingDetail(true)
    const [pRes, mRes] = await Promise.all([
      supabase.from('tournament_players').select('*').eq('tournament_id', t.id),
      supabase.from('tournament_matches').select('*').eq('tournament_id', t.id).order('round', { ascending: false }).order('match_num'),
    ])
    setTPlayers(pRes.data || [])
    setTMatches(mRes.data || [])
    setLoadingDetail(false)
  }

  function pName(id) { return allPlayers.find(p => p.id === id)?.name || '?' }

  function getGroupStandings(t, groupNum) {
    const gPlayers = tPlayers.filter(tp => tp.group_num === groupNum)
    return gPlayers.map(tp => {
      const wins = tMatches.filter(m => m.phase === 'group' && m.group_num === groupNum && m.winner_id === tp.player_id).length
      const played = tMatches.filter(m => m.phase === 'group' && m.group_num === groupNum && m.status === 'completed' && (m.player1_id === tp.player_id || m.player2_id === tp.player_id)).length
      return { ...tp, wins, played, points: tp.group_points || 0 }
    }).sort((a, b) => b.points - a.points || b.wins - a.wins)
  }

  if (loading) return (
    <main style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', textAlign: 'center', color: '#bbb' }}>
      טוען תחרויות...
    </main>
  )

  if (selected) {
    const t = selected
    const st = STATUS_T[t.status] || STATUS_T.draft
    const knockoutMatches = tMatches.filter(m => m.phase === 'knockout')
    const knockoutRounds = [...new Set(knockoutMatches.map(m => m.round))].sort((a, b) => b - a)

    return (
      <main style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }} dir="rtl">
        {/* Back + header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <button onClick={() => { setSelected(null); setTPlayers([]); setTMatches([]) }}
            style={{ background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
            ← חזרה
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#111' }}>{t.name}</h1>
            {t.description && <p style={{ margin: '4px 0 0', color: '#777', fontSize: '14px' }}>{t.description}</p>}
            {t.start_date && <p style={{ margin: '2px 0 0', color: '#aaa', fontSize: '12px' }}>{new Date(t.start_date).toLocaleDateString('he-IL')}</p>}
          </div>
          <div style={{ background: `${st.color}18`, color: st.color, borderRadius: '20px', padding: '6px 18px', fontSize: '13px', fontWeight: '700' }}>{st.label}</div>
        </div>

        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#bbb' }}>טוען...</div>
        ) : (
          <>
            {/* Champion banner */}
            {t.status === 'completed' && (() => {
              const finalMatch = knockoutMatches.find(m => m.round === 1)
              const champion = finalMatch?.winner_id
              return champion ? (
                <div style={{ background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '32px', color: '#fff', boxShadow: '0 8px 28px rgba(26,71,42,0.3)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: '2px', marginBottom: '6px' }}>אלוף/ת</div>
                  <div style={{ fontSize: '30px', fontWeight: '800' }}>{pName(champion)}</div>
                </div>
              ) : null
            })()}

            {/* Group stage */}
            {(t.status === 'groups' || t.status === 'knockout' || t.status === 'completed') && (
              <section style={{ marginBottom: '36px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#333', marginBottom: '16px', borderBottom: '2px solid #e8ece8', paddingBottom: '10px' }}>שלב הבתים</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {Array.from({ length: t.groups_count }, (_, i) => i + 1).map(g => {
                    const standings = getGroupStandings(t, g)
                    const groupMatches = tMatches.filter(m => m.phase === 'group' && m.group_num === g)
                    return (
                      <div key={g} style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #0f2d1a, #1a472a)', color: '#fff', padding: '10px 16px', fontWeight: '700', fontSize: '14px' }}>
                          בית {GROUP_NAMES[g - 1]}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f9faf9' }}>
                              <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: '600', color: '#888', borderBottom: '1px solid #eee' }}>שחקן</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#888', borderBottom: '1px solid #eee' }}>מ׳</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#888', borderBottom: '1px solid #eee' }}>נ׳</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#888', borderBottom: '1px solid #eee' }}>נק׳</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((tp, rank) => (
                              <tr key={tp.id} style={{ borderBottom: '1px solid #f5f5f5', background: tp.advanced ? '#f0fdf4' : 'transparent' }}>
                                <td style={{ padding: '9px 14px', fontWeight: rank < t.advance_per_group ? '700' : '400', color: '#111' }}>
                                  {tp.advanced && <span style={{ color: '#16a34a', marginLeft: '4px' }}>▲</span>}
                                  {pName(tp.player_id)}
                                </td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#666' }}>{tp.played}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#666' }}>{tp.wins}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700', color: '#1a472a' }}>{tp.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Matches */}
                        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#bbb', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>משחקים</div>
                          {groupMatches.map(m => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px', color: '#555' }}>
                              <span>
                                <span style={{ fontWeight: m.winner_id === m.player1_id ? '700' : '400', color: m.winner_id === m.player1_id ? '#16a34a' : '#333' }}>{pName(m.player1_id)}</span>
                                <span style={{ color: '#ccc', margin: '0 5px' }}>vs</span>
                                <span style={{ fontWeight: m.winner_id === m.player2_id ? '700' : '400', color: m.winner_id === m.player2_id ? '#16a34a' : '#333' }}>{pName(m.player2_id)}</span>
                              </span>
                              {m.score && <span style={{ color: '#888', fontWeight: '600' }}>{m.score}</span>}
                              {m.status === 'pending' && <span style={{ color: '#ccc' }}>טרם שוחק</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Knockout bracket */}
            {(t.status === 'knockout' || t.status === 'completed') && knockoutMatches.length > 0 && (
              <section>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#333', marginBottom: '16px', borderBottom: '2px solid #e8ece8', paddingBottom: '10px' }}>שלב נוק-אאוט</h2>
                <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '20px', minWidth: 'fit-content' }}>
                    {knockoutRounds.map(round => (
                      <div key={round} style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{
                          textAlign: 'center', fontSize: '12px', fontWeight: '700',
                          color: round === 1 ? '#7c3aed' : '#888',
                          letterSpacing: '1px', marginBottom: '12px', padding: '6px 10px',
                          background: round === 1 ? '#f5f3ff' : '#f9f9f9', borderRadius: '8px',
                        }}>
                          {ROUND_NAMES[round] || `סיבוב ${round}`}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {knockoutMatches.filter(m => m.round === round).map(m => {
                            const isP1Win = m.winner_id === m.player1_id
                            const isP2Win = m.winner_id === m.player2_id
                            return (
                              <div key={m.id} style={{ background: '#fff', border: `1px solid ${round === 1 ? '#c4b5fd' : '#e8ece8'}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                <div style={{ padding: '10px 14px', background: isP1Win ? '#dcfce7' : '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: isP1Win ? '700' : '400', color: isP1Win ? '#16a34a' : m.player1_id ? '#111' : '#ccc' }}>
                                    {m.player1_id ? pName(m.player1_id) : 'ממתין...'}
                                  </span>
                                  {isP1Win && <span style={{ fontSize: '14px' }}>🏆</span>}
                                </div>
                                <div style={{ padding: '10px 14px', background: isP2Win ? '#dcfce7' : '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: isP2Win ? '700' : '400', color: isP2Win ? '#16a34a' : m.player2_id ? '#111' : '#ccc' }}>
                                    {m.player2_id ? pName(m.player2_id) : 'ממתין...'}
                                  </span>
                                  {isP2Win && <span style={{ fontSize: '14px' }}>🏆</span>}
                                </div>
                                {m.score && (
                                  <div style={{ padding: '5px 14px', fontSize: '11px', color: '#888', background: '#f9f9f9', borderTop: '1px solid #eee', textAlign: 'center' }}>{m.score}</div>
                                )}
                                {m.status === 'pending' && (
                                  <div style={{ padding: '5px 14px', fontSize: '11px', color: '#d97706', background: '#fffbeb', borderTop: '1px solid #fde68a', textAlign: 'center' }}>⏳ טרם שוחק</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    )
  }

  // Tournament list
  return (
    <main style={{ maxWidth: '860px', margin: '40px auto', padding: '0 20px' }} dir="rtl">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#111' }}>תחרויות</h1>
        <p style={{ margin: '6px 0 0', color: '#888', fontSize: '15px' }}>תוצאות ולוחות גביע אקדמיית הטניס</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#bbb' }}>טוען...</div>
      ) : tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎾</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>אין תחרויות פעילות</div>
          <div style={{ color: '#aaa', fontSize: '14px' }}>התחרויות יופיעו כאן כשיתחילו</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tournaments.map(t => {
            const st = STATUS_T[t.status] || STATUS_T.draft
            return (
              <div key={t.id} onClick={() => loadDetail(t)}
                style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  🎾
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#111' }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{t.description}</div>}
                  <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>
                    {t.groups_count} בתים
                    {t.start_date && ` · ${new Date(t.start_date).toLocaleDateString('he-IL')}`}
                  </div>
                </div>
                <div style={{ background: `${st.color}15`, color: st.color, borderRadius: '20px', padding: '5px 16px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>{st.label}</div>
                <span style={{ color: '#ccc', fontSize: '18px' }}>←</span>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
