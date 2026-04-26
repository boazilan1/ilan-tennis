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

const ls = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555', fontWeight: '600' }
const is = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e7e0', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }
const pb = { background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
const ob = { background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }

export default function TournamentsTab() {
  const [tournaments, setTournaments] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tPlayers, setTPlayers] = useState([])
  const [tMatches, setTMatches] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', start_date: '', groups_count: '2', advance_per_group: '2' })
  const [creating, setCreating] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [resultScore, setResultScore] = useState('')
  const [resultWinner, setResultWinner] = useState('')
  const [savingResult, setSavingResult] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const [tRes, pRes] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('players').select('id, name, birth_year').order('name'),
    ])
    if (tRes.data) setTournaments(tRes.data)
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

  function getGroupStandings(groupNum) {
    const gPlayers = tPlayers.filter(tp => tp.group_num === groupNum)
    return gPlayers.map(tp => {
      const wins = tMatches.filter(m => m.phase === 'group' && m.group_num === groupNum && m.winner_id === tp.player_id).length
      const played = tMatches.filter(m => m.phase === 'group' && m.group_num === groupNum && m.status === 'completed' && (m.player1_id === tp.player_id || m.player2_id === tp.player_id)).length
      return { ...tp, wins, played, points: tp.group_points || 0 }
    }).sort((a, b) => b.points - a.points || b.wins - a.wins)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.name.trim()) return
    setCreating(true)
    const { data } = await supabase.from('tournaments').insert({
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
      start_date: createForm.start_date || null,
      status: 'draft',
      groups_count: parseInt(createForm.groups_count) || 2,
      advance_per_group: parseInt(createForm.advance_per_group) || 2,
    }).select().single()
    if (data) {
      setTournaments(prev => [data, ...prev])
      setShowCreate(false)
      setCreateForm({ name: '', description: '', start_date: '', groups_count: '2', advance_per_group: '2' })
      await loadDetail(data)
    }
    setCreating(false)
  }

  async function addPlayer(playerId) {
    const { data } = await supabase.from('tournament_players')
      .insert({ tournament_id: selected.id, player_id: playerId, group_points: 0 }).select().single()
    if (data) setTPlayers(prev => [...prev, data])
  }

  async function removePlayer(tpId) {
    await supabase.from('tournament_players').delete().eq('id', tpId)
    setTPlayers(prev => prev.filter(tp => tp.id !== tpId))
  }

  async function deleteTournament(t) {
    if (!window.confirm(`למחוק את "${t.name}"?`)) return
    await supabase.from('tournaments').delete().eq('id', t.id)
    setTournaments(prev => prev.filter(x => x.id !== t.id))
    if (selected?.id === t.id) { setSelected(null); setTPlayers([]); setTMatches([]) }
  }

  async function drawGroups() {
    setDrawing(true)
    const t = selected
    const shuffled = [...tPlayers].sort(() => Math.random() - 0.5)
    const assigned = shuffled.map((tp, i) => ({ ...tp, group_num: (i % t.groups_count) + 1 }))

    for (const tp of assigned) {
      await supabase.from('tournament_players').update({ group_num: tp.group_num }).eq('id', tp.id)
    }

    const groupMap = {}
    for (let g = 1; g <= t.groups_count; g++) groupMap[g] = assigned.filter(tp => tp.group_num === g)

    const matches = []
    let matchNum = 0
    for (const [g, players] of Object.entries(groupMap)) {
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          matches.push({
            tournament_id: t.id, phase: 'group', group_num: parseInt(g),
            match_num: matchNum++, player1_id: players[i].player_id, player2_id: players[j].player_id, status: 'pending',
          })
        }
      }
    }

    await supabase.from('tournament_matches').insert(matches)
    await supabase.from('tournaments').update({ status: 'groups' }).eq('id', t.id)
    const updated = { ...t, status: 'groups' }
    setSelected(updated)
    setTournaments(prev => prev.map(x => x.id === t.id ? updated : x))
    await loadDetail(updated)
    setDrawing(false)
  }

  async function saveResult() {
    if (!resultWinner || !editingMatchId) return
    setSavingResult(true)
    const match = tMatches.find(m => m.id === editingMatchId)

    await supabase.from('tournament_matches').update({
      score: resultScore.trim() || null, winner_id: resultWinner, status: 'completed',
    }).eq('id', editingMatchId)

    if (match.phase === 'group') {
      const winnerTp = tPlayers.find(tp => tp.player_id === resultWinner && tp.group_num === match.group_num)
      if (winnerTp) {
        await supabase.from('tournament_players').update({ group_points: (winnerTp.group_points || 0) + 3 }).eq('id', winnerTp.id)
      }
    } else if (match.phase === 'knockout') {
      const nextRound = match.round / 2
      if (nextRound >= 1) {
        const nextMatchNum = Math.ceil(match.match_num / 2)
        const nextMatch = tMatches.find(m => m.phase === 'knockout' && m.round === nextRound && m.match_num === nextMatchNum)
        if (nextMatch) {
          const slot = match.match_num % 2 === 1 ? { player1_id: resultWinner } : { player2_id: resultWinner }
          await supabase.from('tournament_matches').update(slot).eq('id', nextMatch.id)
        }
      } else {
        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', selected.id)
        const updated = { ...selected, status: 'completed' }
        setSelected(updated)
        setTournaments(prev => prev.map(x => x.id === selected.id ? updated : x))
      }
    }

    setEditingMatchId(null); setResultScore(''); setResultWinner('')
    await loadDetail(selected)
    setSavingResult(false)
  }

  async function advanceToKnockout() {
    const t = selected
    const total = t.groups_count * t.advance_per_group
    if ((total & (total - 1)) !== 0) {
      alert(`${total} מתקדמים — המספר חייב להיות חזקה של 2 (2, 4, 8...)`)
      return
    }
    setAdvancing(true)

    const groupStandings = {}
    for (let g = 1; g <= t.groups_count; g++) groupStandings[g] = getGroupStandings(g)

    for (let g = 1; g <= t.groups_count; g++) {
      for (const tp of groupStandings[g].slice(0, t.advance_per_group)) {
        await supabase.from('tournament_players').update({ advanced: true }).eq('id', tp.id)
      }
    }

    // Cross-seeding: winners vs reversed runners-up
    const winners = [], runnersUp = []
    for (let g = 1; g <= t.groups_count; g++) {
      if (groupStandings[g][0]) winners.push(groupStandings[g][0].player_id)
      if (t.advance_per_group >= 2 && groupStandings[g][1]) runnersUp.push(groupStandings[g][1].player_id)
    }
    const ruRev = [...runnersUp].reverse()

    let paired = []
    if (t.advance_per_group === 1) {
      const n = winners.length
      for (let i = 0; i < n / 2; i++) { paired.push(winners[i]); paired.push(winners[n - 1 - i]) }
    } else {
      for (let i = 0; i < winners.length; i++) { paired.push(winners[i]); paired.push(ruRev[i] || null) }
    }

    const firstRound = total / 2
    const matches = []
    for (let i = 0; i < firstRound; i++) {
      matches.push({
        tournament_id: t.id, phase: 'knockout', round: firstRound, match_num: i + 1,
        player1_id: paired[i * 2] || null, player2_id: paired[i * 2 + 1] || null, status: 'pending',
      })
    }
    let r = Math.floor(firstRound / 2)
    while (r >= 1) {
      for (let i = 0; i < r; i++) {
        matches.push({ tournament_id: t.id, phase: 'knockout', round: r, match_num: i + 1, player1_id: null, player2_id: null, status: 'pending' })
      }
      r = Math.floor(r / 2)
    }

    await supabase.from('tournament_matches').insert(matches)
    await supabase.from('tournaments').update({ status: 'knockout' }).eq('id', t.id)
    const updated = { ...t, status: 'knockout' }
    setSelected(updated)
    setTournaments(prev => prev.map(x => x.id === t.id ? updated : x))
    await loadDetail(updated)
    setAdvancing(false)
  }

  // ── Render ──
  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  // Detail view
  if (selected) {
    const t = selected
    const st = STATUS_T[t.status] || STATUS_T.draft
    const registeredIds = new Set(tPlayers.map(tp => tp.player_id))
    const notRegistered = allPlayers.filter(p => !registeredIds.has(p.id) && (!playerSearch || p.name.includes(playerSearch)))
    const allGroupMatchesDone = tMatches.filter(m => m.phase === 'group').every(m => m.status === 'completed')
    const knockoutMatches = tMatches.filter(m => m.phase === 'knockout')
    const knockoutRounds = [...new Set(knockoutMatches.map(m => m.round))].sort((a, b) => b - a)

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button onClick={() => { setSelected(null); setTPlayers([]); setTMatches([]) }} style={{ ...ob, padding: '8px 14px' }}>← חזרה</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#111' }}>{t.name}</div>
            {t.start_date && <div style={{ fontSize: '13px', color: '#888' }}>{new Date(t.start_date).toLocaleDateString('he-IL')}</div>}
          </div>
          <div style={{ background: `${st.color}18`, color: st.color, borderRadius: '20px', padding: '5px 16px', fontSize: '13px', fontWeight: '700' }}>{st.label}</div>
          <button onClick={() => deleteTournament(t)} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>מחק</button>
        </div>

        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>
        ) : (
          <div>
            {/* ── Draft phase: manage players ── */}
            {t.status === 'draft' && (
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#333', marginBottom: '16px' }}>
                  שחקנים רשומים ({tPlayers.length})
                </div>

                {/* Registered players */}
                {tPlayers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                    {tPlayers.map(tp => (
                      <div key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0f7f0', border: '1px solid #c5ddc5', borderRadius: '20px', padding: '5px 12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a472a' }}>{pName(tp.player_id)}</span>
                        <button onClick={() => removePlayer(tp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '14px', lineHeight: 1, padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add player search */}
                <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '10px' }}>הוסף שחקנים</div>
                  <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder="חיפוש שם..." style={{ ...is, marginBottom: '10px' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {notRegistered.map(p => (
                      <button key={p.id} onClick={() => addPlayer(p.id)} style={{
                        background: '#f9f9f9', border: '1px solid #eee', borderRadius: '20px', padding: '6px 14px',
                        cursor: 'pointer', fontSize: '13px', color: '#333',
                      }}>{p.name} <span style={{ color: '#bbb', fontSize: '11px' }}>{p.birth_year}</span></button>
                    ))}
                    {notRegistered.length === 0 && <span style={{ color: '#ccc', fontSize: '13px' }}>כל השחקנים רשומים</span>}
                  </div>
                </div>

                {tPlayers.length >= 4 ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
                      {tPlayers.length} שחקנים · {t.groups_count} בתים · {Math.floor(tPlayers.length / t.groups_count)} שחקנים בממוצע לבית
                    </div>
                    <button onClick={drawGroups} disabled={drawing} style={{ ...pb, padding: '12px 32px', fontSize: '15px', boxShadow: '0 4px 14px rgba(26,71,42,0.25)', opacity: drawing ? 0.6 : 1 }}>
                      {drawing ? 'מגריל...' : '🎲 הגרל בתים והתחל'}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px' }}>יש להוסיף לפחות 4 שחקנים</div>
                )}
              </div>
            )}

            {/* ── Groups phase ── */}
            {(t.status === 'groups' || t.status === 'knockout' || t.status === 'completed') && (
              <div>
                <div style={{ fontWeight: '700', fontSize: '17px', color: '#333', marginBottom: '18px' }}>שלב הבתים</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  {Array.from({ length: t.groups_count }, (_, i) => i + 1).map(g => {
                    const standings = getGroupStandings(g)
                    const groupMatches = tMatches.filter(m => m.phase === 'group' && m.group_num === g)
                    return (
                      <div key={g} style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', overflow: 'hidden' }}>
                        {/* Group header */}
                        <div style={{ background: '#1a472a', color: '#fff', padding: '10px 16px', fontWeight: '700', fontSize: '14px' }}>
                          בית {GROUP_NAMES[g - 1]}
                        </div>
                        {/* Standings */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f9f9f9' }}>
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
                                  {rank < t.advance_per_group && t.status !== 'draft' && <span style={{ color: '#16a34a', marginLeft: '4px' }}>▲</span>}
                                  {pName(tp.player_id)}
                                </td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#666' }}>{tp.played}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', color: '#666' }}>{tp.wins}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700', color: '#1a472a' }}>{tp.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Group matches */}
                        <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0' }}>
                          {groupMatches.map(m => {
                            const isEditing = editingMatchId === m.id
                            return (
                              <div key={m.id} style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                  <div style={{ fontSize: '12px', color: '#333' }}>
                                    <span style={{ fontWeight: m.winner_id === m.player1_id ? '700' : '400' }}>{pName(m.player1_id)}</span>
                                    <span style={{ color: '#bbb', margin: '0 6px' }}>vs</span>
                                    <span style={{ fontWeight: m.winner_id === m.player2_id ? '700' : '400' }}>{pName(m.player2_id)}</span>
                                    {m.score && <span style={{ color: '#888', marginRight: '6px' }}> · {m.score}</span>}
                                  </div>
                                  {t.status === 'groups' && m.status === 'pending' && !isEditing && (
                                    <button onClick={() => { setEditingMatchId(m.id); setResultScore(''); setResultWinner('') }} style={{ background: '#f0f7f0', color: '#1a472a', border: '1px solid #c5ddc5', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                      הזן תוצאה
                                    </button>
                                  )}
                                  {m.status === 'completed' && (
                                    <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>✓</span>
                                  )}
                                </div>
                                {isEditing && (
                                  <div style={{ background: '#f9f9f9', border: '1px solid #e8ece8', borderRadius: '10px', padding: '12px', marginTop: '6px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                      <div>
                                        <label style={{ ...ls, fontSize: '11px' }}>תוצאה (אופציונלי)</label>
                                        <input value={resultScore} onChange={e => setResultScore(e.target.value)} placeholder="6-4, 7-5" style={{ ...is, fontSize: '12px', padding: '7px 10px' }} />
                                      </div>
                                      <div>
                                        <label style={{ ...ls, fontSize: '11px' }}>מנצח *</label>
                                        <select value={resultWinner} onChange={e => setResultWinner(e.target.value)} style={{ ...is, fontSize: '12px', padding: '7px 10px' }}>
                                          <option value="">בחר מנצח</option>
                                          <option value={m.player1_id}>{pName(m.player1_id)}</option>
                                          <option value={m.player2_id}>{pName(m.player2_id)}</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                      <button onClick={() => setEditingMatchId(null)} style={{ ...ob, padding: '6px 12px', fontSize: '12px' }}>ביטול</button>
                                      <button onClick={saveResult} disabled={!resultWinner || savingResult} style={{ ...pb, padding: '6px 14px', fontSize: '12px', opacity: (!resultWinner || savingResult) ? 0.6 : 1 }}>
                                        {savingResult ? '...' : 'שמור'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Advance to knockout button */}
                {t.status === 'groups' && allGroupMatchesDone && (
                  <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid #e8ece8' }}>
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
                      כל משחקי הבתים הושלמו · {t.groups_count * t.advance_per_group} שחקנים יתקדמו לנוק-אאוט
                    </div>
                    <button onClick={advanceToKnockout} disabled={advancing} style={{ ...pb, padding: '12px 32px', fontSize: '15px', background: '#7c3aed', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', opacity: advancing ? 0.6 : 1 }}>
                      {advancing ? 'מייצר bracket...' : '🏆 עבור לשלב נוק-אאוט'}
                    </button>
                  </div>
                )}
                {t.status === 'groups' && !allGroupMatchesDone && (
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', padding: '16px 0', borderTop: '1px solid #e8ece8' }}>
                    יש להשלים את כל משחקי הבתים לפני המעבר לנוק-אאוט
                  </div>
                )}
              </div>
            )}

            {/* ── Knockout phase ── */}
            {(t.status === 'knockout' || t.status === 'completed') && knockoutMatches.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: '#333', marginBottom: '18px' }}>שלב נוק-אאוט</div>

                {/* Champion banner */}
                {t.status === 'completed' && (() => {
                  const finalMatch = knockoutMatches.find(m => m.round === 1)
                  const champion = finalMatch?.winner_id
                  return champion ? (
                    <div style={{ background: 'linear-gradient(135deg, #1a472a, #2d6a4f)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px', color: '#fff', boxShadow: '0 8px 24px rgba(26,71,42,0.25)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: '1px', marginBottom: '4px' }}>אלוף/ת</div>
                      <div style={{ fontSize: '26px', fontWeight: '800' }}>{pName(champion)}</div>
                    </div>
                  ) : null
                })()}

                {/* Bracket columns */}
                <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '20px', minWidth: 'fit-content' }}>
                    {knockoutRounds.map(round => (
                      <div key={round} style={{ flex: 1, minWidth: '200px' }}>
                        {/* Round label */}
                        <div style={{
                          textAlign: 'center', fontSize: '12px', fontWeight: '700', color: round === 1 ? '#7c3aed' : '#888',
                          textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', padding: '6px',
                          background: round === 1 ? '#f5f3ff' : 'transparent', borderRadius: '8px',
                        }}>
                          {ROUND_NAMES[round] || `סיבוב ${round}`}
                        </div>
                        {/* Matches in this round */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {knockoutMatches.filter(m => m.round === round).map(m => {
                            const isEditing = editingMatchId === m.id
                            const isP1Win = m.winner_id === m.player1_id
                            const isP2Win = m.winner_id === m.player2_id
                            const canEnter = t.status === 'knockout' && m.status === 'pending' && m.player1_id && m.player2_id
                            return (
                              <div key={m.id} style={{ background: '#fff', border: `1px solid ${round === 1 ? '#c4b5fd' : '#e8ece8'}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                {/* Player 1 */}
                                <div style={{ padding: '10px 14px', background: isP1Win ? '#dcfce7' : '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: isP1Win ? '700' : '400', color: isP1Win ? '#16a34a' : m.player1_id ? '#111' : '#ccc' }}>
                                    {m.player1_id ? pName(m.player1_id) : 'ממתין...'}
                                  </span>
                                  {isP1Win && <span>🏆</span>}
                                </div>
                                {/* Player 2 */}
                                <div style={{ padding: '10px 14px', background: isP2Win ? '#dcfce7' : '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: isP2Win ? '700' : '400', color: isP2Win ? '#16a34a' : m.player2_id ? '#111' : '#ccc' }}>
                                    {m.player2_id ? pName(m.player2_id) : 'ממתין...'}
                                  </span>
                                  {isP2Win && <span>🏆</span>}
                                </div>
                                {/* Score or enter result */}
                                {m.score && (
                                  <div style={{ padding: '5px 14px', fontSize: '11px', color: '#888', background: '#f9f9f9', borderTop: '1px solid #eee', textAlign: 'center' }}>{m.score}</div>
                                )}
                                {canEnter && !isEditing && (
                                  <button onClick={() => { setEditingMatchId(m.id); setResultScore(''); setResultWinner('') }} style={{ width: '100%', background: '#fef3c7', color: '#d97706', border: 'none', borderTop: '1px solid #fde68a', padding: '7px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                                    ⏳ הזן תוצאה
                                  </button>
                                )}
                                {isEditing && (
                                  <div style={{ padding: '10px 12px', background: '#f9f9f9', borderTop: '1px solid #eee' }}>
                                    <input value={resultScore} onChange={e => setResultScore(e.target.value)} placeholder="6-4, 7-5" style={{ ...is, fontSize: '12px', padding: '6px 10px', marginBottom: '6px' }} />
                                    <select value={resultWinner} onChange={e => setResultWinner(e.target.value)} style={{ ...is, fontSize: '12px', padding: '6px 10px', marginBottom: '8px' }}>
                                      <option value="">מנצח...</option>
                                      <option value={m.player1_id}>{pName(m.player1_id)}</option>
                                      <option value={m.player2_id}>{pName(m.player2_id)}</option>
                                    </select>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button onClick={() => setEditingMatchId(null)} style={{ ...ob, flex: 1, padding: '6px', fontSize: '12px' }}>ביטול</button>
                                      <button onClick={saveResult} disabled={!resultWinner || savingResult} style={{ ...pb, flex: 1, padding: '6px', fontSize: '12px', opacity: (!resultWinner || savingResult) ? 0.6 : 1 }}>שמור</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Tournament list ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#111' }}>תחרויות</h2>
        <button onClick={() => setShowCreate(f => !f)} style={pb}>{showCreate ? 'סגור' : '+ תחרות חדשה'}</button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 16px rgba(26,71,42,0.08)' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a472a', marginBottom: '16px' }}>תחרות חדשה</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={ls}>שם התחרות *</label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="גביע קיץ 2026" style={is} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={ls}>תיאור</label>
              <input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="פרטים נוספים" style={is} />
            </div>
            <div>
              <label style={ls}>תאריך התחלה</label>
              <input type="date" value={createForm.start_date} onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))} style={is} />
            </div>
            <div />
            <div>
              <label style={ls}>מספר בתים</label>
              <select value={createForm.groups_count} onChange={e => setCreateForm(f => ({ ...f, groups_count: e.target.value }))} style={is}>
                {[2, 3, 4].map(n => <option key={n} value={n}>{n} בתים</option>)}
              </select>
            </div>
            <div>
              <label style={ls}>מתקדמים מכל בית</label>
              <select value={createForm.advance_per_group} onChange={e => setCreateForm(f => ({ ...f, advance_per_group: e.target.value }))} style={is}>
                {[1, 2].map(n => <option key={n} value={n}>{n} מתקדמים</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', background: '#f0f7f0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#555' }}>
              סה"כ {parseInt(createForm.groups_count) * parseInt(createForm.advance_per_group)} שחקנים יתקדמו לנוק-אאוט
              {(parseInt(createForm.groups_count) * parseInt(createForm.advance_per_group) & (parseInt(createForm.groups_count) * parseInt(createForm.advance_per_group) - 1)) !== 0 &&
                <span style={{ color: '#dc2626', marginRight: '8px' }}>⚠️ לא חזקה של 2 — שנה את ההגדרות</span>
              }
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" onClick={() => setShowCreate(false)} style={ob}>ביטול</button>
            <button type="submit" disabled={creating} style={{ ...pb, opacity: creating ? 0.6 : 1 }}>{creating ? 'יוצר...' : 'צור תחרות'}</button>
          </div>
        </form>
      )}

      {tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>אין תחרויות עדיין</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tournaments.map(t => {
            const st = STATUS_T[t.status] || STATUS_T.draft
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#111' }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{t.description}</div>}
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                    {t.groups_count} בתים · {t.advance_per_group} מתקדמים
                    {t.start_date && ` · ${new Date(t.start_date).toLocaleDateString('he-IL')}`}
                  </div>
                </div>
                <div style={{ background: `${st.color}15`, color: st.color, borderRadius: '20px', padding: '5px 16px', fontSize: '12px', fontWeight: '700' }}>{st.label}</div>
                <button onClick={() => loadDetail(t)} style={{ ...pb, fontSize: '13px', padding: '8px 18px' }}>ניהול</button>
                <button onClick={() => deleteTournament(t)} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>מחק</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
