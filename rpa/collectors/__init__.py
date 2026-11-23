from .html_board import collect as collect_html
from .playwright_board import collect as collect_playwright
from .sample import collect as collect_sample
from .worknet import collect as collect_worknet

COLLECTORS = {
    "sample": collect_sample,
    "worknet": collect_worknet,
    "html": collect_html,
    "playwright": collect_playwright,
}
