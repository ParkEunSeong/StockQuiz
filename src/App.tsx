import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, Bookmark, Check, CheckCircle2, ChevronRight, CircleHelp, Home, RotateCcw, TrendingUp, UserRound, X } from 'lucide-react'
import { Screen } from '@apps-in-toss/web-framework'
import rawQuestions from './data/questions.json'
import PencilFeedback, { PencilOverlay } from './PencilFeedback'

type Difficulty = '하' | '중' | '상'
type Question = { id: string; category: string; difficulty: Difficulty; kind: '4지선다' | 'OX'; prompt: string; options: string[]; answer: number; explanation: string; reference: string }
type RecordItem = { attempts: number; lastCorrect: boolean; correctCount: number; lastAt: string }
type Session = { ids: string[]; answers: { id: string; choice: number; correct: boolean }[]; startedAt: number; mode: 'normal' | 'review' }
type Page = 'home' | 'learn' | 'quiz' | 'explanation' | 'result' | 'notebook' | 'my' | 'ranking'
type Store = { records: Record<string, RecordItem>; saved: string[]; sessions: { date: string; correct: number; count: number; seconds: number }[] }

const questions = rawQuestions as Question[]
const byId = new Map(questions.map(q => [q.id, q]))
const categories = [...new Set(questions.map(q => q.category))]
const initialStore: Store = { records: {}, saved: [], sessions: [] }

function readStore(): Store {
  try {
    const parsed = JSON.parse(localStorage.getItem('stock-bite-v2') || '{}')
    return { ...initialStore, ...parsed }
  } catch { return initialStore }
}

function groupOf(category: string) {
  const index = categories.indexOf(category)
  if (index < 7) return '주식 기초'
  if (index < 21) return '기업 분석'
  if (index < 24) return '차트·캔들'
  return '투자 전략'
}

function shuffle<T,>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function App() {
  const [store, setStore] = useState<Store>(readStore)
  const [page, setPage] = useState<Page>('home')
  const [area, setArea] = useState('전체 분야')
  const [category, setCategory] = useState('전체 카테고리')
  const [difficulty, setDifficulty] = useState<Difficulty>('하')
  const [session, setSession] = useState<Session | null>(null)
  const [choice, setChoice] = useState<number | null>(null)
  const [reviewTab, setReviewTab] = useState<'wrong' | 'done' | 'saved'>('wrong')
  const [reviewArea, setReviewArea] = useState('전체')
  const [rankingTab, setRankingTab] = useState<'week' | 'all'>('week')

  const setAndSave = (update: (current: Store) => Store) => {
    setStore(current => {
      const next = update(current)
      localStorage.setItem('stock-bite-v2', JSON.stringify(next))
      return next
    })
  }

  const today = new Date().toLocaleDateString('en-CA')
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  const weekly = store.sessions.filter(s => new Date(s.date).getTime() >= weekStart.getTime())
  const weekCorrect = weekly.reduce((sum, s) => sum + s.correct, 0)
  const weekCount = weekly.reduce((sum, s) => sum + s.count, 0)
  const allCount = Object.keys(store.records).length
  const allCorrect = Object.values(store.records).filter(r => r.lastCorrect).length
  const wrongIds = Object.entries(store.records).filter(([, r]) => !r.lastCorrect).map(([id]) => id)
  const doneIds = Object.entries(store.records).filter(([, r]) => r.lastCorrect && r.attempts > 1).map(([id]) => id)
  const availableCategories = categories.filter(c => area === '전체 분야' || groupOf(c) === area)
  const activeQuestion = session ? byId.get(session.ids[session.answers.length]) : undefined
  const lastAnswer = session?.answers[session.answers.length - 1]
  const explainedQuestion = lastAnswer ? byId.get(lastAnswer.id) : undefined

  function start(mode: 'normal' | 'review' = 'normal', forced?: string[]) {
    let pool = mode === 'review' ? (forced || wrongIds).map(id => byId.get(id)).filter(Boolean) as Question[] : questions.filter(q =>
      q.difficulty === difficulty &&
      (area === '전체 분야' || groupOf(q.category) === area) &&
      (category === '전체 카테고리' || q.category === category)
    )
    if (!pool.length) return
    if (mode === 'normal') {
      const unseen = shuffle(pool.filter(q => !store.records[q.id]))
      const seen = shuffle(pool.filter(q => store.records[q.id]))
      pool = [...unseen, ...seen]
    } else pool = shuffle(pool)
    const ids = pool.slice(0, 5).map(q => q.id)
    setSession({ ids, answers: [], startedAt: Date.now(), mode })
    setChoice(null)
    setPage('quiz')
    window.scrollTo(0, 0)
  }

  function submit() {
    if (!session || !activeQuestion || choice === null) return
    const correct = choice === activeQuestion.answer
    const nextAnswers = [...session.answers, { id: activeQuestion.id, choice, correct }]
    setSession({ ...session, answers: nextAnswers })
    setAndSave(current => {
      const old = current.records[activeQuestion.id]
      return { ...current, records: { ...current.records, [activeQuestion.id]: { attempts: (old?.attempts || 0) + 1, correctCount: (old?.correctCount || 0) + Number(correct), lastCorrect: correct, lastAt: new Date().toISOString() } } }
    })
    setPage('explanation')
    window.scrollTo(0, 0)
  }

  function nextQuestion() {
    if (!session) return
    setChoice(null)
    if (session.answers.length < session.ids.length) {
      setPage('quiz')
    } else {
      const correct = session.answers.filter(a => a.correct).length
      const seconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000))
      setAndSave(current => ({ ...current, sessions: [...current.sessions, { date: new Date().toISOString(), correct, count: session.ids.length, seconds }] }))
      setPage('result')
    }
    window.scrollTo(0, 0)
  }

  function toggleSaved(id: string) {
    setAndSave(current => ({ ...current, saved: current.saved.includes(id) ? current.saved.filter(x => x !== id) : [...current.saved, id] }))
  }

  function navigate(next: Page) { setPage(next); window.scrollTo(0, 0) }
  function back() { navigate(page === 'quiz' || page === 'explanation' || page === 'result' ? 'learn' : 'home') }
  function closeApp() { if (import.meta.env.DEV) { navigate('home'); return } void Screen.close().catch(() => navigate('home')) }
  const reviewList = useMemo(() => (reviewTab === 'wrong' ? wrongIds : reviewTab === 'done' ? doneIds : store.saved).filter(id => byId.has(id) && (reviewArea === '전체' || groupOf(byId.get(id)!.category) === reviewArea)), [reviewTab, reviewArea, store.records, store.saved])
  const statsByArea = ['주식 기초', '기업 분석', '차트·캔들', '투자 전략'].map(name => {
    const total = questions.filter(q => groupOf(q.category) === name).length
    const solved = Object.keys(store.records).filter(id => groupOf(byId.get(id)!.category) === name).length
    const correct = Object.keys(store.records).filter(id => groupOf(byId.get(id)!.category) === name && store.records[id].lastCorrect).length
    return { name, total, solved, correct }
  })
  const lastSession = store.sessions.at(-1)

  return <div className={`app-shell ${page === 'learn' ? 'learn-screen' : ''}`}>
    <header className="topbar">
      {page === 'home' || page === 'learn' || page === 'ranking' || page === 'my' ? <div className="brand"><span className="brand-mark"><BarChart3 size={23} strokeWidth={3} /></span><strong>주식 한입</strong></div> : <button className="icon-button" aria-label="뒤로 가기" onClick={back}><ArrowLeft size={26}/></button>}
      <div className="top-actions"><span className="top-dot">•••</span><button className="icon-button close" aria-label="앱 닫기" onClick={closeApp}><X size={25}/></button></div>
    </header>

    <main className={`main ${page === 'quiz' || page === 'explanation' ? 'quiz-main' : ''} ${page === 'learn' ? 'learn-main' : ''}`}>
      {page === 'home' && <>
        <div className="eyebrow">하루 5문제, 차근차근</div>
        <h1>오늘도 한 문제만큼<br/>더 똑똑해져요</h1>
        <section className="challenge-card">
          <div className="small-heading"><CheckCircle2 size={21}/> 오늘의 챌린지 <span className="pill">{store.sessions.some(s => s.date.slice(0,10) === today) ? '완료' : '시작해요'}</span></div>
          <h2>{lastSession ? `${lastSession.count}문제 중 ${lastSession.correct}문제를 맞혔어요` : '오늘의 5문제를 풀어볼까요?'}</h2>
          <p>{lastSession ? `최근 학습 점수 · ${lastSession.correct * 20}점` : '작은 한입이 큰 실력이 돼요'}</p>
          {lastSession && <button className="text-link" onClick={() => navigate('result')}>결과 다시 보기 <ChevronRight size={16}/></button>}
          <button className="primary" onClick={() => start()}>5문제 시작하기</button>
        </section>
        <button className="score-strip" onClick={() => navigate('ranking')}><div><span>이번 주 점수</span><strong>{weekCorrect * 20}점</strong></div><div><span>맞힌 문제</span><strong>{weekCorrect}<small> / {weekCount}</small></strong></div><ChevronRight size={22}/></button>
        <div className="section-title"><h3>이어서 배워요</h3><button onClick={() => navigate('learn')}>전체 보기 <ChevronRight size={16}/></button></div>
        <div className="area-list">{statsByArea.slice(0,3).map((item,i) => <button className="area-row" key={item.name} onClick={() => { setArea(item.name); setCategory('전체 카테고리'); navigate('learn') }}><span className="area-icon">{i===0?<BookOpen size={24}/>:i===1?<BarChart3 size={24}/>:<TrendingUp size={24}/>}</span><span className="area-label"><strong>{item.name}</strong><small>{['주식과 거래의 기본 개념','재무제표부터 기업 가치까지','가격과 거래량 읽기'][i]}</small></span><span className="row-count">{item.solved}</span><ChevronRight size={18}/></button>)}</div>
        {wrongIds.length > 0 && <button className="review-link" onClick={() => { setReviewTab('wrong'); navigate('notebook') }}><RotateCcw size={17}/> 헷갈린 {wrongIds.length}문제, 한 번 더 복습해요 <ChevronRight size={16}/></button>}
      </>}

      {page === 'learn' && <>
        <h1>무엇부터 맞춰볼까요?</h1>
        <h3 className="field-title">학습 분야</h3>
        <div className="field-list">{['전체 분야','주식 기초','기업 분석','차트·캔들','투자 전략'].map((name,i) => <button key={name} className={`field-card ${area===name?'selected':''}`} onClick={() => { setArea(name); setCategory('전체 카테고리') }}><span className="field-icon">{i===0?'◎':i===1?'▤':i===2?'▥':i===3?'▮':'↗'}</span><span><strong>{name}</strong><small>{['40개 주제를 골고루','주식·배당·거래의 기본','재무제표와 기업 가치','시가·종가와 차트 이해','포트폴리오와 투자 방법'][i]}</small></span><span className={`radio ${area===name?'on':''}`}>{area===name&&<Check size={16}/>}</span></button>)}</div>
        <h3 className="field-title">난이도</h3><div className="segmented">{(['하','중','상'] as Difficulty[]).map((level,i)=><button key={level} className={difficulty===level?'active':''} onClick={()=>setDifficulty(level)}>{['기초','중급','고급'][i]}</button>)}</div>
        <h3 className="field-title">세부 주제 <span>선택사항</span></h3><select className="category-select" value={category} onChange={e=>setCategory(e.target.value)}><option>전체 카테고리</option>{availableCategories.map(c=><option key={c}>{c}</option>)}</select>
        <div className="selection-summary">{area} · {difficulty === '하' ? '기초' : difficulty === '중' ? '중급' : '고급'} · 5문제</div>
        <button className="primary" onClick={()=>start()}>5문제 시작하기</button>
      </>}

      {page === 'quiz' && session && activeQuestion && <>
        <div className="progress-label"><strong>{session.mode==='review'?'다시 풀기':'오늘의 챌린지'}</strong><span>{session.answers.length+1} <em>/ {session.ids.length}</em></span></div><div className="progress"><span style={{width:`${(session.answers.length+1)/session.ids.length*100}%`}}/></div>
        <div className="question-meta"><span>{groupOf(activeQuestion.category)} <b>{activeQuestion.difficulty==='하'?'기초':activeQuestion.difficulty==='중'?'중급':'고급'}</b></span><button onClick={()=>toggleSaved(activeQuestion.id)}><Bookmark size={20} fill={store.saved.includes(activeQuestion.id)?'#3182f6':'none'}/> {store.saved.includes(activeQuestion.id)?'저장됨':'문제 저장'}</button></div>
        <h1 className="question-title">{activeQuestion.prompt}</h1><p className="question-hint">{activeQuestion.category} · {activeQuestion.kind==='OX'?'O/X':'4지선다'}</p>
        <div className={`option-list ${activeQuestion.kind==='OX'?'ox-options':''}`}>{activeQuestion.options.map((option,i)=><button key={i} className={`option ${choice===i?'selected':''}`} onClick={()=>setChoice(i)}><span className="option-letter">{activeQuestion.kind==='OX'?option:String.fromCharCode(65+i)}</span><strong>{option}</strong>{choice===i&&<Check size={22}/>}</button>)}</div>
        <div className="bottom-action"><p>답을 고르면 해설을 볼 수 있어요</p><button className="primary" disabled={choice===null} onClick={submit}>정답 확인</button></div>
      </>}

      {page === 'explanation' && session && lastAnswer && explainedQuestion && <>
        <div className="progress-label"><strong>{session.mode==='review'?'다시 풀기':'오늘의 챌린지'}</strong><span>{session.answers.length} <em>/ {session.ids.length}</em></span></div><div className="progress"><span style={{width:`${session.answers.length/session.ids.length*100}%`}}/></div>
        <div className={`answer-heading ${lastAnswer.correct?'':'incorrect'}`}><PencilFeedback correct={lastAnswer.correct}/><h1>{lastAnswer.correct?'정답이에요':'아쉬워요'}</h1><span className="point-chip">{lastAnswer.correct?'+20점':'다음에 맞혀요'}</span></div>
        <p className="answer-subtitle">{lastAnswer.correct?'하나 더 알게 되었어요.':'해설을 읽고 다시 도전해 보세요.'}</p>
        <div className="feedback-detail">
          <PencilOverlay correct={lastAnswer.correct}/>
          <h2 className="explain-question">{explainedQuestion.prompt}</h2>
          <div className="correct-option"><span className="option-letter">{explainedQuestion.kind==='OX'?explainedQuestion.options[explainedQuestion.answer]:String.fromCharCode(65+explainedQuestion.answer)}</span><strong>{explainedQuestion.options[explainedQuestion.answer]}</strong><span>정답</span></div>
          {!lastAnswer.correct&&<p className="your-answer">내가 고른 답: {explainedQuestion.options[lastAnswer.choice]}</p>}
          <div className="explanation-box"><span>이렇게 이해해요</span><p>{explainedQuestion.explanation}</p></div>
        </div>
        <div className="source-box"><CircleHelp size={22}/><p>이해한 내용을 복습할 수 있게 해설을 저장해 보세요.</p><button onClick={()=>toggleSaved(explainedQuestion.id)}><Bookmark size={17} fill={store.saved.includes(explainedQuestion.id)?'#3182f6':'none'}/>{store.saved.includes(explainedQuestion.id)?'저장됨':'해설 저장'}</button></div>
        {explainedQuestion.reference && <a className="reference-link" href={explainedQuestion.reference} target="_blank" rel="noreferrer">참고자료 보기 <ArrowRight size={15}/></a>}
        <button className="primary" onClick={nextQuestion}>{session.answers.length===session.ids.length?'결과 보기':'다음 문제'}</button>
      </>}

      {page === 'result' && <>
        <div className="result-hero"><div className="result-check"><Check size={32}/></div><h1>오늘도 한 걸음<br/>성장했어요</h1><strong>{(session?.answers.filter(a=>a.correct).length ?? lastSession?.correct ?? 0)*20}점</strong><p>{session?.ids.length ?? lastSession?.count ?? 0}문제 중 {session?.answers.filter(a=>a.correct).length ?? lastSession?.correct ?? 0}문제 정답</p><div className="result-dots">{(session?.answers || []).map((a,i)=><span key={i} className={a.correct?'right':''}>{a.correct?<Check size={19}/>:<X size={18}/>}</span>)}</div></div>
        <div className="result-stats"><div><span>맞힌 문제</span><strong>{session?.answers.filter(a=>a.correct).length ?? lastSession?.correct ?? 0} / {session?.ids.length ?? lastSession?.count ?? 0}</strong></div><div><span>학습 시간</span><strong>{Math.floor((lastSession?.seconds || 0)/60)}분 {(lastSession?.seconds || 0)%60}초</strong></div></div>
        <h3 className="field-title">이번 주 기록</h3><div className="result-record"><div><BarChart3 size={20}/><span>학습 점수</span><strong>{weekCorrect*20}점</strong></div><div><UserRound size={20}/><span>맞힌 문제</span><strong>{weekCorrect}문제</strong></div></div>
        <div className="encouragement"><TrendingUp size={18}/> 꾸준히 풀수록 아는 것이 쌓여요.</div>
        {session?.answers.some(a=>!a.correct)&&<button className="primary" onClick={()=>start('review',session.answers.filter(a=>!a.correct).map(a=>a.id))}>틀린 문제 복습하기</button>}
        <button className="secondary" onClick={()=>navigate('home')}>홈으로 가기</button>
      </>}

      {page === 'notebook' && <>
        <h1>헷갈린 문제,<br/>한 번 더</h1><p className="subtitle">다시 풀면서 내 것으로 만들어요.</p>
        <div className="tabs"><button className={reviewTab==='wrong'?'active':''} onClick={()=>setReviewTab('wrong')}>복습 전 {wrongIds.length}</button><button className={reviewTab==='done'?'active':''} onClick={()=>setReviewTab('done')}>완료 {doneIds.length}</button><button className={reviewTab==='saved'?'active':''} onClick={()=>setReviewTab('saved')}>저장 {store.saved.length}</button></div>
        <div className="chip-row">{['전체','주식 기초','기업 분석','차트·캔들','투자 전략'].map(name=><button className={reviewArea===name?'active':''} key={name} onClick={()=>setReviewArea(name)}>{name}</button>)}</div>
        <div className="review-list">{reviewList.length?reviewList.map(id=>{const q=byId.get(id)!;return <button className="review-card" key={id} onClick={()=>start('review',[id])}><small><i className="blue-dot"/> {groupOf(q.category)} · {q.difficulty==='하'?'기초':q.difficulty==='중'?'중급':'고급'} <span>{store.records[id]?.attempts || 0}회 풀이</span></small><strong>{q.prompt}</strong><ChevronRight size={19}/></button>}):<div className="empty-state"><CheckCircle2 size={40}/><strong>{reviewTab==='wrong'?'복습할 문제가 없어요':reviewTab==='done'?'완료한 복습이 없어요':'저장한 문제가 없어요'}</strong><p>문제를 풀면 이곳에서 다시 볼 수 있어요.</p></div>}</div>
        {reviewTab==='wrong'&&reviewList.length>0&&<button className="primary" onClick={()=>start('review',reviewList)}>오답 {Math.min(reviewList.length,5)}문제 복습하기</button>}
      </>}

      {page === 'my' && <>
        <h1>내 학습</h1><div className="profile"><span><UserRound size={32}/></span><div><strong>차근차근 배우는 중</strong><p>한 문제씩, 꾸준히 배우는 중</p></div></div>
        <h3 className="field-title">이번 주 학습</h3><div className="my-stats"><div><span>푼 문제</span><strong>{weekCount}</strong></div><div><span>맞힌 문제</span><strong>{weekCorrect}</strong></div><div><span>정답률</span><strong>{weekCount?Math.round(weekCorrect/weekCount*100):0}%</strong></div></div>
        <button className="weekly-link" onClick={()=>navigate('ranking')}><BarChart3 size={22}/><strong>이번 주 학습 점수</strong><span>{weekCorrect*20}점</span><ChevronRight size={18}/></button>
        <h3 className="field-title">분야별 학습 <small>정답 / 풀이</small></h3><div className="category-stats">{statsByArea.map((item,i)=><div key={item.name}><span className="round-icon">{i===0?<BookOpen size={21}/>:<BarChart3 size={21}/>}</span><span className="stat-label"><strong>{item.name}</strong><small>{item.total}개 문항</small></span><span>{item.correct} / {item.solved}</span></div>)}</div>
        <button className="plain-row" onClick={()=>{setReviewTab('saved');navigate('notebook')}}><Bookmark size={21}/> 저장한 문제 <span>{store.saved.length}</span><ChevronRight size={18}/></button>
        <button className="plain-row" onClick={()=>{setReviewTab('wrong');navigate('notebook')}}><RotateCcw size={21}/> 오답 노트 <span>{wrongIds.length}</span><ChevronRight size={18}/></button>
        <button className="plain-row" onClick={()=>{setReviewTab('done');navigate('notebook')}}><CheckCircle2 size={21}/> 복습 완료 <span>{doneIds.length}</span><ChevronRight size={18}/></button>
        <div className="total-line">전체 {allCount}문제 풀이 · 현재 정답 {allCorrect}문제 · 저장 {store.saved.length}문제</div>
      </>}

      {page === 'ranking' && <>
        <h1>학습 점수</h1><p className="subtitle">한 문제씩 쌓은 실력이 보여요</p><div className="segmented rank-segment"><button className={rankingTab==='week'?'active':''} onClick={()=>setRankingTab('week')}>이번 주</button><button className={rankingTab==='all'?'active':''} onClick={()=>setRankingTab('all')}>전체</button></div>
        <div className="ranking-hero"><span>내 {rankingTab==='week'?'주간':'전체'} 점수</span><strong>{rankingTab==='week'?weekCorrect*20:store.sessions.reduce((n,s)=>n+s.correct*20,0)}점</strong><p>{rankingTab==='week'?weekCorrect:store.sessions.reduce((n,s)=>n+s.correct,0)}문제 정답</p></div>
        <h3 className="field-title">최근 학습 기록</h3>{store.sessions.length?<div className="history-list">{[...store.sessions].reverse().slice(0,10).map((s,i)=><div key={i}><span>{new Date(s.date).toLocaleDateString('ko-KR',{month:'long',day:'numeric'})}</span><strong>{s.correct*20}점</strong><small>{s.correct}/{s.count} 정답</small></div>)}</div>:<div className="empty-state"><BarChart3 size={39}/><strong>아직 기록이 없어요</strong><p>첫 퀴즈를 풀면 점수가 쌓여요.</p></div>}
        <p className="ranking-note">다른 사용자와의 순위는 계정·서버 연동 후 제공할 수 있어요.</p>
      </>}
    </main>

    {(['home','learn','ranking','my','notebook'] as Page[]).includes(page) && <nav className="bottom-nav"><button className={page==='home'?'active':''} onClick={()=>navigate('home')}><Home size={24}/><span>홈</span></button><button className={page==='learn'?'active':''} onClick={()=>navigate('learn')}><BookOpen size={24}/><span>학습</span></button><button className={page==='ranking'?'active':''} onClick={()=>navigate('ranking')}><BarChart3 size={24}/><span>랭킹</span></button><button className={page==='my'||page==='notebook'?'active':''} onClick={()=>navigate('my')}><UserRound size={24}/><span>내 학습</span></button></nav>}
  </div>
}

export default App
