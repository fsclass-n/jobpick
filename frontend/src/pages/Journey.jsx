import { Link } from 'react-router-dom'
import JourneyBar from '../components/JourneyBar'
import { Icon, PageHead, Ring, Spark, Tile } from '../components/ui'
import { IMG } from '../data/credits'
import { MY_TREND, PROFILE } from '../data/mock'
import { useApp } from '../state'

export default function Journey() {
  const { pick, match, coverage, rehearse, target, gaps, scraps } = useApp()
  const trend = [...MY_TREND, pick]
  const parts = [['서류 적합도', 50, match, '/match', '#26286a'], ['역량 커버리지', 30, coverage, '/gap', '#19d3a2'], ['면접 준비도', 20, rehearse, '/rehearse', '#ff5a3c']]
  const actions = [
    gaps[0] && ['가장 큰 갭 보완', `${gaps[0][0]} 역량을 채우세요`, '/gap'],
    ['자소서 제안 수락', '문항별 AI 제안으로 적합도 +3점', '/rewrite'],
    rehearse === 0 && ['모의면접 시작', '아직 면접 준비도가 0점이에요', '/rehearse'],
  ].filter(Boolean)
  return (
    <div className="wrap pb-10">
      <JourneyBar />
      <PageHead step="My Journey" title={`${PROFILE.name}님의 Pick 여정`} desc={`목표 공고 ${target.company} · ${target.title} · Pick ${scraps.length}건`} />
      <div className="grid gap-4 lg:grid-cols-12">
        <Tile className="flex flex-col items-center p-8 lg:col-span-4">
          <Ring value={pick} size={180} stroke={8} label="Pick Score" color="#ff5a3c" />
          <ul className="mt-6 w-full space-y-3">
            {parts.map(([l, w, v, to, c]) => (
              <li key={l}><Link to={to} className="group block">
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold group-hover:underline">{l} <span className="text-xs text-sub">{w}%</span></span><b className="num">{v}</b></div>
                <div className="h-2 rounded-full bg-bg"><div className="h-2 rounded-full" style={{ width: `${v}%`, background: c, transition: 'width .6s' }} /></div>
              </Link></li>
            ))}
          </ul>
        </Tile>
        <Tile className="p-6 lg:col-span-8">
          <div className="flex items-center justify-between"><b>점수 변화</b><span className="text-xs text-sub">샘플 기록 + 현재 세션</span></div>
          <Spark data={trend} height={200} />
        </Tile>
        {actions.map(([t, d, to], k) => (
          <Link key={t} to={to} className="tile group flex items-center gap-4 p-5 transition hover:-translate-y-1 lg:col-span-4">
            <span className="num grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky text-lg font-bold text-suit">0{k + 1}</span>
            <span className="flex-1"><b className="block">{t}</b><span className="text-sm text-sub">{d}</span></span>
            <span className="text-sub transition group-hover:translate-x-1">{Icon.arrow('h-5 w-5')}</span>
          </Link>
        ))}
        <div className="relative min-h-[200px] overflow-hidden rounded-[28px] lg:col-span-12">
          <img src={IMG.desk} alt="책상에서 메모하며 일하는 사람들" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/90 to-navy/20" />
          <div className="relative p-8 text-white"><div className="text-2xl font-extrabold">새 공고가 도착하면 덱에 추가돼요</div><Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy">오늘의 덱 넘기기 {Icon.arrow()}</Link></div>
        </div>
      </div>
    </div>
  )
}
