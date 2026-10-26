import { useEffect, useRef, useState } from 'react'
import { Game } from '@apps-in-toss/web-framework'
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db, getFirebaseUid } from './firebase'

type SessionRecord = { date: string; correct: number; count: number; seconds: number }
export type RankEntry = { id: string; nickname: string; points: number; correct: number; rank: number }
type Identity = { uid: string; nickname: string; isTossProfile: boolean }
type RankTab = 'week' | 'all'

function weekKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const number = (type: string) => Number(parts.find(part => part.type === type)?.value)
  const date = new Date(Date.UTC(number('year'), number('month') - 1, number('day')))
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function scoreOf(sessions: SessionRecord[], tab: RankTab) {
  const selected = tab === 'week' ? sessions.filter(session => weekKey(session.date) === weekKey(new Date())) : sessions
  const correct = selected.reduce((sum, session) => sum + session.correct, 0)
  return { points: correct * 20, correct }
}

function rankCollection(tab: RankTab) {
  return tab === 'week' ? collection(db, 'stockQuizWeeklyRanks', weekKey(new Date()), 'users') : collection(db, 'stockQuizAllRanks')
}

async function tossNickname(): Promise<string | null> {
  try {
    if (!Game.getUserProfile.isSupported()) return null
    const profile = await Promise.race([
      Game.getUserProfile(),
      new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 3000)),
    ])
    return profile?.statusCode === 'SUCCESS' ? profile.nickname.trim().slice(0, 24) : null
  } catch {
    return null
  }
}

async function syncScores(identity: Identity, sessions: SessionRecord[]) {
  if (!sessions.length) return
  const week = scoreOf(sessions, 'week')
  const all = scoreOf(sessions, 'all')
  const weeklyRef = doc(rankCollection('week'), identity.uid)
  const allRef = doc(rankCollection('all'), identity.uid)
  await runTransaction(db, async transaction => {
    const [weeklyDoc, allDoc] = await Promise.all([transaction.get(weeklyRef), transaction.get(allRef)])
    const updates = [
      { ref: weeklyRef, old: weeklyDoc.data(), score: week },
      { ref: allRef, old: allDoc.data(), score: all },
    ]
    for (const { ref, old, score } of updates) {
      const points = Math.max(score.points, Number(old?.points || 0))
      const correct = Math.max(score.correct, Number(old?.correct || 0))
      if (!old && points === 0) continue
      if (old?.points === points && old?.correct === correct && old?.nickname === identity.nickname) continue
      transaction.set(ref, { nickname: identity.nickname, points, correct, updatedAt: serverTimestamp() })
    }
  })
}

export function useLeaderboard(sessions: SessionRecord[], tab: RankTab, active: boolean) {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reload, setReload] = useState(0)
  const syncPromise = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [uid, profileName] = await Promise.all([getFirebaseUid(), tossNickname()])
        if (!cancelled) setIdentity({ uid, nickname: profileName || `주식한입 ${uid.slice(0, 5)}`, isTossProfile: Boolean(profileName) })
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [reload])

  useEffect(() => {
    if (!identity) return
    syncPromise.current = syncScores(identity, sessions)
    void syncPromise.current.catch(() => { if (active) setStatus('error') })
  }, [identity, sessions, reload, active])

  useEffect(() => {
    if (!active || !identity) return
    let cancelled = false
    setStatus('loading')
    void (async () => {
      try {
        await syncPromise.current
        const ranks = rankCollection(tab)
        const [top, own] = await Promise.all([
          getDocs(query(ranks, orderBy('points', 'desc'), limit(20))),
          getDoc(doc(ranks, identity.uid)),
        ])
        const list = top.docs.map(snapshot => {
          const data = snapshot.data()
          const points = Number(data.points)
          const firstWithScore = top.docs.findIndex(item => Number(item.data().points) === points)
          return { id: snapshot.id, nickname: String(data.nickname), points, correct: Number(data.correct), rank: firstWithScore + 1 }
        })
        let rank = list.find(item => item.id === identity.uid)?.rank ?? null
        if (rank === null && own.exists()) {
          const count = await getCountFromServer(query(ranks, where('points', '>', Number(own.data().points))))
          rank = count.data().count + 1
        }
        if (!cancelled) {
          setEntries(list)
          setMyRank(rank)
          setMyScore(own.exists() ? Number(own.data().points) : scoreOf(sessions, tab).points)
          setStatus('ready')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [active, identity, tab, reload, sessions])

  return { identity, entries, myRank, myScore, status, refresh: () => setReload(value => value + 1) }
}
