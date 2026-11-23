import { Link } from 'react-router-dom'
import { JourneyTracker } from '../components/Layout'
import { Card, Line } from '../components/ui'
import { MY_TREND, PROFILE } from '../data/mock'
import { useApp } from '../state'

export default function Journey() {
  const { pick, match, coverage, rehearse, target, gaps } = useApp()
  const trend = [...MY_TREND, pick]
  const parts = [['서류 적합도 (50%)', match, '/match'], ['역량 커버리지 (30%)', coverage, '/gap'], ['면접 준비도 (20%)', rehearse, '/rehearse']]
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JourneyTracker />
      <h1 className="font-display text-2xl font-extrabold">{PROFILE.name}님의 Pick 여정</h1>
      <p className="mb-6 text-sm text-slate-500">목표: {target.company} · {target.title}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">Pick Score 구성</h2>
          {parts.map(([l, v, to]) => (
            <Link key={l} to={to} className="mb-3 block">
              <div className="mb-1 flex justify-between text-sm"><span>{l}</span><b>{v}</b></div>
              <div className="h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-brand" style={{ width: `${v}%`, transition: 'width .6s' }} /></div>
            </Link>
          ))}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">점수 변화 추이</h2>
          <Line data={trend} />
          <div className="text-xs text-slate-400">최근 {trend.length}회 기록 (샘플 데이터 + 현재 세션)</div>
        </Card>
        <Card className="md:col-span-2">
          <h2 className="mb-2 font-bold">다음 추천 행동</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {gaps[0] && <li>가장 큰 갭 <b>{gaps[0][0]}</b>을(를) 보완하세요 → <Link className="text-brand" to="/gap">갭 로드맵</Link></li>}
            <li>자소서 문항 제안을 수락해 적합도를 올리세요 → <Link className="text-brand" to="/rewrite">리라이팅</Link></li>
            {rehearse === 0 && <li>아직 모의면접을 진행하지 않았습니다 → <Link className="text-brand" to="/rehearse">시작하기</Link></li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}
