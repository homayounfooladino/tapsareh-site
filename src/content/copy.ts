// Texts carried over word for word from the current live page (src/trial/static/index.html, master f61928f).
// Disclaimer: Homayoun's wording (2026-11-27). The «not a tax advisor» line lives in the terms.

export const DISCLAIMER =
  "تپصره هوش مصنوعی است و ممکن است اشتباه کند.";

export const TAGLINE = "دستیار قوانین و مقررات مالیاتی";

export const LEDE =
  "ساده بپرسید، همان‌طور که از یک همکار باتجربه می‌پرسید. جواب را از قوانین جاری پیدا می‌کنم و می‌گویم از کدام ماده آمده.";

export const GUIDE_TITLE = "چطور بپرسید تا جواب بهتری بگیرید";

// Each item: plain text, with **bold** parts as in the current page.
export const GUIDE_ITEMS: readonly string[] = [
  "سؤال را **ساده، روشن و کوتاه** بنویسید؛ یک یا دو جمله کافی است.",
  "**هر بار یک موضوع** بپرسید. اگر چند سؤال دارید، جدا جدا بفرستید.",
  "اگر می‌دانید، **سال مالی** (مثلاً ۱۴۰۵) و **نوع مؤدی** (شخص حقیقی، شرکت، صنف…) را هم بنویسید. اگر نمی‌دانید، اشکالی ندارد؛ همان را بپرسید.",
  "اگر نام قانون یا شماره‌ی ماده را می‌دانید، بنویسید.",
  "اگر جواب «در اسناد موجود نیامد» بود، با کلمات دیگر یا دقیق‌تر بپرسید.",
  "**حافظه‌ی هر گفتگو:** تپصره فقط ۳ تا ۴ سؤال و جواب آخر همین گفتگو را به یاد دارد، و از جواب‌های قبلی فقط چند خط اول را. بعد از چند سؤال پیگیری، یا وقتی موضوع عوض شد، «گفتگوی تازه» را بزنید.",
  "جواب درستی نگرفتید؟ «اشکال دارد» را بزنید؛ همین کمک می‌کند بهتر شوم.",
];

export const SAMPLES: readonly { q: string; tag: string }[] = [
  { q: "نرخ‌های مالیات حقوق در سال ۱۴۰۵ چگونه است؟", tag: "حقوق" },
  { q: "کدام مشاغل از مالیات ارزش افزوده در سال ۱۴۰۵ معافند؟", tag: "ارزش افزوده" },
  { q: "سقف هزینه‌های فرهنگی و ورزشی کارگران برای شرکت در سال ۱۴۰۵ چقدر است؟", tag: "هزینه‌ی قابل قبول" },
  { q: "هیئت حل اختلاف مالیاتی چگونه رسیدگی می‌کند؟", tag: "هیئت حل اختلاف" },
];

export const STAGE: Record<string, string> = {
  rewrite: "دارم سؤالتان را می‌خوانم…",
  retrieve: "دارم در قوانین و مقررات می‌گردم…",
  pack: "دارم ماده‌های مرتبط را کنار هم می‌گذارم…",
  generate: "دارم جواب را می‌نویسم…",
  second_pass: "دارم در قوانین و مقررات می‌گردم…",
};

export const MSG = {
  daily: "سهم امروزتان تمام شد. نیمه‌شب به وقت ایران دوباره پر می‌شود؛ فردا منتظرتان هستم.",
  net: "ارتباط قطع شد؛ اینترنتتان را نگاه کنید و دوباره بفرستید.",
  ended: "مدتی گذشته و از حساب بیرون آمده‌اید؛ دوباره وارد شوید.",
  inviteBad: "این کد دعوت درست نیست یا دیگر اعتبار ندارد.",
  busy: "الان سرم شلوغ است؛ یک دقیقه‌ی دیگر دوباره بفرستید.",
  long: "از اینجا به بعد پرسش‌های اول این گفتگو کم‌کم از یادم می‌رود. اگر موضوع عوض شده، «گفتگوی تازه» را بزنید.",
  thanks: "ممنون که گفتید؛ همین کمک می‌کند بهتر شوم.",
} as const;

// A question asked before sign-in. It is not sent anywhere until the person signs in; then it is sent and answered here.
export const HELD = {
  title: "سؤالتان ثبت شد.",
  text: "برای دیدن جواب، کافی است وارد شوید؛ جوابش همین‌جا آماده می‌شود.",
  textInvite: "برای دیدن جواب، با کد دعوت وارد شوید؛ جوابش همین‌جا آماده می‌شود.",
  signup: "سؤالتان ثبت شد. شماره را که تأیید کنید، جوابش همین‌جا آماده می‌شود.",
  invite: "سؤالتان ثبت شد. با کد دعوت وارد شوید تا جوابش همین‌جا آماده شود.",
} as const;

// #703: conversation memory made visible.
// A small fixed line under the question box, once the conversation has an answer (hidden while MSG.long shows).
export const MEMORY_NOTE = "این گفتگو ۳ تا ۴ پرسش آخرتان را به یاد دارد. برای موضوع تازه، «گفتگوی تازه» را بزنید.";
// Above a follow-up answer: how the question was understood (the server's rewritten search question).
export const understoodLine = (q: string) => `برداشت من از پرسش شما: «${q}» — اگر درست نفهمیدم، کامل‌تر بپرسید.`;
