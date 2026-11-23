import { useState } from 'react'
import JourneyBar from '../components/JourneyBar'
import { Chip, Icon, Monogram, PageHead, Radar, Ring, Tile } from '../components/ui'
import { PROFILE } from '../data/mock'
import { useApp } from '../state'

const FILTERS = [['region', ['서울', '경기', '부산']], ['career', ['신입', '경력 1~3년']], ['size', ['대기업', '중견', '공공기관', '스타트업']]]
const SORTS = [['fit', '적합도순'], ['deadline', '마감임박순'], ['company', '기업명순']]

export default function Match() {
  const { fitOf, target, setTargetId, scraps, toggleScrap, cutoff, jobs } = useApp()
  const [f, setF] = useState({ q: '', region: '', career: '', size: '' })
  const [sort, setSort] = useState('fit')
  const list = jobs.filter((j) =>
    (!f.q || (j.title + j.company + j.skills.join()).toLowerCase().includes(f.q.toLowerCase())) && FILTERS.every(([k]) => !f[k] || j[k] === f[k]))
    .sort((a, b) => (sort === 'fit' ? fitOf(b) - fitOf(a) : sort === 'deadline' ? a.deadline.localeCompare(b.deadline) : a.company.localeCompare(b.company)))

  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead step="Step 01 · Match" title="공고 매칭" desc={`카드를 누르면 목표 공고로 설정돼요. 합격선은 ${cutoff}점입니다.`}
        aside={<input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="직무 · 회사 · 역량 검색" aria-label="검색" className="h-12 w-full rounded-full bg-white px-5 text-sm outline-none ring-1 ring-line focus:ring-2 focus:ring-navy sm:w-80" />} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, opts]) => ['', ...opts].map((o) => (
          <button key={k + o} onClick={() => setF({ ...f, [k]: o })} className={`h-9 rounded-full px-4 text-xs font-semibold transition ${f[k] === o ? 'bg-navy text-white' : 'bg-white ring-1 ring-line hover:ring-navy'} ${o === '' ? 'hidden' : ''}`}>{o}</button>
        )))}
        {FILTERS.some(([k]) => f[k]) && <button onClick={() => setF({ ...f, region: '', career: '', size: '' })} className="h-9 rounded-full px-3 text-xs font-semibold text-tie">초기화</button>}
        <div className="ml-auto flex gap-1 rounded-full bg-white p-1 ring-1 ring-line">
          {SORTS.map(([k, l]) => <button key={k} onClick={() => setSort(k)} className={`h-8 rounded-full px-3 text-xs font-semibold ${sort === k ? 'bg-bg text-navy' : 'text-sub'}`}>{l}</button>)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.length === 0 && <Tile className="p-10 text-center text-sm text-sub sm:col-span-2 xl:col-span-3">조건에 맞는 공고가 없습니다.</Tile>}
          {list.map((j) => {
            const fit = fitOf(j), sel = j.id === target.id
            return (
              <article key={j.id} onClick={() => setTargetId(j.id)} className={`tile group cursor-pointer p-5 transition hover:-translate-y-1 ${sel ? 'ring-2 ring-navy' : ''}`}>
                <div className="flex items-start justify-between">
                  <Monogram name={j.company} seed={j.id} />
                  <button onClick={(e) => { e.stopPropagation(); toggleScrap(j.id) }} aria-label="스크랩" className="grid h-10 w-10 place-items-center rounded-full bg-bg hover:bg-sky">{Icon.heart(scraps.includes(j.id))}</button>
                </div>
                <div className="mt-4 text-xs font-semibold text-sub">{j.company} · {j.region}</div>
                <div className="mt-1 min-h-[48px] text-lg font-extrabold leading-snug">{j.title}</div>
                <div className="mt-3 flex flex-wrap gap-1">{j.skills.slice(0, 3).map((s) => <Chip key={s} tone={PROFILE.skills.includes(s) ? 'mint' : 'line'}>{s}</Chip>)}</div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <div><div className="num text-2xl font-bold">{fit}%</div><div className={`text-[11px] font-semibold ${fit >= cutoff ? 'text-[#0b8a68]' : 'text-tie'}`}>{fit >= cutoff ? '합격선 도달' : `${cutoff - fit}점 부족`}</div></div>
                  {sel ? <Chip tone="navy">목표 공고</Chip> : <span className="text-xs text-sub">마감 {j.deadline}</span>}
                </div>
              </article>
            )
          })}
        </section>
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Tile className="p-6">
            <div className="flex items-center gap-3"><Monogram name={target.company} seed={target.id} /><div><div className="text-xs text-sub">목표 공고</div><div className="font-extrabold">{target.company}</div></div></div>
            <div className="mt-1 text-sm text-sub">{target.title}</div>
            <Radar data={target.radar} />
            <div className="flex items-center gap-4 rounded-3xl bg-bg p-4">
              <Ring value={fitOf(target)} size={72} stroke={11} label="적합도" />
              <div className="text-sm"><div className="text-xs text-sub">인재상</div><b>{target.values.join(' · ')}</b></div>
            </div>
          </Tile>
        </aside>
      </div>
    </div>
  )
}
