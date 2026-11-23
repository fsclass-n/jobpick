import { Link } from 'react-router-dom'
import { JourneyBar } from '../components/Layout'
import { Line, PageHead, Panel } from '../components/ui'
import { MY_TREND, PROFILE } from '../data/mock'
import { useApp } from '../state'

export default function Journey() {
  const { pick, match, coverage, rehearse, target, gaps, scraps } = useApp()
  const trend = [...MY_TREND, pick]
  const parts = [['서류 적합도', '50%', match, '/match'], ['역량 커버리지', '30%', coverage, '/gap'], ['면접 준비도', '20%', rehearse, '/rehearse']]
  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead no="05" en="My Journey" ko={`${PROFILE.name}님의 Pick 여정`} desc={`목표 공고 ${target.company} · ${target.title} · 스크랩 ${scraps.length}건`} />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel className="p-6 lg:col-span-1">
          <div className="eyebrow mb-4">Score breakdown</div>
          {parts.map(([l, w, v, to]) => (
            <Link key={l} to={to} className="mb-5 block group">
              <div className="mb-1 flex justify-between text-sm"><span className="group-hover:underline">{l} <span className="text-mute">({w})</span></span><b className="font-serif text-lg">{v}</b></div>
              <div className="h-2 bg-line"><div className="h-2 bg-ink" style={{ width: `${v}%`, transition: 'width .6s' }} /></div>
            </Link>
          ))}
        </Panel>
        <Panel className="p-6 lg:col-span-2">
          <div className="eyebrow mb-2">Trend</div>
          <Line data={trend} />
          <div className="text-[11px] text-mute">최근 {trend.length}회 (샘플 기록 + 현재 세션)</div>
        </Panel>
        <Panel className="p-6 lg:col-span-3">
          <div className="eyebrow mb-4">Next actions</div>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              gaps[0] && ['가장 큰 갭 보완', `${gaps[0][0]} 역량을 채우세요.`, '/gap'],
              ['자소서 제안 수락', '문항별 AI 제안으로 적합도를 올리세요.', '/rewrite'],
              rehearse === 0 && ['모의면접 시작', '아직 면접 준비도가 0점입니다.', '/rehearse'],
            ].filter(Boolean).map(([t, d, to], k) => (
              <li key={t}><Link to={to} className="block border border-ink p-5 hover:bg-pick">
                <div className="font-serif text-3xl font-black">0{k + 1}</div>
                <div className="mt-2 font-bold">{t}</div><div className="text-sm text-mute">{d}</div>
              </Link></li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  )
}
