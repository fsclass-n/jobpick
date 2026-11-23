const opt = (arr) => arr.map((o) => <option key={o} value={o}>{o}</option>)

export function JobFilterBar({ f, setF }) {
  const sel = 'rounded-xl border bg-white px-3 py-2 text-sm'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="flex flex-wrap gap-2">
      <input value={f.q} onChange={set('q')} placeholder="직무·회사·역량 검색" className={`${sel} min-w-[180px] flex-1`} aria-label="검색" />
      <select value={f.region} onChange={set('region')} className={sel} aria-label="지역"><option value="">지역 전체</option>{opt(['서울', '경기', '부산'])}</select>
      <select value={f.career} onChange={set('career')} className={sel} aria-label="경력"><option value="">경력 전체</option>{opt(['신입', '경력 1~3년'])}</select>
      <select value={f.size} onChange={set('size')} className={sel} aria-label="기업 규모"><option value="">규모 전체</option>{opt(['대기업', '중견', '공공기관', '스타트업'])}</select>
    </div>
  )
}
