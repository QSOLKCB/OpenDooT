#!/usr/bin/env python3
"""Dependency-free contract tests for the static OpenDooT site."""
from html.parser import HTMLParser
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.scripts = []
        self.styles = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            assert a["id"] not in self.ids, "Duplicate element ID: " + a["id"]
            self.ids.add(a["id"])
        if tag == "script" and "src" in a:
            self.scripts.append(a["src"])
        if tag == "link" and a.get("rel") == "stylesheet":
            self.styles.append(a["href"])
        if tag == "a" and "href" in a:
            self.links.append(a["href"])

html=(ROOT/"index.html").read_text(encoding="utf-8")
css=(ROOT/"styles.css").read_text(encoding="utf-8")
site=(ROOT/"site.js").read_text(encoding="utf-8")
music=(ROOT/"music.js").read_text(encoding="utf-8")
game=(ROOT/"game.js").read_text(encoding="utf-8")
p=Parser()
p.feed(html)
p.close()
required = {
    "theatre","escape","manifesto","notifyButton","quietButton","fireButton",
    "rehireButton","firedScreen","alertFeed","categories","autoInterrupt",
    "approveButton","researchButton","receiptButton","audacity",
    "gameCanvas","gameOverlay","gameStart","coinCount","lifeCount",
    "gameTime","restartGame","muteGame","musicGame","touchPause","gameMessage"
}
assert required <= p.ids, "Missing required element IDs: " + str(required - p.ids)
assert p.scripts == ["site.js","music.js","game.js"], "Unexpected JavaScript dependencies"
assert p.styles == ["styles.css"], "Unexpected CSS dependencies"
assert all((ROOT/f).is_file() for f in p.scripts+p.styles+["favicon.svg"])
assert all(link.startswith(("https://","#","./")) for link in p.links), "Unexpected outgoing link"
for js in (site,music,game):
    for forbidden in ("fetch(", "XMLHttpRequest", "localStorage", "sessionStorage",
                      "document.cookie", "navigator.geolocation", "sendBeacon("):
        assert forbidden not in js, "Privacy boundary violated: " + forbidden
assert 'id="autoInterrupt" type="checkbox"' in html
assert "stopAuto()" in site and "fireButton" in site
assert "DootMusic" in music and "AudioContext" in music
assert "id=\"musicGame\"" in html and "Doooooooot." in html
assert "visibilitychange" in game and "requestAnimationFrame" in game
assert "STEP=1/60" in game and "state.collected>=7" in game
assert 'role="dialog"' in html and 'aria-modal="true"' in html
assert "prefers-reduced-motion" in css
assert not (ROOT/"package.json").exists(), "Unexpected runtime dependencies"
print("OpenDooT static and privacy contract checks: PASS")
