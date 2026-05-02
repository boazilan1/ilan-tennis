import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_T = {
  draft:     { label: 'טיוטה',      color: '#9ca3af' },
  groups:    { label: 'שלב בתים',   color: '#d97706' },
  knockout:  { label: 'נוק-אאוט',   color: '#7c3aed' },
  completed: { label: 'הסתיים 🏆',  color: '#16a34a' },
}
const ROUND_NAMES = { 1: 'גמר', 2: 'חצי גמר', 4: 'רבע גמר', 8: 'שמינית גמר', 16: 'שישה-עשר', 32: 'שלושים ושניים' }
const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const ls = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555', fontWeight: '600' }
const is = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e7e0', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }
const pb = { background: '#1a472a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }
const ob = { background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }

// ── Bracket helpers ──────────────────────────────────────────────────────────

function nextPow2(n) {
  if (n <= 1) return 1
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

// Returns seeded bracket positions in priority order.
// positions[0] = where seed1 goes, positions[1] = where seed2 goes, etc.
// Ensures seed1 & seed2 are in opposite halves, seed3 & seed4 in separate halves.
function getSeededPositions(p) {
  if (p === 1) return [0]
  if (p === 2) return [0, 1]
  const half = p / 2
  const prev = getSeededPositions(half)
  const result = []
  for (let i = 0; i < prev.length; i++) {
    result.push(prev[i])
    result.push(p - 1 - prev[i])
  }
  return result
}

// Build bracket slots array of size p from ordered playerIds (strongest first).
// Extra slots remain null (byes).
function buildBracketSlots(p, playerIds) {
  const slots = new Array(p).fill(null)
  const positions = getSeededPositions(p)
  for (let i = 0; i < playerIds.length && i < p; i++) {
    slots[positions[i]] = playerIds[i]
  }
  return slots
}

// Build all knockout matches from a slots array, pre-propagating byes.
function buildKnockoutMatches(tournamentId, slots) {
  const p = slots.length
  const firstRound = p / 2

  const round1 = []
  for (let i = 0; i < firstRound; i++) {
    const p1 = slots[i * 2]
    const p2 = slots[i * 2 + 1]
    const isBye = !p1 || !p2
    round1.push({
      tournament_id: tournamentId, phase: 'knockout', round: firstRound, match_num: i + 1,
      player1_id: p1 || null, player2_id: p2 || null,
      status: isBye ? 'completed' : 'pending',
      winner_id: isBye ? (p1 || p2) : null,
    })
  }

  // Pre-populate round 2 with bye winners so they appear immediately
  const r2pre = {}
  for (let i = 0; i < firstRound; i++) {
    if (round1[i].winner_id) {
      const nm = Math.ceil((i + 1) / 2)
      const slot = (i + 1) % 2 === 1 ? 'player1_id' : 'player2_id'
      if (!r2pre[nm]) r2pre[nm] = {}
      r2pre[nm][slot] = round1[i].winner_id
    }
  }

  const otherRounds = []
  let r = Math.floor(firstRound / 2)
  while (r >= 1) {
    for (let i = 0; i < r; i++) {
      const matchNum = i + 1
      const pre = r === Math.floor(firstRound / 2) ? (r2pre[matchNum] || {}) : {}
      otherRounds.push({
        tournament_id: tournamentId, phase: 'knockout', round: r, match_num: matchNum,
        player1_id: pre.player1_id || null, player2_id: pre.player2_id || null,
        status: 'pending',
      })
    }
    r = Math.floor(r / 2)
  }

  return [...round1, ...otherRounds]
}

// ────────────────────────────────────────────────────────────────────────────

export default function TournamentsTab() {
  const [tournaments, setTournaments] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tPlayers, setTPlayers] = useState([])
  const [tMatches, setTMatches] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', description: '', start_date: '',
    groups_count: '2', advance_per_group: '2',
    match_format: 'bo1', mode: 'groups_knockout',
  })
  const [creating, setCreating] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [resultScore, setResultScore] = useState('')
  const [resultWinner, setResultWinner] = useState('')
  const [savingResult, setSavingResult] = useState(false)
  // Seed order: array of playerIds in seeding priority (strongest first)
  const [seedOrder, setSeedOrder] = useState([])

  useEffect(() => { init() }, [])

  // Keep seedOrder in sync with tPlayers (preserve manual order, append new players)
  useEffect(() => {
    setSeedOrder(prev => {
      const currentIds = new Set(tPlayers.map(tp => tp.player_id))
      const newIds = tPlayers.map(tp => tp.player_id).filter(id => !prev.includes(id))
      return [...prev.filter(id => currentIds.has(id)), ...newIds]
    })
  }, [tPlayers])

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

  function moveSeed(id, dir) {
    setSeedOrder(prev => {
      const idx = prev.indexOf(id)
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

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
      match_format: createForm.match_format,
      mode: createForm.mode,
    }).select().single()
    if (data) {
      setTournaments(prev => [data, ...prev])
      setShowCreate(false)
      setCreateForm({ name: '', description: '', start_date: '', groups_count: '2', advance_per_group: '2', match_format: 'bo1', mode: 'groups_knockout' })
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
          matches.push({ tournament_id: t.id, phase: 'group', group_num: parseInt(g), match_num: matchNum++, player1_id: players[i].player_id, player2_id: players[j].player_id, status: 'pending' })
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

  async function startKnockoutOnly() {
    const t = selected
    const n = seedOrder.length
    if (n < 2) { alert('יש להוסיף לפחות 2 שחקנים'); return }
    setDrawing(true)

    const p = nextPow2(n)
    const slots = buildBracketSlots(p, seedOrder)
    const matches = buildKnockoutMatches(t.id, slots)

    await supabase.from('tournament_matches').insert(matches)
    await supabase.from('tournaments').update({ status: 'knockout' }).eq('id', t.id)
    const updated = { ...t, status: 'knockout' }
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
        await supabase.from('tournament_players').update({ group_points: (winnerTp.group_points || 0) + 1 }).eq('id', winnerTp.id)
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
    setAdvancing(true)

    const groupStandings = {}
    for (let g = 1; g <= t.groups_count; g++) groupStandings[g] = getGroupStandings(g)

    for (let g = 1; g <= t.groups_count; g++) {
      for (const tp of groupStandings[g].slice(0, t.advance_per_group)) {
        await supabase.from('tournament_players').update({ advanced: true }).eq('id', tp.id)
      }
    }

    // Build seeded list: alternate winners and runners-up across groups
    const advancing = []
    for (let rank = 0; rank < t.advance_per_group; rank++) {
      for (let g = 1; g <= t.groups_count; g++) {
        if (groupStandings[g][rank]) advancing.push(groupStandings[g][rank].player_id)
      }
    }

    const p = nextPow2(total)
    const slots = buildBracketSlots(p, advancing)
    const matches = buildKnockoutMatches(t.id, slots)

    await supabase.from('tournament_matches').insert(matches)
    await supabase.from('tournaments').update({ status: 'knockout' }).eq('id', t.id)
    const updated = { ...t, status: 'knockout' }
    setSelected(updated)
    setTournaments(prev => prev.map(x => x.id === t.id ? updated : x))
    await loadDetail(updated)
    setAdvancing(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div>

  if (selected) {
    const t = selected
    const st = STATUS_T[t.status] || STATUS_T.draft
    const registeredIds = new Set(tPlayers.map(tp => tp.player_id))
    const notRegistered = allPlayers.filter(p => !registeredIds.has(p.id) && (!playerSearch || p.name.includes(playerSearch)))
    const allGroupMatchesDone = tMatches.filter(m => m.phase === 'group').every(m => m.status === 'completed')
    const knockoutMatches = tMatches.filter(m => m.phase === 'knockout')
    const knockoutRounds = [...new Set(knockoutMatches.map(m => m.round))].sort((a, b) => b - a)
    const fmt = t.match_format || 'bo1'
    const isKnockoutOnly = t.mode === 'knockout_only'
    const n = seedOrder.length
    const p = nextPow2(n)
    const byes = p - n

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <button onClick={() => { setSelected(null); setTPlayers([]); setTMatches([]) }} style={{ ...ob, padding: '8px 14px' }}>← חזרה</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#111' }}>{t.name}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {t.start_date && <span style={{ fontSize: '12px', color: '#aaa' }}>{new Date(t.start_date).toLocaleDateString('he-IL')}</span>}
              <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>{fmt === 'bo3' ? 'הטוב מ-3 סטים' : 'סט אחד'}</span>
              <span style={{ fontSize: '12px', color: '#888' }}>{isKnockoutOnly ? 'נוק-אאוט בלבד' : 'בתים + נוק-אאוט'}</span>
            </div>
          </div>
          <div style={{ background: `${st.color}18`, color: st.color, borderRadius: '20px', padding: '5px 16px', fontSize: '13px', fontWeight: '700' }}>{st.label}</div>
          <button onClick={() => deleteTournament(t)} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>מחק</button>
        </div>

        {loadingDetail ? <div style={{ textAlign: 'center', padding: '40px', color: '#bbb' }}>טוען...</div> : (
          <div>
            {/* ── Draft ── */}
            {t.status === 'draft' && (
              <div>
                {/* Add player search */}
                <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '10px' }}>הוסף שחקנים</div>
                  <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder="חיפוש שם..." style={{ ...is, marginBottom: '10px' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {notRegistered.map(p => (
                      <button key={p.id} onClick={() => addPlayer(p.id)} style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
                        {p.name} {p.birth_year && <span style={{ color: '#bbb', fontSize: '11px' }}>{p.birth_year}</span>}
                      </button>
                    ))}
                    {notRegistered.length === 0 && <span style={{ color: '#ccc', fontSize: '13px' }}>כל השחקנים רשומים</span>}
                  </div>
                </div>

                {/* Seed ordering list */}
                {seedOrder.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        סדר הגרלה — {n} שחקנים
                      </div>
                      {isKnockoutOnly && byes > 0 && (
                        <div style={{ fontSize: '12px', color: '#d97706', background: '#fef3c7', borderRadius: '8px', padding: '4px 10px' }}>
                          {byes} bye — bracket של {p}
                        </div>
                      )}
                    </div>
                    {isKnockoutOnly && (
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', background: '#f9f9f9', borderRadius: '8px', padding: '8px 12px' }}>
                        גרר בחצים לסידור ידני · Seed 1 ו-2 יהיו בצדדים מנוגדים · {byes > 0 ? `${byes} השחקנים האחרונים ברשימה יקבלו bye` : 'ללא bye'}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {seedOrder.map((playerId, idx) => {
                        const playerName = pName(playerId)
                        const isByePlayer = isKnockoutOnly && idx >= n - byes
                        return (
                          <div key={playerId} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: isByePlayer ? '#fffbeb' : idx < 4 ? '#f0f7f0' : '#fafafa',
                            border: `1px solid ${isByePlayer ? '#fde68a' : idx < 4 ? '#c5ddc5' : '#eee'}`,
                            borderRadius: '10px', padding: '8px 12px',
                          }}>
                            <div style={{
                              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                              background: idx === 0 ? '#1a472a' : idx === 1 ? '#2d6a4f' : idx < 4 ? '#f0f7f0' : '#f0f0f0',
                              color: idx < 2 ? '#fff' : '#888',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: '700',
                            }}>{idx + 1}</div>
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: idx < 2 ? '700' : '400', color: '#222' }}>{playerName}</span>
                            {isByePlayer && <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '600' }}>BYE</span>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <button onClick={() => moveSeed(playerId, -1)} disabled={idx === 0}
                                style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '4px', width: '22px', height: '18px', cursor: 'pointer', fontSize: '10px', lineHeight: 1, color: idx === 0 ? '#ddd' : '#555', padding: 0 }}>▲</button>
                              <button onClick={() => moveSeed(playerId, 1)} disabled={idx === seedOrder.length - 1}
                                style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: '4px', width: '22px', height: '18px', cursor: 'pointer', fontSize: '10px', lineHeight: 1, color: idx === seedOrder.length - 1 ? '#ddd' : '#555', padding: 0 }}>▼</button>
                            </div>
                            <button onClick={() => removePlayer(tPlayers.find(tp => tp.player_id === playerId)?.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '14px', padding: '0 2px' }}>✕</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Start buttons */}
                {isKnockoutOnly ? (
                  n >= 2 ? (
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={startKnockoutOnly} disabled={drawing}
                        style={{ ...pb, padding: '12px 32px', fontSize: '15px', background: '#7c3aed', boxShadow: '0 4px 14px rgba(124,58,237,0.25)', opacity: drawing ? 0.6 : 1 }}>
                        {drawing ? 'מייצר bracket...' : `🎾 התחל נוק-אאוט (${n} שחקנים${byes > 0 ? ` + ${byes} bye` : ''})`}
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px' }}>יש להוסיף לפחות 2 שחקנים</div>
                  )
                ) : (
                  n >= 4 ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
                        {n} שחקנים · {t.groups_count} בתים · ~{Math.floor(n / t.groups_count)} לבית
                      </div>
                      <button onClick={drawGroups} disabled={drawing}
                        style={{ ...pb, padding: '12px 32px', fontSize: '15px', boxShadow: '0 4px 14px rgba(26,71,42,0.25)', opacity: drawing ? 0.6 : 1 }}>
                        {drawing ? 'מגריל...' : '🎲 הגרל בתים והתחל'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px' }}>יש להוסיף לפחות 4 שחקנים</div>
                  )
                )}
              </div>
            )}

            {/* ── Groups ── */}
            {!isKnockoutOnly && (t.status === 'groups' || t.status === 'knockout' || t.status === 'completed') && (
              <div>
                <div style={{ fontWeight: '700', fontSize: '17px', color: '#333', marginBottom: '18px' }}>שלב הבתים</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  {Array.from({ length: t.groups_count }, (_, i) => i + 1).map(g => {
                    const standings = getGroupStandings(g)
                    const groupMatches = tMatches.filter(m => m.phase === 'group' && m.group_num === g)
                    return (
                      <div key={g} style={{ background: '#fff', border: '1px solid #e8ece8', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ background: '#1a472a', color: '#fff', padding: '10px 16px', fontWeight: '700', fontSize: '14px' }}>בית {GROUP_NAMES[g - 1]}</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f9f9f9' }}>
                              {['שחקן', 'מ׳', 'נ׳', 'נק׳'].map((h, i) => (
                                <th key={h} style={{ padding: '8px ' + (i === 0 ? '14px' : '10px'), textAlign: i === 0 ? 'right' : 'center', fontWeight: '600', color: '#888', borderBottom: '1px solid #eee' }}>{h}</th>
                              ))}
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
                                    <button onClick={() => { setEditingMatchId(m.id); setResultScore(''); setResultWinner('') }}
                                      style={{ background: '#f0f7f0', color: '#1a472a', border: '1px solid #c5ddc5', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                      הזן תוצאה
                                    </button>
                                  )}
                                  {m.status === 'completed' && (
                                    <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>✓</span>
                                  )}
                                </div>
                                {isEditing && <ResultForm m={m} fmt={fmt} resultScore={resultScore} setResultScore={setResultScore} resultWinner={resultWinner} setResultWinner={setResultWinner} savingResult={savingResult} saveResult={saveResult} cancel={() => setEditingMatchId(null)} pName={pName} is={is} ob={ob} pb={pb} ls={ls} />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {t.status === 'groups' && allGroupMatchesDone && (
                  <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid #e8ece8' }}>
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
                      כל משחקי הבתים הושלמו · {t.groups_count * t.advance_per_group} שחקנים יתקדמו לנוק-אאוט
                    </div>
                    <button onClick={advanceToKnockout} disabled={advancing}
                      style={{ ...pb, padding: '12px 32px', fontSize: '15px', background: '#7c3aed', boxShadow: '0 4px 14px rgba(124,58,237,0.3)', opacity: advancing ? 0.6 : 1 }}>
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

            {/* ── Knockout ── */}
            {(t.status === 'knockout' || t.status === 'completed') && knockoutMatches.length > 0 && (
              <div style={{ marginTop: isKnockoutOnly ? 0 : '32px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: '#333', marginBottom: '18px' }}>שלב נוק-אאוט</div>

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

                <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '20px', minWidth: 'fit-content' }}>
                    {knockoutRounds.map(round => (
                      <div key={round} style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{
                          textAlign: 'center', fontSize: '12px', fontWeight: '700', color: round === 1 ? '#7c3aed' : '#888',
                          letterSpacing: '1px', marginBottom: '12px', padding: '6px',
                          background: round === 1 ? '#f5f3ff' : 'transparent', borderRadius: '8px',
                        }}>
                          {ROUND_NAMES[round] || `סיבוב ${round}`}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {knockoutMatches.filter(m => m.round === round).map(m => {
                            const isEditing = editingMatchId === m.id
                            const isP1Win = m.winner_id === m.player1_id
                            const isP2Win = m.winner_id === m.player2_id
                            const isBye = m.status === 'completed' && (!m.player1_id || !m.player2_id)
                            const canEnter = t.status === 'knockout' && m.status === 'pending' && m.player1_id && m.player2_id
                            return (
                              <div key={m.id} style={{ background: '#fff', border: `1px solid ${round === 1 ? '#c4b5fd' : '#e8ece8'}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', opacity: isBye ? 0.7 : 1 }}>
                                <div style={{ padding: '10px 14px', background: isP1Win ? '#dcfce7' : '#fafafa', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: isP1Win ? '700' : '400', color: isP1Win ? '#16a34a' : m.player1_id ? '#111' : '#ccc' }}>
                                    {m.player1_id ? pName(m.player1_id) : 'ממתין...'}
                                  </span>
                                  {isP1Win && <span>{isBye ? '→' : '🏆'}</span>}
                                </div>
                                <div style={{ padding: '10px 14px', background: isP2Win ? '#dcfce7' : '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: isP2Win ? '700' : '400', color: isP2Win ? '#16a34a' : m.player2_id ? '#111' : '#ccc' }}>
                                    {m.player2_id ? pName(m.player2_id) : isBye ? 'BYE' : 'ממתין...'}
                                  </span>
                                  {isP2Win && <span>{isBye ? '→' : '🏆'}</span>}
                                </div>
                                {m.score && <div style={{ padding: '5px 14px', fontSize: '11px', color: '#888', background: '#f9f9f9', borderTop: '1px solid #eee', textAlign: 'center' }}>{m.score}</div>}
                                {isBye && <div style={{ padding: '4px 14px', fontSize: '11px', color: '#d97706', background: '#fffbeb', borderTop: '1px solid #fde68a', textAlign: 'center' }}>עבר אוטומטית</div>}
                                {canEnter && !isEditing && (
                                  <button onClick={() => { setEditingMatchId(m.id); setResultScore(''); setResultWinner('') }}
                                    style={{ width: '100%', background: '#fef3c7', color: '#d97706', border: 'none', borderTop: '1px solid #fde68a', padding: '7px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                                    ⏳ הזן תוצאה
                                  </button>
                                )}
                                {isEditing && (
                                  <div style={{ padding: '10px 12px', background: '#f9f9f9', borderTop: '1px solid #eee' }}>
                                    <ResultForm m={m} fmt={fmt} resultScore={resultScore} setResultScore={setResultScore} resultWinner={resultWinner} setResultWinner={setResultWinner} savingResult={savingResult} saveResult={saveResult} cancel={() => setEditingMatchId(null)} pName={pName} is={is} ob={ob} pb={pb} ls={ls} compact />
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

  // ── Tournament list ──────────────────────────────────────────────────────────
  const totalAdvancing = parseInt(createForm.groups_count) * parseInt(createForm.advance_per_group)
  const advPow2 = nextPow2(totalAdvancing)
  const advByes = advPow2 - totalAdvancing

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
            <div>
              <label style={ls}>פורמט משחק</label>
              <select value={createForm.match_format} onChange={e => setCreateForm(f => ({ ...f, match_format: e.target.value }))} style={is}>
                <option value="bo1">סט אחד</option>
                <option value="bo3">הטוב מ-3 סטים</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={ls}>מבנה תחרות</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[['groups_knockout', 'בתים + נוק-אאוט'], ['knockout_only', 'נוק-אאוט בלבד']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setCreateForm(f => ({ ...f, mode: val }))} style={{
                    flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', border: '2px solid',
                    borderColor: createForm.mode === val ? '#1a472a' : '#e0e7e0',
                    background: createForm.mode === val ? '#f0f7f0' : '#fff',
                    color: createForm.mode === val ? '#1a472a' : '#888',
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
            {createForm.mode === 'groups_knockout' && (
              <>
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
                  {totalAdvancing} שחקנים יתקדמו לנוק-אאוט
                  {advByes > 0 && <span style={{ color: '#d97706', marginRight: '8px', fontWeight: '600' }}>· {advByes} bye אוטומטי (bracket של {advPow2})</span>}
                </div>
              </>
            )}
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
                    {t.mode === 'knockout_only' ? 'נוק-אאוט בלבד' : `${t.groups_count} בתים · ${t.advance_per_group} מתקדמים`}
                    {' · '}{t.match_format === 'bo3' ? 'הטוב מ-3' : 'סט אחד'}
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

function ResultForm({ m, fmt, resultScore, setResultScore, resultWinner, setResultWinner, savingResult, saveResult, cancel, pName, is, ob, pb, ls, compact }) {
  return (
    <div style={{ marginTop: compact ? 0 : '6px', padding: compact ? 0 : '12px', background: compact ? 'transparent' : '#f9f9f9', borderRadius: compact ? 0 : '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div>
          <label style={{ ...ls, fontSize: '11px' }}>תוצאה {fmt === 'bo3' ? '(עד 3 סטים)' : '(סט)'}</label>
          <input value={resultScore} onChange={e => setResultScore(e.target.value)}
            placeholder={fmt === 'bo3' ? '6-4, 3-6, 7-5' : '6-4'}
            style={{ ...is, fontSize: '12px', padding: '7px 10px' }} />
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
        <button onClick={cancel} style={{ ...ob, padding: '6px 12px', fontSize: '12px' }}>ביטול</button>
        <button onClick={saveResult} disabled={!resultWinner || savingResult}
          style={{ ...pb, padding: '6px 14px', fontSize: '12px', opacity: (!resultWinner || savingResult) ? 0.6 : 1 }}>
          {savingResult ? '...' : 'שמור'}
        </button>
      </div>
    </div>
  )
}
