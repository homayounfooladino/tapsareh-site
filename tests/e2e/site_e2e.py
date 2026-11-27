"""End-to-end checks of the new page against dev/mock-server.mjs.

usage:
  npm run build
  python3 tests/e2e/site_e2e.py            # starts the mock itself (no-guest, guest, legacy and busy modes)

Checks the routine's conditions that can be checked without Spark:
no visible English letters, disclaimer word for word, Persian digits in date lines,
invite login still works against a server that behaves like today's live one.
"""
from __future__ import annotations

import asyncio
import os
import re
import signal
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import Page, async_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
DISCLAIMER = "تپصره هوش مصنوعی است و ممکن است اشتباه کند."
LATIN = re.compile(r"[A-Za-z]")
LATIN_DIGIT = re.compile(r"[0-9]")
Q = "مهلت تسلیم اظهارنامه‌ی عملکرد شرکت‌ها تا کی است؟"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(("✓ " if ok else "✗ ") + name + (f" — {detail}" if detail and not ok else ""))


def start_mock(port: int, **env: str) -> subprocess.Popen:
    e = dict(os.environ, PORT=str(port), MOCK_FAST="1", **env)
    p = subprocess.Popen(["node", str(ROOT / "dev/mock-server.mjs")], env=e, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    time.sleep(0.8)
    return p


async def visible_text(page: Page) -> str:
    return await page.evaluate("document.body.innerText")


async def no_english(page: Page, where: str) -> None:
    text = await visible_text(page)
    hits = sorted(set(m.group(0) for m in re.finditer(r"[A-Za-z][A-Za-z0-9._-]*", text)))
    check(f"بی متن انگلیسی دیده‌شدنی: {where}", not hits, " ".join(hits[:10]))


async def ask(page: Page, text: str = Q) -> None:
    await page.fill("#q", text)
    await page.keyboard.press("Enter")


async def new_flow(base: str, browser) -> None:
    ctx = await browser.new_context(viewport={"width": 1280, "height": 860})
    page = await ctx.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    await no_english(page, "صفحه‌ی خوش‌آمد")
    check("جمله‌ی هشدار، متن تأییدشده‌ی ۶ آذر", DISCLAIMER in await visible_text(page))

    # Three guest questions fit in the guest budget.
    for i in range(3):
        await ask(page)
        await page.wait_for_selector(f".bot >> nth={i} >> .actions", timeout=15000)
    text = await visible_text(page)
    check("خط تاریخ زیر جواب با رقم فارسی", "منبع ۱: اعتبار از ۱۳۹۴/۰۴/۳۱ تا امروز" in text)
    check("خط اجرای قانون با رقم فارسی", "تاریخ اجرای قانون: از ۱۳۹۵/۰۱/۰۱" in text)
    body_digits = await page.evaluate("Array.from(document.querySelectorAll('.validity')).map(e => e.innerText).join(' ')")
    check("هیچ رقم لاتین در خط‌های تاریخ", not LATIN_DIGIT.search(body_digits), body_digits[:80])
    check("کارت منبع با برچسب وضعیت", await page.locator(".tag.ok").count() > 0 and await page.locator(".tag.bad").count() > 0)
    check("یادداشت «به‌روزرسانی» روی کارت", await page.locator(".update-note b", has_text="به‌روزرسانی").count() > 0)
    check("دکمه‌ی «اشکال دارد» (فقط نشانه، با نام برای صفحه‌خوان)", await page.get_by_role("button", name="اشکال دارد", exact=True).count() == 3)
    await no_english(page, "پس از سه جواب")

    # Feedback «اشکال دارد» with a comment.
    await page.get_by_role("button", name="اشکال دارد", exact=True).first.click()
    await page.locator(".wrongbox textarea").fill("عدد سال درست نیست")
    await page.locator(".wrongbox button", has_text="ثبت").click()
    await expect(page.locator(".thanks").first).to_be_visible()
    check("ثبت «اشکال دارد» با توضیح", True)

    # A guest who starts a new chat still sees the earlier one in the side menu and can reopen it.
    await page.get_by_role("button", name="گفتگوی تازه").first.click()
    await page.wait_for_selector(".welcome")
    await page.wait_for_selector(".history button")
    check("مهمان گفتگوی قبلی را در منوی کناری می‌بیند", await page.locator(".history button").count() == 1)
    check("کادر ورود مهمان کنار فهرست هست", await page.locator(".guest-box.compact").count() == 1)
    await page.locator(".history button").first.click()
    await page.wait_for_selector(".bot >> nth=2 >> .actions", timeout=15000)
    check("گفتگوی قبلی مهمان دوباره باز شد", await page.locator(".bot").count() == 3)

    # Fourth question: guest budget is over → signup opens, the question is kept.
    await ask(page, "پرسش چهارم مهمان")
    dlg = page.get_by_role("dialog", name="ورود با شماره‌ی موبایل")
    await expect(dlg).to_be_visible()
    check("پنجره‌ی ثبت‌نام پس از تمام شدن سهم مهمان", "پرسش‌های رایگان امروز تمام شد" in await dlg.inner_text())
    check("پرسش چهارم روی صفحه نیامد", await page.locator(".u-bubble", has_text="پرسش چهارم مهمان").count() == 0)
    await no_english(page, "پنجره‌ی ثبت‌نام")

    # Pasting +98… leaves only the 9 digits after the fixed «۰۹».
    await page.evaluate(
        """() => { const i = document.querySelector('#m-rest'); const dt = new DataTransfer();
        dt.setData('text', '+98 912 123 4567'); i.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true})); }"""
    )
    check("چسباندن +۹۸ به ۹ رقم یکدست شد", await page.input_value("#m-rest") == "۱۲۱۲۳۴۵۶۷", await page.input_value("#m-rest"))
    await page.fill("#m-rest", "۰۹۱۲۱۲۳۴۵۶۷")
    check("ارقام فارسی با ۰۹ یکدست شد", await page.input_value("#m-rest") == "۱۲۱۲۳۴۵۶۷", await page.input_value("#m-rest"))

    # The rules open over the form; Esc closes only the rules.
    await dlg.get_by_role("button", name="قوانین و مقررات تپصره").click()
    rules = page.get_by_role("dialog", name="قوانین و مقررات تپصره")
    await expect(rules).to_be_visible()
    check("پنج بند قوانین", await rules.locator("li").count() == 5)
    await page.keyboard.press("Escape")
    await expect(rules).to_be_hidden()
    check("بستن قوانین فرم ثبت‌نام را نگه داشت", await page.input_value("#m-rest") == "۱۲۱۲۳۴۵۶۷")

    # Without the tick the code is not requested.
    await dlg.get_by_role("button", name="دریافت کد تأیید").click()
    check("بی تیک قوانین، کد فرستاده نمی‌شود", "قوانین تپصره را تأیید کنید" in await dlg.inner_text())
    await dlg.get_by_role("checkbox").check()
    await page.fill("input[autocomplete=name]", "رضا محمدی")
    await dlg.get_by_role("button", name="دریافت کد تأیید").click()
    code = page.get_by_role("dialog", name="کد تأیید")
    await expect(code).to_be_visible()
    check("شماره در پنجره‌ی کد با رقم فارسی", "۰۹۱۲ ۱۲۳ ۴۵۶۷" in await code.inner_text())
    await no_english(page, "پنجره‌ی کد")
    await code.locator("input").fill("۱۲۳۴۵۶")
    await expect(code).to_be_hidden(timeout=5000)
    await page.wait_for_selector(".u-bubble:has-text('پرسش چهارم مهمان')", timeout=5000)
    await page.wait_for_selector(".bot >> nth=3 >> .actions", timeout=15000)
    check("پرسش نگه‌داشته پس از ورود خودکار فرستاده شد", True)
    side = await page.locator("aside").inner_text()
    check("نام و شماره در منوی کناری", "رضا محمدی" in side and "۰۹۱۲ ۱۲۳ ۴۵۶۷" in side)
    await page.wait_for_selector(".history button")
    n_hist = await page.locator(".history button").count()
    check("گفتگوی مهمان به حساب منتقل شد و در فهرست است", n_hist == 1, f"{n_hist}: " + " | ".join(await page.locator(".history button").all_inner_texts()))

    # New chat, then open the old one again from the list.
    await page.get_by_role("button", name="گفتگوی تازه").first.click()
    await page.wait_for_selector(".welcome")
    await page.locator(".history button").first.click()
    await page.wait_for_selector(".bot >> nth=3 >> .actions")
    check("باز کردن گفتگوی قبلی از فهرست", await page.locator(".u-bubble").count() == 4)
    check("یادداشت گفتگوی طولانی پس از ۴ پرسش", await page.locator(".longnote").count() == 1)

    # Dark mode stays after reload.
    await page.get_by_role("button", name="حالت تیره").click()
    await page.reload()
    check("حالت تیره پس از بارگذاری دوباره می‌ماند", await page.evaluate("document.documentElement.dataset.theme") == "dark")
    await page.wait_for_selector(".u-bubble", timeout=5000)
    check("پیوند مستقیم ?c= گفتگو را باز می‌کند", await page.locator(".u-bubble").count() == 4)
    check("بی خطای صفحه", not errors, "; ".join(errors[:3]))

    # Persian 404.
    await page.goto(base + "nowhere")
    await no_english(page, "صفحه‌ی ۴۰۴")
    await ctx.close()


async def held_flow(base: str, browser) -> None:
    """No guests (the new default): a question asked before sign-in waits on the page; nothing is sent until sign-in."""
    ctx = await browser.new_context(viewport={"width": 1280, "height": 860})
    page = await ctx.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    sent: list[str] = []
    page.on("request", lambda r: sent.append(r.url) if "/api/chat" in r.url else None)
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    side = page.locator("aside")
    check("بی مهمان: منوی کناری ورود با موبایل و کد دعوت را پیشنهاد می‌کند",
          await side.get_by_text("ورود با شماره‌ی موبایل").count() == 1 and await side.get_by_text("کد دعوت").count() >= 1)

    t0 = time.monotonic()
    await ask(page)
    await page.wait_for_selector(".u-bubble")
    check("پرسش فوراً روی صفحه آمد و کارت انتظار دیده می‌شود", await page.locator(".wait").count() == 1)
    dlg = page.get_by_role("dialog", name="ورود با شماره‌ی موبایل")
    await expect(dlg).to_be_visible(timeout=10000)
    dt = time.monotonic() - t0
    check("پنجره‌ی ورود پس از چند ثانیه باز شد", 2.5 <= dt <= 7, f"{dt:.1f} ثانیه")
    check("متن پنجره: «سؤالتان ثبت شد»", "سؤالتان ثبت شد" in await dlg.inner_text())
    check("پیش از ورود هیچ پرسشی به سرور نرفت", not sent, str(sent))
    await no_english(page, "پنجره‌ی ورود برای پرسش نگه‌داشته")
    await page.keyboard.press("Escape")
    await expect(dlg).to_be_hidden()
    held = page.locator(".held")
    check("پس از بستن پنجره، کارت «سؤالتان ثبت شد» با دو دکمه می‌ماند",
          await held.count() == 1 and await held.locator("button").count() == 2 and "سؤالتان ثبت شد" in await held.inner_text())

    # A second question while one waits takes its place.
    await ask(page, "پرسش دوم پیش از ورود")
    await expect(dlg).to_be_visible(timeout=10000)
    await page.keyboard.press("Escape")
    bubbles = await page.locator(".u-bubble").all_inner_texts()
    check("پرسش تازه جای پرسش منتظر را گرفت", bubbles == ["پرسش دوم پیش از ورود"], str(bubbles))

    await held.get_by_role("button", name="کد دعوت دارم").click()
    inv = page.get_by_role("dialog", name="ورود با کد دعوت")
    await expect(inv).to_be_visible()
    check("پنجره‌ی کد دعوت هم از پرسش ثبت‌شده می‌گوید", "سؤالتان ثبت شد" in await inv.inner_text())
    await page.keyboard.press("Escape")
    await expect(inv).to_be_hidden()

    # Sign in by SMS from the card: the question is sent once, then answered here.
    await held.get_by_role("button", name="ورود با شماره‌ی موبایل").click()
    await expect(dlg).to_be_visible()
    await page.fill("#m-rest", "۱۲۱۲۳۴۵۶۷")
    await dlg.get_by_role("checkbox").check()
    await dlg.get_by_role("button", name="دریافت کد تأیید").click()
    code = page.get_by_role("dialog", name="کد تأیید")
    await expect(code).to_be_visible()
    check("تا پیش از وارد کردن کد هم چیزی فرستاده نشد", not sent, str(sent))
    await code.locator("input").fill("۱۲۳۴۵۶")
    await expect(code).to_be_hidden(timeout=5000)
    await page.wait_for_selector(".bot .actions", timeout=15000)
    check("پس از ورود، پرسش یک بار فرستاده و جواب داده شد", len(sent) == 1, str(sent))
    bubbles = await page.locator(".u-bubble").all_inner_texts()
    check("فقط همان پرسش روی صفحه است", bubbles == ["پرسش دوم پیش از ورود"], str(bubbles))
    check("کارت «ثبت شد» پس از ورود رفت", await page.locator(".held").count() == 0)
    await page.wait_for_selector(".history button")
    check("گفتگو در فهرست منوی کناری آمد", await page.locator(".history button").count() == 1)
    check("پس از ورود، پرسش از حافظه‌ی زبانه پاک شد", await page.evaluate("sessionStorage.getItem('tp-held')") is None)
    await no_english(page, "پس از ورود و پاسخ")
    check("بی خطای صفحه (پرسش پیش از ورود)", not errors, "; ".join(errors[:3]))
    await ctx.close()

    # Reload while signing in: the question comes back, and invite login sends it.
    ctx = await browser.new_context(viewport={"width": 1280, "height": 860})
    page = await ctx.new_page()
    sent2: list[str] = []
    page.on("request", lambda r: sent2.append(r.url) if "/api/chat" in r.url else None)
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    await ask(page, "پرسش پیش از بارگذاری دوباره")
    await expect(page.get_by_role("dialog", name="ورود با شماره‌ی موبایل")).to_be_visible(timeout=10000)
    await page.reload()
    await page.wait_for_selector(".held", timeout=5000)
    check("پس از بارگذاری دوباره، پرسش نگه‌داشته برگشت",
          await page.locator(".u-bubble").all_inner_texts() == ["پرسش پیش از بارگذاری دوباره"])
    await page.locator(".held").get_by_role("button", name="کد دعوت دارم").click()
    inv = page.get_by_role("dialog", name="ورود با کد دعوت")
    await expect(inv).to_be_visible()
    await inv.locator("input[type=text]").fill("TEST-CODE")
    await inv.get_by_role("checkbox").check()
    await inv.get_by_role("button", name="ورود", exact=True).click()
    await expect(inv).to_be_hidden()
    await page.wait_for_selector(".bot .actions", timeout=15000)
    check("ورود با کد دعوت پرسش نگه‌داشته را فرستاد", len(sent2) == 1 and await page.locator(".u-bubble").count() == 1, str(sent2))
    await ctx.close()

    # New chat drops the waiting question.
    ctx = await browser.new_context(viewport={"width": 1280, "height": 860})
    page = await ctx.new_page()
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    await ask(page, "پرسشی که کنار گذاشته می‌شود")
    await page.wait_for_selector(".wait")
    await page.get_by_role("button", name="گفتگوی تازه").first.click()
    await page.wait_for_selector(".welcome")
    await page.wait_for_timeout(5000)
    check("«گفتگوی تازه» پرسش منتظر را کنار گذاشت و پنجره‌ای باز نشد",
          await page.locator("[role=dialog]").count() == 0 and await page.evaluate("sessionStorage.getItem('tp-held')") is None)
    await ctx.close()


async def held_mobile(base: str, browser) -> None:
    for w, h in [(320, 568), (390, 844)]:
        ctx = await browser.new_context(viewport={"width": w, "height": h}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        await page.goto(base)
        await page.wait_for_selector(".welcome")
        await ask(page)
        dlg = page.get_by_role("dialog", name="ورود با شماره‌ی موبایل")
        await expect(dlg).to_be_visible(timeout=10000)
        r1 = await page.evaluate(MOBILE_CHECK)
        await page.keyboard.press("Escape")
        await page.wait_for_selector(".held")
        r2 = await page.evaluate(MOBILE_CHECK)
        check(f"گوشی {w}×{h}: پنجره و کارت «ثبت شد» بی اسکرول افقی و دکمه‌ها یک‌خطی",
              not r1["hscroll"] and not r1["wrapped"] and not r2["hscroll"] and not r2["wrapped"], f"{r1} {r2}")
        await ctx.close()


async def legacy_flow(base: str, browser) -> None:
    """Against a server that behaves like the old live one: no guest, invite login only."""
    ctx = await browser.new_context(viewport={"width": 390, "height": 844})
    page = await ctx.new_page()
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    check("سرور قدیمی: منوی کناری فقط ورود دعوتی پیشنهاد می‌کند", await page.locator("aside").get_by_text("ورود با کد دعوت").count() == 1
          and await page.locator("aside").get_by_text("ورود با شماره‌ی موبایل").count() == 0)
    await ask(page)
    inv = page.get_by_role("dialog", name="ورود با کد دعوت")
    await expect(inv).to_be_visible(timeout=10000)
    check("سرور قدیمی: پس از پرسش، پنجره‌ی کد دعوت باز می‌شود", True)
    check("سرور قدیمی: پیوند ورود پیامکی پنهان است", await inv.get_by_text("با شماره‌ی موبایل وارد شوید").count() == 0)
    check("سرور قدیمی: کارت «ثبت شد» فقط دکمه‌ی کد دعوت دارد",
          await page.locator(".held button").all_inner_texts() == ["ورود با کد دعوت"])
    await inv.locator("input[type=text]").fill("WRONG")
    await inv.get_by_role("checkbox").check()
    await inv.get_by_role("button", name="ورود", exact=True).click()
    await expect(inv.locator("[role=alert]")).to_have_text("این کد دعوت درست نیست یا دیگر اعتبار ندارد.")
    await inv.locator("input[type=text]").fill("TEST-CODE")
    await inv.get_by_role("button", name="ورود", exact=True).click()
    await expect(inv).to_be_hidden()
    await page.wait_for_selector(".bot .actions", timeout=15000)
    check("ورود دعوتی با سرور قدیمی کار می‌کند و پرسش فرستاده شد", True)
    note = await page.locator(".box-note").inner_text()
    check("بی نوار مصرف، شمار باقی‌مانده نشان داده می‌شود", "سؤال برای امروز باقی مانده" in note, note)
    await page.get_by_role("button", name="منو", exact=True).click()
    await expect(page.locator("aside.side.open")).to_be_visible()
    check("منوی کناری در گوشی باز می‌شود", "فهرست گفتگوهای قبلی به‌زودی" in await page.locator("aside").inner_text())
    await page.get_by_role("button", name="بستن منو").click()
    await expect(page.locator("aside.side.open")).to_have_count(0)
    await no_english(page, "گوشی، سرور قدیمی")
    await ctx.close()


MOBILE_CHECK = """() => {
  const out = {hscroll: document.documentElement.scrollWidth > innerWidth + 1, tiny: [], wrapped: []};
  for (const el of document.querySelectorAll('input:not([type=checkbox]), textarea'))
    if (el.getBoundingClientRect().width && parseFloat(getComputedStyle(el).fontSize) < 16) out.tiny.push(el.id || el.placeholder);
  for (const el of document.querySelectorAll('.btn, .btn2'))
    if (el.getBoundingClientRect().width && el.getBoundingClientRect().height > 60) out.wrapped.push(el.innerText);
  return out;
}"""


async def mobile_flow(base: str, browser) -> None:
    """Phones from 320 px wide, a tablet, and a phone held sideways."""
    for w, h in [(320, 568), (360, 740), (390, 844), (768, 1024), (844, 390)]:
        ctx = await browser.new_context(viewport={"width": w, "height": h}, is_mobile=w < 800, has_touch=w < 800)
        page = await ctx.new_page()
        await page.goto(base)
        await page.wait_for_selector(".welcome")
        await ask(page)
        await page.wait_for_selector(".bot .actions", timeout=15000)
        r = await page.evaluate(MOBILE_CHECK)
        drawer = await page.locator(".topbar .iconbtn[aria-label='منو']").is_visible()
        check(f"گوشی {w}×{h}: بی اسکرول افقی، ورودی‌ها ۱۶ و دکمه‌ها یک‌خطی",
              not r["hscroll"] and not r["tiny"] and not r["wrapped"], str(r))
        if w < 800 or h < 520:
            check(f"گوشی {w}×{h}: منوی کناری کشویی است", drawer)
        await ctx.close()


async def busy_flow(base: str, browser) -> None:
    ctx = await browser.new_context()
    page = await ctx.new_page()
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    await ask(page)
    await page.wait_for_selector(".notice")
    check("پیام «شلوغ است»", "شلوغ" in await page.locator(".notice").inner_text())
    await ctx.close()


MEMORY_NOTE = "این گفتگو ۳ تا ۴ پرسش آخرتان را به یاد دارد. برای موضوع تازه، «گفتگوی تازه» را بزنید."
LONG_NOTE = "از اینجا به بعد پرسش‌های اول این گفتگو کم‌کم از یادم می‌رود. اگر موضوع عوض شده، «گفتگوی تازه» را بزنید."
Q_RATE = "نرخ مالیات حقوق ۱۴۰۵؟"
Q_JUDGES = "برای قضات چطور؟"
JUDGES_LINE = "برداشت من از پرسش شما: «نرخ مالیات حقوق قضات در سال ۱۴۰۵ چگونه است؟» — اگر درست نفهمیدم، کامل‌تر بپرسید."

# Records, for the newest answer, when the «understood» line and the answer text first appear (MutationObserver),
# and samples the scroll position on every frame (with whether the answer has ended: the buttons under it exist).
RECORD = """() => {
  const sc = document.querySelector('.scroll');
  const n = document.querySelectorAll('.bot').length;
  const rec = window.__rec = {u: null, p: null, samples: [], n};
  const bot = () => document.querySelectorAll('.bot')[rec.n];
  const mo = new MutationObserver(() => {
    const b = bot(); if (!b) return;
    if (rec.u === null && b.querySelector('.understood')) rec.u = performance.now();
    const pr = b.querySelector('.prose');
    if (rec.p === null && pr && pr.innerText.trim()) rec.p = performance.now();
  });
  mo.observe(document.body, {subtree: true, childList: true, characterData: true});
  const tick = () => {
    const b = bot();
    const pr = b && b.querySelector('.prose');
    rec.samples.push({top: sc.scrollTop, done: !!(b && b.querySelector('.actions')), prose: pr ? pr.getBoundingClientRect().top : null,
                      writing: !!(pr && b.getAttribute('aria-busy') === 'true')});
    if (rec.samples.length < 20000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}"""


async def both_notes(page: Page) -> tuple[int, int]:
    return await page.locator(".memnote:visible").count(), await page.locator(".longnote:visible").count()


async def memory_flow(base: str, browser) -> None:
    """#703: the memory line, the «understood» line above a follow-up, and MSG.long."""
    ctx = await browser.new_context(viewport={"width": 1280, "height": 860})
    page = await ctx.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    check("حافظه: پیش از هر جواب، خط حافظه نیست", await page.locator(".memnote").count() == 0)

    await ask(page, Q_RATE)
    await page.wait_for_selector(".bot >> nth=0 >> .actions", timeout=15000)
    check("حافظه: پرسش اول بی خط برداشت", await page.locator(".bot >> nth=0 >> .understood").count() == 0)
    m, l = await both_notes(page)
    check("حافظه: پس از جواب اول، خط حافظه زیر کادر نوشتن، متن دقیق",
          m == 1 and l == 0 and await page.locator(".memnote").inner_text() == MEMORY_NOTE)

    await page.evaluate(RECORD)
    await ask(page, Q_JUDGES)
    await page.wait_for_selector(".bot >> nth=1 >> .actions", timeout=15000)
    line = page.locator(".bot >> nth=1 >> .understood")
    got = await line.all_inner_texts()
    check("حافظه: پیگیری با خط برداشت، متن دقیق", got == [JUDGES_LINE], str(got))
    rec = await page.evaluate("window.__rec")
    check("حافظه: خط برداشت پیش از متن جواب آمد", rec["u"] is not None and rec["p"] is not None and rec["u"] < rec["p"], str({k: rec[k] for k in ("u", "p")}))
    check("حافظه: خط برداشت بالای متن جواب است",
          await page.evaluate("(() => { const b = document.querySelectorAll('.bot')[1]; return b.querySelector('.understood').getBoundingClientRect().bottom <= b.querySelector('.prose').getBoundingClientRect().top; })()"))

    await ask(page, "همان پرسش را دوباره بگو")
    await page.wait_for_selector(".bot >> nth=2 >> .actions", timeout=15000)
    check("حافظه: پیگیری با بازنویسی برابر بی خط برداشت", await page.locator(".bot >> nth=2 >> .understood").count() == 0)
    m, l = await both_notes(page)
    check("حافظه: پس از سه جواب هنوز خط حافظه، بی یادداشت طولانی", m == 1 and l == 0, f"{m} {l}")

    await ask(page, "پرسشی که برداشتش فقط در پایان می‌آید")
    await page.wait_for_selector(".bot >> nth=3 >> .actions", timeout=15000)
    check("حافظه: برداشتی که فقط در done آمد همان‌جا نشان داده شد", await page.locator(".bot >> nth=3 >> .understood").count() == 1)
    m, l = await both_notes(page)
    check("حافظه: پس از پرسش چهارم یادداشت طولانی با متن تازه و خط حافظه پنهان",
          m == 0 and l == 1 and LONG_NOTE in await page.locator(".longnote").inner_text(), f"{m} {l}")
    await no_english(page, "خط حافظه و خط برداشت")

    # Reopened from the side menu: no «understood» lines (history has none), the long note stays alone.
    await page.get_by_role("button", name="گفتگوی تازه").first.click()
    await page.wait_for_selector(".welcome")
    await page.wait_for_selector(".history button")
    await page.locator(".history button").first.click()
    await page.wait_for_selector(".bot >> nth=3 >> .actions", timeout=15000)
    m, l = await both_notes(page)
    check("حافظه: گفتگوی دوباره‌بازشده بی خط برداشت؛ خط حافظه و یادداشت طولانی با هم نه",
          await page.locator(".understood").count() == 0 and not (m and l), f"{m} {l}")
    check("بی خطای صفحه (حافظه)", not errors, "; ".join(errors[:3]))
    await ctx.close()


async def scroll_flow(base: str, browser) -> None:
    """#703: no automatic scroll when an answer ends; a reader who scrolled up is never pulled down."""
    ctx = await browser.new_context(viewport={"width": 1280, "height": 860})
    page = await ctx.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    await ask(page, Q_RATE)
    await page.wait_for_selector(".bot >> nth=0 >> .actions", timeout=15000)

    # 1) Long answer, ten sources, reader at the bottom: followed while written; nothing moves when it ends.
    await page.evaluate(RECORD)
    await ask(page, "جواب بلند بده: مهلت اظهارنامه‌ی شرکت‌ها")
    await page.wait_for_selector(".bot >> nth=1 >> .actions", timeout=20000)
    await page.wait_for_timeout(600)
    rec = await page.evaluate("window.__rec")
    before = [s for s in rec["samples"] if not s["done"] and s["prose"] is not None]
    after = [s for s in rec["samples"] if s["done"]]
    check("اسکرول: ده منبع زیر جواب بلند", "منابع (۱۰)" in await page.locator(".bot >> nth=1 >> .sources-head").inner_text())
    check("اسکرول: هنگام نوشتن جواب، صفحه دنبال متن رفت (خواننده پایین بود)",
          len(before) > 2 and before[-1]["top"] > before[0]["top"], f"{before[0]['top'] if before else None} → {before[-1]['top'] if before else None}")
    tops = sorted({round(s["top"]) for s in after})
    prose = sorted({round(s["prose"]) for s in after if s["prose"] is not None})
    check("اسکرول: پس از done موقعیت اسکرول همان پیش از done است (جواب بلند، ده منبع)",
          bool(before) and tops == [round(before[-1]["top"])], f"پیش {round(before[-1]['top']) if before else None} پس {tops}")
    check("اسکرول: متن جواب پس از done جابه‌جا نشد",
          bool(before) and prose == [round(before[-1]["prose"])], f"پیش {round(before[-1]['prose']) if before else None} پس {prose}")
    sc = await page.evaluate("(() => { const e = document.querySelector('.scroll'); return [e.scrollTop, e.scrollHeight, e.clientHeight]; })()")
    check("اسکرول: صفحه تا ته منابع پایین نرفت", sc[1] - sc[0] - sc[2] > 300, str(sc))

    # 2) The «understood» line arriving only with done lands above the text: the text stays where the reader sees it.
    await page.evaluate("document.querySelector('.scroll').scrollTop = 1e9")
    await page.evaluate(RECORD)
    await ask(page, "جواب بلند فقط در پایان بده")
    await page.wait_for_selector(".bot >> nth=2 >> .actions", timeout=20000)
    await page.wait_for_timeout(600)
    rec = await page.evaluate("window.__rec")
    before = [s for s in rec["samples"] if not s["done"] and s["prose"] is not None]
    after = [s for s in rec["samples"] if s["done"]]
    prose = sorted({round(s["prose"]) for s in after if s["prose"] is not None})
    check("اسکرول: خط برداشتِ دیررس متن جواب را نپراند",
          await page.locator(".bot >> nth=2 >> .understood").count() == 1 and bool(before)
          and all(abs(p - round(before[-1]["prose"])) <= 1 for p in prose), f"پیش {round(before[-1]['prose']) if before else None} پس {prose}")

    # 3) A reader who scrolls up while the answer is written is never pulled down, during or after.
    await page.evaluate("document.querySelector('.scroll').scrollTop = 1e9")
    await page.evaluate(RECORD)
    await ask(page, "جواب بلند دیگری بده")
    await page.wait_for_function(
        "(() => { const b = document.querySelectorAll('.bot')[3]; const p = b && b.querySelector('.prose'); return p && p.innerText.length > 200; })()",
        timeout=20000)
    await page.mouse.move(640, 300)
    await page.mouse.wheel(0, -3000)
    await page.wait_for_timeout(300)
    up = await page.evaluate("document.querySelector('.scroll').scrollTop")
    await page.wait_for_selector(".bot >> nth=3 >> .actions", timeout=20000)
    await page.wait_for_timeout(600)
    rec = await page.evaluate("window.__rec")
    i_up = next((i for i, s in enumerate(rec["samples"]) if round(s["top"]) == round(up)), None)
    later = sorted({round(s["top"]) for s in rec["samples"][i_up:]}) if i_up is not None else []
    check("اسکرول: کاربرِ بالارفته پایین کشیده نمی‌شود (هنگام نوشتن و پس از پایان)",
          i_up is not None and later == [round(up)], f"بالا {up} سپس {later[:6]}")
    check("بی خطای صفحه (اسکرول)", not errors, "; ".join(errors[:3]))
    await ctx.close()


async def understood_mobile(base: str, browser) -> None:
    """#703: on a phone the «understood» line is at most two lines, the rest «…»."""
    ctx = await browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = await ctx.new_page()
    await page.goto(base)
    await page.wait_for_selector(".welcome")
    await ask(page, "اگر شرکتی در سال ۱۴۰۵ هم کالا صادر کند و هم خدمات فنی به مشتریان داخلی بدهد، مالیات بر ارزش افزوده و مالیات عملکردش چگونه حساب می‌شود؟")
    await page.wait_for_selector(".bot >> nth=0 >> .actions", timeout=15000)
    await ask(page, "برای شرکت‌های دانش‌بنیان چطور؟")
    await page.wait_for_selector(".bot >> nth=1 >> .actions", timeout=15000)
    dims = await page.evaluate(
        "(() => { const e = document.querySelector('.understood');"
        " const lh = parseFloat(getComputedStyle(e).lineHeight); return [e.clientHeight, e.scrollHeight, lh]; })()")
    check("گوشی: خط برداشت حداکثر دو خط و بقیه بریده", dims[0] <= 2 * dims[2] + 1 and dims[1] > dims[0], str(dims))
    r = await page.evaluate(MOBILE_CHECK)
    check("گوشی: با خط حافظه و خط برداشت بی اسکرول افقی و دکمه‌ها یک‌خطی", not r["hscroll"] and not r["wrapped"], str(r))
    await ctx.close()


async def main() -> int:
    procs = [
        start_mock(8701, MOCK_GUESTS="1"),
        start_mock(8702, MOCK_LEGACY="1"),
        start_mock(8703, MOCK_BUSY="1", MOCK_GUESTS="1"),
        start_mock(8704, MOCK_GUESTS="1"),
        start_mock(8705),
        start_mock(8706, MOCK_GUESTS="1", MOCK_GUEST_QUESTIONS="30"),
    ]
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            await held_flow("http://127.0.0.1:8705/", browser)
            await held_mobile("http://127.0.0.1:8705/", browser)
            await new_flow("http://127.0.0.1:8701/", browser)
            await legacy_flow("http://127.0.0.1:8702/", browser)
            await mobile_flow("http://127.0.0.1:8704/", browser)
            await busy_flow("http://127.0.0.1:8703/", browser)
            await memory_flow("http://127.0.0.1:8706/", browser)
            await scroll_flow("http://127.0.0.1:8706/", browser)
            await understood_mobile("http://127.0.0.1:8706/", browser)
            await browser.close()
    finally:
        for pr in procs:
            pr.send_signal(signal.SIGTERM)
    bad = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(bad)}/{len(results)} passed")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
