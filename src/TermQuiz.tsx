import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import PencilFeedback, { PencilOverlay } from './PencilFeedback'
import { glossaryCategories, glossaryTerms } from './Glossary'
import type { GlossaryTerm } from './Glossary'

type TermQuestion = { term: GlossaryTerm; shownMeaning: string; isTrue: boolean; decoy?: GlossaryTerm }
const QUIZ_LENGTH = 5

function shuffle<T,>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function makeQuestions(categoryId: string): TermQuestion[] {
  const pool = glossaryTerms.filter(item => item.meaning.trim() && (categoryId === 'all' || item.categoryId === categoryId))
  const targets = shuffle(pool).slice(0, QUIZ_LENGTH)
  const truthPattern = shuffle([true, true, true, false, false])
  return targets.map((term, index) => {
    if (truthPattern[index]) return { term, shownMeaning: term.meaning, isTrue: true }
    const decoys = glossaryTerms.filter(item => item.categoryId !== term.categoryId && item.meaning.trim() && item.meaning !== term.meaning && !item.meaning.includes(term.term))
    const decoy = decoys[Math.floor(Math.random() * decoys.length)]
    return { term, shownMeaning: decoy.meaning, isTrue: false, decoy }
  })
}

export default function TermQuiz({ categoryId, onExit }: { categoryId: string; onExit: () => void }) {
  const [questions, setQuestions] = useState(() => makeQuestions(categoryId))
  const [answers, setAnswers] = useState<boolean[]>([])
  const [choice, setChoice] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<'question' | 'feedback' | 'result'>('question')
  const index = phase === 'feedback' ? answers.length - 1 : answers.length
  const question = questions[index]
  const correctCount = answers.filter(Boolean).length
  const categoryName = categoryId === 'all' ? '전체 분야' : glossaryCategories.find(category => category.id === categoryId)?.name

  function submit() {
    if (choice === null || !question) return
    setAnswers(current => [...current, choice === question.isTrue])
    setPhase('feedback')
    window.scrollTo(0, 0)
  }

  function next() {
    setChoice(null)
    setPhase(answers.length === questions.length ? 'result' : 'question')
    window.scrollTo(0, 0)
  }

  function retry() {
    setQuestions(makeQuestions(categoryId))
    setAnswers([])
    setChoice(null)
    setPhase('question')
    window.scrollTo(0, 0)
  }

  if (phase === 'result') return <div className="term-quiz-result">
    <div className="result-check"><Check size={32}/></div>
    <p className="term-quiz-kicker">용어 O/X 퀴즈 완료</p>
    <h1>{correctCount === QUIZ_LENGTH ? '용어를 모두 맞혔어요!' : '오늘도 용어를 익혔어요'}</h1>
    <strong>{correctCount * 20}점</strong>
    <p>{QUIZ_LENGTH}문제 중 {correctCount}문제 정답</p>
    <div className="result-dots">{answers.map((correct, answerIndex) => <span key={answerIndex} className={correct ? 'right' : ''}>{correct ? <Check size={19}/> : <span>×</span>}</span>)}</div>
    <button className="primary" onClick={retry}><RotateCcw size={18}/> 다른 용어 5문제 풀기</button>
    <button className="secondary" onClick={onExit}>용어 사전으로 돌아가기</button>
  </div>

  if (!question) return null
  const answeredCorrectly = answers[index]
  return <div className="term-quiz">
    <div className="progress-label"><strong>주식 용어 O/X 퀴즈</strong><span>{index + 1} <em>/ {QUIZ_LENGTH}</em></span></div>
    <div className="progress"><span style={{ width: `${(index + 1) / QUIZ_LENGTH * 100}%` }}/></div>
    {phase === 'question' ? <>
      <div className="term-quiz-meta">{categoryName} · 용어 뜻 맞히기</div>
      <h1 className="term-quiz-title">‘{question.term.term}’의<br/>뜻이 맞을까요?</h1>
      <div className="term-quiz-statement">{question.shownMeaning}</div>
      <div className="term-ox-options" role="group" aria-label="O 또는 X 선택">
        <button className={choice === true ? 'selected' : ''} aria-pressed={choice === true} onClick={() => setChoice(true)}>O <small>맞아요</small></button>
        <button className={choice === false ? 'selected' : ''} aria-pressed={choice === false} onClick={() => setChoice(false)}>X <small>틀려요</small></button>
      </div>
      <p className="term-quiz-help">설명을 읽고 O 또는 X를 골라보세요</p>
      <button className="primary" disabled={choice === null} onClick={submit}>정답 확인</button>
    </> : <>
      <div className={`answer-heading ${answeredCorrectly ? '' : 'incorrect'}`}><PencilFeedback correct={answeredCorrectly}/><h1>{answeredCorrectly ? '정답이에요' : '아쉬워요'}</h1><span className="point-chip">{answeredCorrectly ? '+20점' : '다음에 맞혀요'}</span></div>
      <div className="feedback-detail term-quiz-feedback">
        <PencilOverlay correct={answeredCorrectly}/>
        <h2>‘{question.term.term}’의 뜻이 맞을까요?</h2>
        <div className="term-quiz-statement">{question.shownMeaning}</div>
        <div className="term-quiz-answer">정답은 <strong>{question.isTrue ? 'O' : 'X'}</strong>예요</div>
        <div className="explanation-box"><span>이렇게 이해해요</span><p><strong>{question.term.term}</strong>: {question.term.meaning}</p>{!question.isTrue && question.decoy && <p>문제의 설명은 ‘{question.decoy.term}’의 뜻이에요.</p>}{question.term.description && <p>{question.term.description}</p>}</div>
      </div>
      <button className="primary" onClick={next}>{answers.length === questions.length ? '결과 보기' : '다음 문제'}</button>
    </>}
  </div>
}
