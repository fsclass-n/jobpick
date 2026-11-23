import { useState } from 'react'
import { JourneyBar } from '../components/Layout'
import { Cover, Gauge, Heart, PageHead, Panel, Radar, Tag } from '../components/ui'
import { JOBS } from '../data/mock'
import { useApp } from '../state'

const FILTERS = [['region', '지역', ['서울', '경기', '부산']], ['career', '경력', ['신입', '경력 1~3년']], ['size', '기업 규모', ['대기업', '중견', '공공기관', '스타트업']]]
const SORTS = [['fit', '적합도순'], ['deadline', '마감임박순'], ['company', '기업명순']]

export default function Match() {
  const { fitOf, target, setTargetId, scraps, toggleScrap, cutoff } = useApp()
  const [f, setF] = useState({ q: '', region: '', career: '', size: '' })
  const [sort, setSort] = useState('fit')
  const list = JOBS.filter((j) =>
    (!f.q || (j.title + j.company + j.skills.join()).toLowerCase().includes(f.q.toLowerCase())) &&
    FILTERS.every(([k]) => !f[k] || j[k] === f[k]))
    .sort((a, b) => (sort === 'fit' ? fitOf(b) - fitOf(a) : sort === 'deadline' ? a.deadline.localeCompare(b.deadline) : a.company.localeCompare(b.company)))

  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead no="01" en="Match" ko="공고 매칭" desc={`RPA가 수집한 공고와 내 프로필의 적합도, 그리고 합격선(${cutoff}점)까지의 거리를 확인하세요.`}>
        <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="직무 · 회사 · 역량 검색" aria-label="검색" className="w-full border-b border-ink bg-transparent py-2 outline-none sm:w-72" />
      </PageHead>

      <div className="grid gap-8 pt-8 lg:grid-cols-[200px_1fr_320px]">
        <aside className="space-y-6">
          {FILTERS.map(([k, l, opts]) => (
            <div key={k}>
              <div className="eyebrow mb-2 border-b border-ink pb-2">{l}</div>
              <div className="flex flex-wrap gap-1 lg:flex-col">
                {['', ...opts].map((o) => (
                  <button key={o || 'all'} onClick={() => setF({ ...f, [k]: o })} className={`px-2 py-1 text-left text-sm ${f[k] === o ? 'bg-ink text-paper' : 'hover:bg-line'}`}>{o || '전체'}</button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span><b>{list.length}</b>개의 공고</span>
            <div className="flex gap-3">{SORTS.map(([k, l]) => <button key={k} onClick={() => setSort(k)} className={sort === k ? 'font-bold underline' : 'text-mute'}>{l}</button>)}</div>
          </div>
          {list.length === 0 && <Panel className="p-8 text-center text-sm">조건에 맞는 공고가 없습니다.</Panel>}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 xl:grid-cols-3">
            {list.map((j) => {
              const fit = fitOf(j), sel = j.id === target.id
              return (
                <article key={j.id} className={`group cursor-pointer ${sel ? 'outline outline-2 outline-offset-4 outline-ink' : ''}`} onClick={() => setTargetId(j.id)}>
                  <div className="relative">
                    <Cover seed={j.id} label={j.company[0]}>
                      <div className="absolute left-3 top-3 flex gap-1"><Tag tone="ink">{j.source}</Tag></div>
                      {sel && <div className="absolute bottom-3 left-3"><Tag tone="pick">목표 공고</Tag></div>}
                    </Cover>
                    <button onClick={(e) => { e.stopPropagation(); toggleScrap(j.id) }} aria-label="스크랩" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-paper/90"><Heart on={scraps.includes(j.id)} /></button>
                  </div>
                  <div className="mt-3">
                    <div className="eyebrow text-[10px]">{j.company}</div>
                    <div className="mt-1 text-[15px] font-medium group-hover:underline">{j.title}</div>
                    <div className="mt-1 text-xs text-mute">{j.region} · {j.career} · 마감 {j.deadline}</div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-black">{fit}%</span>
                      <span className={`text-xs font-semibold ${fit >= cutoff ? 'text-ink' : 'text-alert'}`}>{fit >= cutoff ? '합격선 도달' : `거리 ${cutoff - fit}`}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <Panel>
            <div className="eyebrow border-b border-ink bg-ink px-4 py-2 text-[10px] text-paper">Target posting</div>
            <div className="p-5">
              <div className="font-serif text-2xl font-black">{target.company}</div>
              <div className="text-sm text-mute">{target.title}</div>
              <Radar data={target.radar} />
              <div className="flex items-center gap-4 border-t border-line pt-4">
                <Gauge value={fitOf(target)} size={80} label="fit" />
                <div className="text-sm"><div className="eyebrow text-[10px] text-mute">인재상</div>{target.values.join(' · ')}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">{target.skills.map((s) => <Tag key={s}>{s}</Tag>)}</div>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
