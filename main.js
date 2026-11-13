// 阅读进度：状态栏显示滚动进度，点击切换「百分比 / 百分比+剩余时间 / 仅剩余时间」。
// SDK 1.1：statusBar 句柄刷新、active.scrollProgress/onScroll、settings.onChange、
// timers.debounce。插件不接触编辑器内部视图，也不联网。

const DISPLAYS = ["percent", "both", "time"];
const DEFAULTS = { display: "percent", readingSpeed: 300 };

module.exports = {
  async activate(ctx) {
    let settings = { ...DEFAULTS };
    let words = 0;
    let hasDocument = false;
    let bar = null;

    const normalize = current => {
      const display = DISPLAYS.includes(current.display) ? current.display : DEFAULTS.display;
      const speed = Math.min(2000, Math.max(60, Number(current.readingSpeed) || DEFAULTS.readingSpeed));
      return { display, readingSpeed: speed };
    };

    const countWords = text => {
      if (!text) return 0;
      return (text.match(/[\u3400-\u9fff]|[A-Za-z0-9]+/g) ?? []).length;
    };

    const recompute = text => {
      hasDocument = text.length > 0 || ctx.active.path() !== null;
      words = countWords(text);
    };

    const remainingMinutes = progress => {
      const left = Math.max(0, words * (1 - progress));
      return Math.ceil(left / settings.readingSpeed);
    };

    const render = () => {
      if (!hasDocument) return "—";
      const progress = ctx.active.scrollProgress();
      const percent = Math.round(progress * 100);
      if (settings.display === "percent") return `${percent}%`;
      const minutes = remainingMinutes(progress);
      const time = minutes <= 1 ? "不到 1 分钟" : `剩 ${minutes} 分钟`;
      return settings.display === "time" ? time : `${percent}% · ${time}`;
    };

    const refresh = () => bar?.refresh();

    const readSettings = async () => {
      settings = normalize({ ...DEFAULTS, ...(await ctx.settings.get()) });
    };

    const cycleDisplay = async () => {
      const index = DISPLAYS.indexOf(settings.display);
      settings.display = DISPLAYS[(index + 1) % DISPLAYS.length];
      await ctx.settings.set({ display: settings.display });
      refresh();
    };

    await readSettings();
    recompute(ctx.active.text());

    ctx.settings.defineSchema([
      {
        key: "display", label: "显示方式", type: "select",
        options: [["percent", "仅百分比"], ["both", "百分比 + 剩余时间"], ["time", "仅剩余时间"]],
        value: DEFAULTS.display,
      },
      { key: "readingSpeed", label: "阅读速度（字/分钟）", type: "number", min: 60, max: 2000, value: DEFAULTS.readingSpeed },
    ]);

    bar = ctx.ui.statusBar({
      text: render,
      title: "阅读进度 · 点击切换显示方式",
      onClick: () => void cycleDisplay(),
    });

    // 设置（宿主内联表单或点击状态栏）变化后立即重算
    ctx.settings.onChange(async () => {
      await readSettings();
      refresh();
    });

    // 滚动只做 O(1) 的进度计算；字数统计在文本变化时防抖重算
    ctx.active.onScroll(() => refresh());
    const onText = ctx.timers.debounce(text => {
      recompute(text);
      refresh();
    }, 180);
    ctx.active.onChange(onText);
    ctx.active.onPathChange(() => {
      // 文档切换时视图内容可能还没同步，等一拍再读
      ctx.timers.setTimeout(() => {
        recompute(ctx.active.text());
        refresh();
      }, 0);
    });

    ctx.ui.command({
      id: "jump-start",
      name: "跳到文首",
      run: () => {
        try { ctx.active.scrollTo(0); } catch { /* 没有打开的文档 */ }
      },
    });
    ctx.ui.command({
      id: "jump-end",
      name: "跳到文末",
      run: () => {
        try { ctx.active.scrollTo(ctx.active.text().length); } catch { /* 没有打开的文档 */ }
      },
    });
    ctx.ui.command({
      id: "cycle-display",
      name: "切换显示方式",
      run: () => void cycleDisplay(),
    });
  },
};
