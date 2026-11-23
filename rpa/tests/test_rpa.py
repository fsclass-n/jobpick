from rpa.collectors.html_board import parse_list
from rpa.collectors.sample import collect as collect_sample
from rpa.normalizer import normalize, split_sections

HTML = """
<ul class="jobs">
  <li><a href="/jobs/1"><span class="title">데이터 엔지니어</span></a><span class="company">가상회사</span>
      <span class="location">서울 강남구</span></li>
  <li><a href="/jobs/2"><span class="title">React 개발자</span></a><span class="company">가상회사2</span></li>
</ul>
"""


def test_parse_list_extracts_rows():
    rows = parse_list(HTML, {"item": "ul.jobs > li", "fields": {"title": ".title", "company": ".company",
                                                                 "location": ".location", "link": "a@href"}},
                      "https://jobs.example.com/list")
    assert [r["title"] for r in rows] == ["데이터 엔지니어", "React 개발자"]
    assert rows[0]["url"] == "https://jobs.example.com/jobs/1"


def test_split_sections_and_normalize():
    desc = "회사 소개입니다.\n자격요건: Python 개발 경험\n- SQL 활용 능력\n우대사항\n- AWS 경험\n인재상\n- 협업을 중시하는 분"
    sections = split_sections(desc)
    assert sections["requirements"] == ["Python 개발 경험", "SQL 활용 능력"]
    assert sections["preferred"] == ["AWS 경험"]
    job = normalize({"source": "test", "external_id": "1", "company": "가상", "title": "백엔드 개발자",
                     "description": desc}, is_sandbox=True)
    assert job["is_sandbox"] and job["source"] == "sandbox-test"
    assert {"Python", "SQL", "AWS"} <= set(job["keywords"])
    assert job["job_category"] == "백엔드"


def test_sample_collector_filters_keywords():
    all_jobs = collect_sample({"keywords": [], "config": {}})
    react_jobs = collect_sample({"keywords": ["react"], "config": {}})
    assert len(all_jobs) >= 10 and 0 < len(react_jobs) < len(all_jobs)
