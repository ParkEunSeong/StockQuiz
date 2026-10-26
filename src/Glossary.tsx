import { useMemo, useState } from 'react'
import { BookOpen, ChevronDown, Search, X } from 'lucide-react'
import rawGlossary from './data/stock_terms.ko.min.json'

type GlossaryTerm = {
  id: string
  term: string
  aliases: string[]
  categoryId: string
  meaning: string
  description: string
}

type GlossaryCategory = { id: string; name: string; sortOrder: number }
const glossary = rawGlossary as { categories: GlossaryCategory[]; terms: GlossaryTerm[] }
const categories = [...glossary.categories].sort((a, b) => a.sortOrder - b.sortOrder)
const categoryNames = new Map(categories.map(category => [category.id, category.name]))
const terms = [...glossary.terms].sort((a, b) => a.term.localeCompare(b.term, 'ko'))
const PAGE_SIZE = 40

function normalize(value: string) {
  return value.toLocaleLowerCase('ko').replace(/\s+/g, '')
}

export default function Glossary() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const matches = useMemo(() => {
    const needle = normalize(query.trim())
    return terms.filter(item => {
      if (categoryId !== 'all' && item.categoryId !== categoryId) return false
      if (!needle) return true
      return [item.term, ...item.aliases, item.meaning, item.description, categoryNames.get(item.categoryId) || '']
        .some(value => normalize(value).includes(needle))
    })
  }, [query, categoryId])

  return <div className="glossary">
    <div className="glossary-heading">
      <div className="glossary-emblem"><BookOpen size={23} /></div>
      <div><h1>주식 용어 사전</h1><p>헷갈리는 용어를 바로 찾아보세요</p></div>
    </div>
    <label className="glossary-search">
      <Search size={21} aria-hidden="true" />
      <input type="search" aria-label="주식 용어 검색" placeholder="용어 또는 뜻을 검색해 보세요" value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); setExpandedId(null) }} />
      {query && <button type="button" aria-label="검색어 지우기" onClick={() => { setQuery(''); setVisibleCount(PAGE_SIZE) }}><X size={18}/></button>}
    </label>
    <div className="glossary-filter">
      <label htmlFor="glossary-category">분야</label>
      <select id="glossary-category" value={categoryId} onChange={event => { setCategoryId(event.target.value); setVisibleCount(PAGE_SIZE); setExpandedId(null) }}>
        <option value="all">전체 분야</option>
        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <ChevronDown size={18} aria-hidden="true" />
    </div>
    <div className="glossary-count" role="status">{query || categoryId !== 'all' ? <><strong>{matches.length.toLocaleString('ko-KR')}</strong>개 검색 결과</> : <><strong>{terms.length.toLocaleString('ko-KR')}</strong>개 용어</>}</div>
    {matches.length ? <div className="glossary-list">
      {matches.slice(0, visibleCount).map(item => {
        const expanded = expandedId === item.id
        return <article className={`glossary-card ${expanded ? 'expanded' : ''}`} key={item.id}>
          <button className="glossary-card-button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : item.id)}>
            <span className="glossary-card-content"><small>{categoryNames.get(item.categoryId)}</small><strong>{item.term}</strong><span>{item.meaning}</span></span>
            <ChevronDown size={20} aria-hidden="true" />
          </button>
          {expanded && <div className="glossary-detail">
            {item.aliases.length > 0 && <p><b>다른 이름</b> {item.aliases.join(' · ')}</p>}
            {item.description && <p><b>더 알아보기</b> {item.description}</p>}
          </div>}
        </article>
      })}
      {matches.length > visibleCount && <button className="glossary-more" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>용어 더 보기 <span>({Math.min(visibleCount, matches.length)} / {matches.length})</span></button>}
    </div> : <div className="glossary-empty"><Search size={34}/><strong>검색 결과가 없어요</strong><p>다른 용어나 뜻으로 검색해 보세요.</p></div>}
  </div>
}
