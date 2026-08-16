import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

const STATUS_T = {
  draft:     { label: 'טיוטה',      color: '#9ca3af' },
  groups:    { label: 'שלב בתים',   color: '#d97706' },
  knockout:  { label: 'נוק-אאוט',   color: '#7c3aed' },
  completed: { label: 'הסתיים',     color: '#16a34a' },
}
const ROUND_NAMES = { 1: 'גמר', 2: 'חצי גמר', 4: 'רבע גמר', 8: 'שמינית גמר', 16: 'שישה עשר', 32: 'שלושים ושניים' }
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const CONNECTOR_COLOR = '#d1d5db'
function calcSlotH(firstRound) {
  return Math.max(70, Math.min(100, 560 / firstRound))
}

function formatMatchTime(scheduledAt) {
  if (!scheduledAt) return null
  const d = new Date(scheduledAt)
  const date = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

// ── Connector column between two bracket rounds ─────────────────────────────
function ConnectorColumn({ matchCount, slotH }) {
  const pairs = Math.ceil(matchCount / 2)
  return (
    <div style={{ width: '28px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: pairs }, (_, i) => (
        <div key={i} style={{ height: 2 * slotH, position: 'relative', flexShrink: 0 }}>
          {/* horizontal from top match center */}
          <div style={{ position: 'absolute', top: slotH / 2 - 1, left: 0, right: 4, height: 2, background: CONNECTOR_COLOR }} />
          {/* horizontal from bottom match center */}
          <div style={{ position: 'absolute', top: slotH + slotH / 2 - 1, left: 0, right: 4, height: 2, background: CONNECTOR_COLOR }} />
          {/* vertical connecting both on right edge */}
          <div style={{ position: 'absolute', top: slotH / 2, bottom: slotH / 2, right: 4, width: 2, background: CONNECTOR_COLOR }} />
        </div>
      ))}
    </div>
  )
}

// ── Single match card ────────────────────────────────────────────────────────
function MatchCard({ m, pName, isFinal }) {
  if (!m) return <div style={{ width: 178, height: 70, border: '1px dashed #e8ece8', borderRadius: 10 }} />

  const isP1Win = m.winner_id === m.player1_id
  const isP2Win = m.winner_id === m.player2_id
  const isBye = m.status === 'completed' && (!m.player1_id || !m.player2_id)
  const isPending = m.status === 'pending'
  const hasInfo = m.scheduled_at || m.location

  return (
    <div style={{
      width: 178, flexShrink: 0,
      background: '#fff',
      border: `1.5px solid ${isFinal ? '#c4b5fd' : '#e8ece8'}`,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: isFinal ? '0 2px 12px rgba(124,58,237,0.12)' : '0 2px 8px rgba(0,0,0,0.05)',
      opacity: isBye ? 0.65 : 1,
    }}>
      {/* Player 1 */}
      <div style={{
        padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isP1Win ? '#dcfce7' : '#fafafa',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{ fontSize: 12, fontWeight: isP1Win ? '700' : '400', color: isP1Win ? '#16a34a' : m.player1_id ? '#111' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
          {m.player1_id ? pName(m.player1_id) : (isBye ? '—' : 'ממתין...')}
        </span>
        {isP1Win && <Icon name="trophy" size={13} color="#16a34a" style={{ flexShrink: 0 }} />}
      </div>
      {/* Player 2 */}
      <div style={{
        padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isP2Win ? '#dcfce7' : '#fafafa',
      }}>
        <span style={{ fontSize: 12, fontWeight: isP2Win ? '700' : '400', color: isP2Win ? '#16a34a' : m.player2_id ? '#111' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
          {m.player2_id ? pName(m.player2_id) : (isBye ? 'BYE' : 'ממתין...')}
        </span>
        {isP2Win && <Icon name="trophy" size={13} color="#16a34a" style={{ flexShrink: 0 }} />}
      </div>
      {/* Footer: score / schedule / location */}
      {(m.score || hasInfo || isBye || isPending) && (
        <div style={{ padding: '4px 10px', background: '#f9f9f9', borderTop: '1px solid #f0f0f0' }}>
          {m.score && <div style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>{m.score}</div>}
          {isBye && <div style={{ fontSize: 10, color: '#d97706' }}>עבר אוטומטית</div>}
          {!m.score && !isBye && isPending && m.scheduled_at && (
            <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon name="calendar" size={11} />{formatMatchTime(m.scheduled_at)}</div>
          )}
          {!m.score && !isBye && isPending && !m.scheduled_at && (
            <div style={{ fontSize: 10, color: '#ccc' }}>טרם שוחק</div>
          )}
          {m.location && <div style={{ fontSize: 10, color: '#888', marginTop: 1, display: 'flex', alignItems: 'center', gap: '4px' }}><Icon name="pin" size={11} />{m.location}</div>}
        </div>
      )}
    </div>
  )
}

// ── Bracket tree ─────────────────────────────────────────────────────────────
function BracketTree({ knockoutMatches, knockoutRounds, pName }) {
  if (!knockoutRounds.length) return null
  const firstRound = knockoutRounds[0] // largest = first played
  const slotH = calcSlotH(firstRound)

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16, paddingTop: 4 }}>
      <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0 }} dir="ltr">
        {knockoutRounds.map((round, idx) => {
          const roundMatches = knockoutMatches
            .filter(m => m.round === round)
            .sort((a, b) => a.match_num - b.match_num)
          const mySlotH = slotH * (firstRound / round)
          const isFinal = round === 1
          const isFirst = idx === knockoutRounds.length - 1

          return (
            <div key={round} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Round column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Round label */}
                <div style={{
                  fontSize: 11, fontWeight: '700', letterSpacing: '0.5px',
                  color: isFinal ? '#7c3aed' : '#999',
                  padding: '4px 8px', marginBottom: 8,
                  background: isFinal ? '#f5f3ff' : 'transparent',
                  borderRadius: 6, whiteSpace: 'nowrap',
                }}>
                  {ROUND_NAMES[round] || `סיבוב ${round}`}
                </div>
                {/* Matches */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {roundMatches.map(m => (
                    <div key={m.id} style={{ height: mySlotH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MatchCard m={m} pName={pName} isFinal={isFinal} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Connector (not after last column) */}
              {!isFirst && (
                <div style={{ marginTop: 36 }}>
                  <ConnectorColumn matchCount={roundMatches.length} slotH={mySlotH} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
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
      supabase.from('players').select('id, name').order('name'),
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
      supabase.from('tournament_matches').select('*').eq('tournament_id', t.id)
        .order('round', { ascending: false }).order('match_num'),
    ])
    setTPlayers(pRes.data || [])
    setTMatches(mRes.data || [])
    setLoadingDetail(false)
  }

  function pName(id) { return allPlayers.find(p => p.id === id)?.name || '?' }

  function getGroupStandings(t, g) {
    const gp = tPlayers.filter(tp => tp.group_num === g)
    return gp.map(tp => {
      const wins = tMatches.filter(m => m.phase === 'group' && m.group_num === g && m.winner_id === tp.player_id).length
      const played = tMatches.filter(m => m.phase === 'group' && m.group_num === g && m.status === 'completed' && (m.player1_id === tp.player_id || m.player2_id === tp.player_id)).length
      return { ...tp, wins, played, points: tp.group_points || 0 }
    }).sort((a, b) => b.points - a.points || b.wins - a.wins)
  }

  if (loading) return (
    <main style={{ maxWidth: 900, margin: '60px auto', padding: '0 20px', textAlign: 'center', color: '#bbb' }}>
      טוען תחרויות...
    </main>
  )

  // ── Detail view ──
  if (selected) {
    const t = selected
    const st = STATUS_T[t.status] || STATUS_T.draft
    const knockoutMatches = tMatches.filter(m => m.phase === 'knockout')
    const knockoutRounds = [...new Set(knockoutMatches.map(m => m.round))].sort((a, b) => b - a)
    const champion = knockoutMatches.find(m => m.round === 1)?.winner_id

    return (
      <main style={{ maxWidth: 1100, margin: '32px auto', padding: '0 20px' }} dir="rtl">
        {/* Back + header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => { setSelected(null); setTPlayers([]); setTMatches([]) }}
            style={{ background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
            ← חזרה
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: '800', color: '#111' }}>{t.name}</h1>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              {t.description && <span style={{ fontSize: 13, color: '#777' }}>{t.description}</span>}
              {t.start_date && <span style={{ fontSize: 12, color: '#aaa' }}>{new Date(t.start_date).toLocaleDateString('he-IL')}</span>}
              <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: '600' }}>{t.match_format === 'bo3' ? 'הטוב מ-3 סטים' : 'סט אחד'}</span>
            </div>
          </div>
          <div style={{ background: `${st.color}18`, color: st.color, borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: '700' }}>{st.label}</div>
        </div>

        {loadingDetail ? <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>טוען...</div> : (
          <>
            {/* Champion banner */}
            {t.status === 'completed' && champion && (
              <div style={{ background: 'linear-gradient(135deg, #0f2d1a, #1a472a, #2d6a4f)', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 32, color: '#fff', boxShadow: '0 8px 28px rgba(26,71,42,0.3)' }}>
                <div style={{ marginBottom: 8 }}><Icon name="trophy" size={38} color="#fff" /></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 3, marginBottom: 6 }}>אלוף/ת</div>
                <div style={{ fontSize: 32, fontWeight: '800' }}>{pName(champion)}</div>
              </div>
            )}

            {/* Groups */}
            {t.mode !== 'knockout_only' && (t.status === 'groups' || t.status === 'knockout' || t.status === 'completed') && (
              <section style={{ marginBottom: 36 }}>
                <h2 style={{ fontSize: 17, fontWeight: '800', color: '#333', marginBottom: 16, borderBottom: '2px solid #e8ece8', paddingBottom: 10 }}>שלב הבתים</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {Array.from({ length: t.groups_count }, (_, i) => i + 1).map(g => {
                    const standings = getGroupStandings(selected, g)
                    const groupMatches = tMatches.filter(m => m.phase === 'group' && m.group_num === g)
                    return (
                      <div key={g} style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #0f2d1a, #1a472a)', color: '#fff', padding: '10px 16px', fontWeight: '700', fontSize: 14 }}>
                          בית {GROUP_NAMES[g - 1]}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#f9faf9' }}>
                              {['שחקן', 'מ׳', 'נ׳', 'נק׳'].map((h, j) => (
                                <th key={h} style={{ padding: j === 0 ? '8px 14px' : '8px 10px', textAlign: j === 0 ? 'right' : 'center', fontWeight: '600', color: '#888', borderBottom: '1px solid #eee' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((tp, rank) => (
                              <tr key={tp.id} style={{ borderBottom: '1px solid #f5f5f5', background: tp.advanced ? '#f0fdf4' : 'transparent' }}>
                                <td style={{ padding: '9px 14px', fontWeight: rank < t.advance_per_group ? '700' : '400', color: '#111' }}>
                                  {tp.advanced && <span style={{ color: '#16a34a', marginLeft: 4 }}>▲</span>}
                                  {pName(tp.player_id)}
                                </td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#666' }}>{tp.played}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#666' }}>{tp.wins}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700', color: '#1a472a' }}>{tp.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: 11, fontWeight: '600', color: '#bbb', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>משחקים</div>
                          {groupMatches.map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, fontSize: 12, color: '#555' }}>
                              <span>
                                <span style={{ fontWeight: m.winner_id === m.player1_id ? '700' : '400', color: m.winner_id === m.player1_id ? '#16a34a' : '#333' }}>{pName(m.player1_id)}</span>
                                <span style={{ color: '#ccc', margin: '0 5px' }}>vs</span>
                                <span style={{ fontWeight: m.winner_id === m.player2_id ? '700' : '400', color: m.winner_id === m.player2_id ? '#16a34a' : '#333' }}>{pName(m.player2_id)}</span>
                              </span>
                              {m.score
                                ? <span style={{ color: '#555', fontWeight: '600' }}>{m.score}</span>
                                : m.scheduled_at
                                  ? <span style={{ color: '#7c3aed', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon name="calendar" size={11} />{formatMatchTime(m.scheduled_at)}</span>
                                  : <span style={{ color: '#ccc', fontSize: 11 }}>טרם שוחק</span>
                              }
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
                <h2 style={{ fontSize: 17, fontWeight: '800', color: '#333', marginBottom: 4, borderBottom: '2px solid #e8ece8', paddingBottom: 10 }}>
                  עץ נוק-אאוט
                </h2>
                <BracketTree knockoutMatches={knockoutMatches} knockoutRounds={knockoutRounds} pName={pName} />
              </section>
            )}
          </>
        )}
      </main>
    )
  }

  // ── Tournament list ──
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }} dir="rtl">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: '800', color: '#111', display: 'flex', alignItems: 'center', gap: '10px' }}>תחרויות<Icon name="trophy" size={24} color="#1a472a" /></h1>
        <p style={{ margin: '6px 0 0', color: '#888', fontSize: 15 }}>תוצאות ולוחות תחרויות</p>
      </div>

      {tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ marginBottom: 16 }}><Icon name="ball" size={42} color="#ddd" /></div>
          <div style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>אין תחרויות פעילות כרגע</div>
          <div style={{ color: '#aaa', fontSize: 14 }}>התחרויות יופיעו כאן כשיתחילו</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tournaments.map(t => {
            const st = STATUS_T[t.status] || STATUS_T.draft
            return (
              <div key={t.id} onClick={() => loadDetail(t)}
                style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="trophy" size={22} color="#fff" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: 17, color: '#111' }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{t.description}</div>}
                  <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
                    {t.mode === 'knockout_only' ? 'נוק-אאוט בלבד' : `${t.groups_count} בתים`}
                    {' · '}{t.match_format === 'bo3' ? 'הטוב מ-3' : 'סט אחד'}
                    {t.start_date && ` · ${new Date(t.start_date).toLocaleDateString('he-IL')}`}
                  </div>
                </div>
                <div style={{ background: `${st.color}15`, color: st.color, borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: '700', whiteSpace: 'nowrap' }}>{st.label}</div>
                <span style={{ color: '#ccc', fontSize: 20 }}>←</span>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
