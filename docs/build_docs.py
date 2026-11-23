"""산출물 빌드 스크립트

  python docs/build_docs.py          # PDF + PPTX 모두 생성
  python docs/build_docs.py --pdf    # docs/산출물, docs/프로젝트_진행일지 -> docs/pdf/*.pdf
  python docs/build_docs.py --pptx   # docs/프로젝트_발표자료.pptx

PDF 는 Markdown -> HTML 변환 후 Playwright(Chromium)로 인쇄합니다. (playwright install chromium 필요)
Mermaid 다이어그램은 CDN 스크립트를 불러올 수 있으면 그림으로, 오프라인이면 원본 코드로 출력됩니다.
"""
import argparse
import html
import re
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parent
PDF_DIR = DOCS / "pdf"
SHOTS = DOCS / "assets" / "screenshots"
SOURCES = [DOCS / "산출물", DOCS / "프로젝트_진행일지"]
MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm; }
body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; color: #0f1430; font-size: 10.5pt; line-height: 1.65; word-break: keep-all; }
h1 { font-size: 22pt; border-bottom: 3px solid #5b5bf7; padding-bottom: 8px; margin: 0 0 18px; }
h2 { font-size: 15pt; margin: 26px 0 10px; color: #2a3157; border-left: 5px solid #18c99a; padding-left: 10px; }
h3 { font-size: 12pt; margin: 18px 0 8px; }
table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 9.5pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #cdd1e3; padding: 6px 8px; vertical-align: top; text-align: left; }
th { background: #eef0ff; }
code { background: #f5f6fb; padding: 1px 5px; border-radius: 4px; font-size: 9pt; font-family: Consolas, monospace; }
pre { background: #f5f6fb; border: 1px solid #e7e9f3; border-radius: 8px; padding: 10px 12px; font-size: 8.5pt; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
img { max-width: 100%; border: 1px solid #e7e9f3; border-radius: 6px; page-break-inside: avoid; }
blockquote { border-left: 4px solid #a0a4ff; margin: 10px 0; padding: 4px 12px; color: #5b6385; }
.mermaid { text-align: center; page-break-inside: avoid; margin: 12px 0; }
.cover { font-size: 9pt; color: #7d84a3; margin-bottom: 18px; }
"""


def md_to_html(md_path: Path) -> str:
    import markdown

    text = md_path.read_text(encoding="utf-8")
    blocks: list[str] = []

    def keep_mermaid(m: re.Match) -> str:
        blocks.append(m.group(1))
        return f"\n\nMERMAIDBLOCK{len(blocks) - 1}\n\n"

    text = re.sub(r"```mermaid\n(.*?)```", keep_mermaid, text, flags=re.S)
    body = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])
    for i, block in enumerate(blocks):
        body = body.replace(f"<p>MERMAIDBLOCK{i}</p>", f'<pre class="mermaid">{html.escape(block)}</pre>')
    return (f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="{md_path.parent.as_uri()}/">'
            f"<style>{CSS}</style></head><body><p class='cover'>jobpick · {md_path.parent.name}</p>{body}</body></html>")


def build_pdfs() -> list[Path]:
    from playwright.sync_api import sync_playwright

    PDF_DIR.mkdir(exist_ok=True)
    outputs = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for folder in SOURCES:
            for md in sorted(folder.glob("*.md")):
                tmp = md.with_suffix(".tmp.html")
                tmp.write_text(md_to_html(md), encoding="utf-8")
                try:
                    page.goto(tmp.as_uri(), wait_until="load")
                    if page.locator(".mermaid").count():
                        try:
                            page.add_script_tag(url=MERMAID_CDN)
                            page.evaluate("mermaid.initialize({startOnLoad:false, theme:'neutral'}); mermaid.run()")
                            page.wait_for_timeout(1500)
                        except Exception:  # noqa: BLE001 - 오프라인이면 원본 코드로 출력
                            pass
                    out = PDF_DIR / f"{folder.name}_{md.stem}.pdf"
                    page.pdf(path=str(out), format="A4", print_background=True, display_header_footer=True,
                             header_template="<span></span>",
                             footer_template="<div style='width:100%;font-size:8px;color:#a3a9c4;text-align:center'>"
                                             "jobpick · <span class='pageNumber'></span> / <span class='totalPages'></span></div>",
                             margin={"top": "18mm", "bottom": "20mm", "left": "16mm", "right": "16mm"})
                    outputs.append(out)
                    print("PDF", out.relative_to(DOCS))
                finally:
                    tmp.unlink(missing_ok=True)
        browser.close()
    return outputs


# ---------------------------------------------------------------- PPTX
def build_pptx() -> Path:
    from PIL import Image
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import PP_ALIGN
    from pptx.util import Emu, Inches, Pt

    INK, INK2, PICK, MATCH, SUN, BG, WHITE, LINE = (RGBColor(0x0F, 0x14, 0x30), RGBColor(0x5B, 0x63, 0x85),
                                                     RGBColor(0x5B, 0x5B, 0xF7), RGBColor(0x18, 0xC9, 0x9A),
                                                     RGBColor(0xF5, 0xA5, 0x24), RGBColor(0xF5, 0xF6, 0xFB),
                                                     RGBColor(0xFF, 0xFF, 0xFF), RGBColor(0xE7, 0xE9, 0xF3))
    FONT = "맑은 고딕"
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    W, H = prs.slide_width, prs.slide_height
    blank = prs.slide_layouts[6]
    tmp_imgs: list[Path] = []

    def rect(slide, x, y, w, h, color, shape=MSO_SHAPE.RECTANGLE, line=None):
        s = slide.shapes.add_shape(shape, x, y, w, h)
        s.fill.solid()
        s.fill.fore_color.rgb = color
        if line:
            s.line.color.rgb = line
        else:
            s.line.fill.background()
        s.shadow.inherit = False
        return s

    def text(slide, x, y, w, h, value, size=16, color=INK, bold=False, align=PP_ALIGN.LEFT):
        box = slide.shapes.add_textbox(x, y, w, h)
        tf = box.text_frame
        tf.word_wrap = True
        for i, line in enumerate(value if isinstance(value, list) else [value]):
            para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para.alignment = align
            run = para.add_run()
            run.text = line
            run.font.size, run.font.bold, run.font.color.rgb, run.font.name = Pt(size), bold, color, FONT
            para.space_after = Pt(size * 0.45)
        return box

    def content_slide(title, subtitle=None, num=None):
        slide = prs.slides.add_slide(blank)
        rect(slide, 0, 0, W, H, BG)
        rect(slide, 0, 0, Inches(0.18), H, PICK)
        text(slide, Inches(0.7), Inches(0.45), Inches(11), Inches(0.8), title, 30, INK, True)
        if subtitle:
            text(slide, Inches(0.72), Inches(1.15), Inches(11.5), Inches(0.5), subtitle, 14, INK2)
        if num:
            text(slide, Inches(12.2), Inches(6.9), Inches(1), Inches(0.4), str(num), 11, INK2, align=PP_ALIGN.RIGHT)
        text(slide, Inches(0.7), Inches(6.9), Inches(4), Inches(0.4), "jobpick · Team 박미금 이오리 김모란 홍기흥", 10, INK2)
        return slide

    def card(slide, x, y, w, h, title, body, accent=PICK):
        rect(slide, x, y, w, h, WHITE, MSO_SHAPE.ROUNDED_RECTANGLE, LINE).adjustments[0] = 0.06
        rect(slide, x + Inches(0.25), y + Inches(0.28), Inches(0.5), Inches(0.08), accent)
        text(slide, x + Inches(0.2), y + Inches(0.45), w - Inches(0.4), Inches(0.6), title, 17, INK, True)
        text(slide, x + Inches(0.2), y + Inches(1.05), w - Inches(0.4), h - Inches(1.2), body, 12.5, INK2)

    def table(slide, x, y, w, rows, col_w=None, size=12):
        shape = slide.shapes.add_table(len(rows), len(rows[0]), x, y, w, Inches(0.42) * len(rows))
        tbl = shape.table
        for c, cw in enumerate(col_w or []):
            tbl.columns[c].width = Emu(int(w * cw))
        for r, row in enumerate(rows):
            for c, value in enumerate(row):
                cell = tbl.cell(r, c)
                cell.text = value
                cell.fill.solid()
                cell.fill.fore_color.rgb = INK if r == 0 else (WHITE if r % 2 else BG)
                for para in cell.text_frame.paragraphs:
                    for run in para.runs:
                        run.font.size, run.font.name = Pt(size), FONT
                        run.font.color.rgb = WHITE if r == 0 else INK
                        run.font.bold = r == 0

    def image(slide, name, x, y, w, max_h):
        src = SHOTS / name
        img = Image.open(src)
        ratio = max_h / w
        crop_h = min(img.height, int(img.width * ratio))
        out = DOCS / f".tmp_{name}"
        img.crop((0, 0, img.width, crop_h)).save(out)
        tmp_imgs.append(out)
        pic = slide.shapes.add_picture(str(out), x, y, width=w)
        pic.line.color.rgb = LINE
        return pic

    # 1. 표지
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, W, H, RGBColor(0x09, 0x0C, 0x22))
    rect(s, Inches(-1.5), Inches(-1.5), Inches(5), Inches(5), RGBColor(0x2A, 0x2A, 0x7A), MSO_SHAPE.OVAL)
    rect(s, Inches(10.5), Inches(4.8), Inches(4.5), Inches(4.5), RGBColor(0x0B, 0x4A, 0x44), MSO_SHAPE.OVAL)
    text(s, Inches(0.9), Inches(1.6), Inches(10), Inches(0.5), "생성형 AI & RPA 기반 맞춤형 커리어 컨설팅 시스템", 18, RGBColor(0xC3, 0xC8, 0xFF))
    text(s, Inches(0.9), Inches(2.2), Inches(10), Inches(1.4), "jobpick", 72, WHITE, True)
    text(s, Inches(0.9), Inches(3.7), Inches(11), Inches(1), "공고와 나를 맞대면, 합격이 보입니다", 26, RGBColor(0x3E, 0xE0, 0xB5), True)
    text(s, Inches(0.9), Inches(5.4), Inches(11), Inches(0.5), "Team jobpick  |  박미금(조장) · 이오리 · 김모란 · 홍기흥", 16, WHITE)
    text(s, Inches(0.9), Inches(5.9), Inches(11), Inches(0.5), "jobpick.netlify.app  ·  jobpick.onrender.com  ·  jobpick-api.onrender.com", 13, RGBColor(0xA3, 0xA9, 0xC4))

    # 2. 문제 정의
    s = content_slide("왜 jobpick 인가", "채용 공고와 자기소개서 사이의 간극을 데이터로 메웁니다", 2)
    card(s, Inches(0.7), Inches(1.9), Inches(3.85), Inches(4.6), "문제 1 · 정보 탐색",
         ["여러 채용 플랫폼에 흩어진 공고를", "매번 직접 찾아 읽어야 함", "", "→ RPA가 공고를 자동 수집하고", "자격요건·우대사항·인재상으로 정리"])
    card(s, Inches(4.75), Inches(1.9), Inches(3.85), Inches(4.6), "문제 2 · 막연한 자소서",
         ["내 자소서가 이 공고에 맞는지", "객관적으로 알기 어려움", "", "→ AI가 공고와 자소서를 대조해", "적합도 점수와 근거를 제시"], MATCH)
    card(s, Inches(8.8), Inches(1.9), Inches(3.85), Inches(4.6), "문제 3 · 수정 방향",
         ["무엇을 어떻게 고쳐야 할지", "피드백 받을 곳이 부족함", "", "→ 문항별 수정 가이드라인과", "개선 예시 문장, 점수 변화 추적"], SUN)

    # 3. 핵심 기능
    s = content_slide("핵심 기능 — 네 단계 맞춤 컨설팅", None, 3)
    steps = [("1. 공고 자동 수집", "고용24 Open API · HTML(BS4) · Playwright 수집기, robots.txt 준수, 정형화·upsert"),
             ("2. 자소서 등록", "직접 입력 또는 PDF·이미지 업로드 → OCR → 문항 자동 분리, 버전 관리·복원"),
             ("3. AI 대조 분석", "Gemini + 규칙 기반 엔진, 5개 영역 가중 점수, 장애 시 폴백"),
             ("4. 수정 가이드", "강점·보완점, 문항별 가이드·예시 문장, 다음 행동, 이력 비교")]
    for i, (t, b) in enumerate(steps):
        card(s, Inches(0.7 + i * 3.1), Inches(1.6), Inches(2.9), Inches(4.9), t, [b], [PICK, PICK, MATCH, SUN][i])

    # 4. 아키텍처
    s = content_slide("시스템 아키텍처", "프런트 2종 배포 + FastAPI 백엔드 + RPA + 외부 AI/공공 API", 4)
    boxes = [("사용자 브라우저", 0.7, 3.2, INK2), ("Netlify 데모\nReact · Mock API", 3.2, 1.9, PICK),
             ("Render 프런트\nReact 정적 사이트", 3.2, 4.4, PICK), ("Render API\nFastAPI", 6.2, 4.4, INK),
             ("RPA 수집기\nrpa/", 6.2, 1.9, MATCH), ("TiDB / MySQL\nSQLite", 9.4, 4.4, INK2),
             ("Gemini · OAuth\n고용24 · 채용 게시판", 9.4, 1.9, SUN)]
    for label, x, y, color in boxes:
        b = rect(s, Inches(x), Inches(y), Inches(2.6), Inches(1.3), color, MSO_SHAPE.ROUNDED_RECTANGLE)
        tf = b.text_frame
        tf.text = label
        for para in tf.paragraphs:
            para.alignment = PP_ALIGN.CENTER
            for run in para.runs:
                run.font.size, run.font.bold, run.font.color.rgb, run.font.name = Pt(15), True, WHITE, FONT
    text(s, Inches(0.7), Inches(6.1), Inches(12), Inches(0.6),
         "GitHub Actions: 변경 영역(frontend / backend·rpa / docs/site)만 테스트 후 Netlify · Render Deploy Hook · GitHub Pages 로 개별 배포", 13, INK2)

    # 5. 권한 체계
    s = content_slide("권한별 로그인 시스템", "테스트 관리자와 정식 관리자의 세션 · 권한 범위 · 접근 경로를 완전히 분리", 5)
    table(s, Inches(0.7), Inches(1.9), Inches(11.9), [
        ["구분", "로그인 경로", "접근 범위", "세션"],
        ["일반 사용자", "/login · 소셜(Google/Naver/Kakao)", "공고·자소서·AI 분석·이력", "사용자 토큰 · 12시간"],
        ["테스트 관리자", "/login 테스트 관리자 버튼", "/sandbox/admin — 샌드박스 데이터만", "샌드박스 토큰 · 2시간"],
        ["정식 관리자", "/admin/login (링크 미노출)", "/admin — 운영 데이터 · 접속 로그", "별도 서명키 · 30분 · 탭 종료 시 만료"],
    ], [0.16, 0.3, 0.3, 0.24], 13)
    text(s, Inches(0.7), Inches(4.3), Inches(11.9), Inches(2.4), [
        "• 일반 로그인 API는 정식 관리자 계정을 거부(존재 여부 비노출), 관리자 API는 다른 종류 토큰에 403",
        "• 관리자 라우터 팩토리 하나로 운영/샌드박스 생성 → 인증 의존성과 is_sandbox 범위만 다르게 주입",
        "• 비밀번호 규칙(대·소문자·숫자·특수문자 8자↑), 5회 실패 잠금, TOTP 2단계 인증(선택), 관리자 접속 로그",
    ], 14, INK)

    # 6. AI 엔진
    s = content_slide("AI 분석 엔진", "규칙 기반 엔진이 근거를 만들고, Gemini 가 문맥을 보강합니다", 6)
    table(s, Inches(0.7), Inches(1.9), Inches(6.2), [
        ["평가 영역", "가중치", "기준"],
        ["핵심 키워드 매칭", "35%", "동의어 사전 48개 항목"],
        ["자격요건 충족도", "25%", "요건별 키워드/토큰 일치"],
        ["우대사항 충족도", "10%", "동일"],
        ["인재상 부합도", "10%", "동일"],
        ["문장 완성도", "20%", "분량·정량 성과·STAR·추상어"],
    ], [0.38, 0.18, 0.44], 13)
    card(s, Inches(7.3), Inches(1.9), Inches(5.3), Inches(4.5), "Gemini 연동과 폴백",
         ["• 공고 + 자소서 + 참고 분석을 JSON 응답으로 요청", "• 점수·총평·문항별 가이드를 규칙 결과와 병합",
          "• 키가 없거나 오류 시 규칙 기반 결과로 대체", "  (status=fallback 기록 → 관리자 성공률 통계)",
          "• 등급: 80↑ 높음 / 60↑ 보통 / 40↑ 보완 / 그 외 전면 수정"], MATCH)

    # 7~9. 화면
    s = content_slide("화면 ① 메인 — 매칭 인터랙션", "공고 카드와 자소서 카드가 겹치면 일치 키워드가 연결되고 적합도가 카운트업", 7)
    image(s, "01_main_hero.png", Inches(0.7), Inches(1.75), Inches(11.9), Inches(4.95))
    s = content_slide("화면 ② AI 분석 리포트", "적합도 · 5개 영역 점수 · 키워드 · 강점/보완점 · 문항별 수정 가이드", 8)
    image(s, "07_report.png", Inches(0.7), Inches(1.75), Inches(7.4), Inches(4.95))
    image(s, "06_resume_editor.png", Inches(8.3), Inches(1.75), Inches(4.3), Inches(4.95))
    s = content_slide("화면 ③ 관리자 콘솔 · 모바일", "RPA 수집 현황과 AI 분석 성공률 시각화 / 햄버거 ↔ X, 우→좌 드로어", 9)
    image(s, "09_admin_dashboard.png", Inches(0.7), Inches(1.75), Inches(8.2), Inches(4.95))
    image(s, "13_mobile_home.png", Inches(9.1), Inches(1.75), Inches(1.7), Inches(3.7))
    image(s, "14_mobile_drawer.png", Inches(10.9), Inches(1.75), Inches(1.7), Inches(3.7))

    # 10. 기술 스택
    s = content_slide("기술 스택 · 배포", None, 10)
    table(s, Inches(0.7), Inches(1.6), Inches(11.9), [
        ["영역", "기술"],
        ["Frontend", "React 19, Vite, Tailwind CSS v4, React Router, FontAwesome, Pretendard + IBM Plex Sans KR"],
        ["Backend", "Python 3.11, FastAPI, SQLAlchemy 2, PyJWT, bcrypt, PyOTP, OAuth 2.0"],
        ["Data / RPA", "TiDB · MySQL · SQLite, pandas, NumPy, Requests, BeautifulSoup4, Playwright, pypdf, Tesseract"],
        ["AI", "Google Gemini (google-genai) + 규칙 기반 분석 엔진"],
        ["Infra", "Render(API + Static), Netlify(데모), GitHub Actions, GitHub Pages, Docker Compose"],
    ], [0.18, 0.82], 13)

    # 11. 테스트
    s = content_slide("테스트 결과", None, 11)
    card(s, Inches(0.7), Inches(1.6), Inches(3.85), Inches(4.9), "pytest 19 / 19 통과",
         ["권한·세션 분리, 토큰 범위 9개 조합", "로그인 잠금, 샌드박스 격리", "분석 엔진, OCR, 버전 관리", "RPA 파싱·정형화"], MATCH)
    card(s, Inches(4.75), Inches(1.6), Inches(3.85), Inches(4.9), "E2E 8개 시나리오 통과",
         ["간편 로그인 → 자소서 → 분석 → 리포트", "관리자 권한 변경 · 수집 실행 · 로그", "교차 접근 리디렉션", "전 화면 콘솔 오류 없음"])
    card(s, Inches(8.8), Inches(1.6), Inches(3.85), Inches(4.9), "개선 5건 반영",
         ["로그인 이메일 검증 완화", "scrollTo Promise 이슈 수정", "SANDBOX 띠 중복 제거", "모바일 관리자 표 넘침 수정", "도넛 차트 범례 배치"], SUN)

    # 12. 향후 계획
    s = content_slide("향후 계획", None, 12)
    text(s, Inches(0.7), Inches(1.7), Inches(11.9), Inches(4.5), [
        "1. TiDB Cloud · Gemini · 고용24 · 소셜 로그인 키 발급 후 운영 배포",
        "2. 실제 채용 게시판 수집 대상 선정 (이용약관 · robots.txt 검토)",
        "3. 직무별 합격 자소서 패턴 학습으로 가이드 품질 고도화",
        "4. 공고 마감 알림, 지원 현황 관리 기능",
        "5. 팀 역할 분담 확정 및 운영 모니터링 체계 수립",
    ], 20, INK)
    text(s, Inches(0.7), Inches(5.8), Inches(11.9), Inches(0.8), "감사합니다 · Q&A", 28, PICK, True)

    out = DOCS / "프로젝트_발표자료.pptx"
    prs.save(out)
    for tmp in tmp_imgs:
        tmp.unlink(missing_ok=True)
    print("PPTX", out.relative_to(DOCS))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="jobpick 산출물 빌드")
    parser.add_argument("--pdf", action="store_true")
    parser.add_argument("--pptx", action="store_true")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    both = not (args.pdf or args.pptx)
    if args.pdf or both:
        build_pdfs()
    if args.pptx or both:
        build_pptx()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
