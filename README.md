# 阅读进度 / Reading Progress

Morz 官方示例插件：在状态栏显示当前文档的阅读进度和剩余时间。

> 状态栏项默认显示；不想看到时右键状态栏 ›「插件状态项」把本插件取消勾选即可。

## 功能

- 状态栏实时显示滚动进度，例如 `42%`
- 点击状态栏循环切换：
  - 仅百分比
  - 百分比 + 剩余时间
  - 仅剩余时间
- 命令：
  - `阅读进度：跳到文首`
  - `阅读进度：跳到文末`
  - `阅读进度：切换显示方式`
- 短文档（一屏能放下）显示 `100%`
- 没有打开文档时显示 `—`

## 权限

```json
["workspace", "settings"]
```

不联网、不读写文档内容；只读取当前编辑器的滚动位置和全文长度用于统计。

## 设置

设置 → 插件 → 阅读进度：

- 显示方式：仅百分比 / 百分比 + 剩余时间 / 仅剩余时间
- 阅读速度（字/分钟）：默认 300

修改后立即生效。

## 开发

```js
ctx.ui.statusBar({ text, title, onClick })   // 返回可 refresh() 的句柄
ctx.active.scrollProgress()                  // 0–1
ctx.active.onScroll(() => bar.refresh())
ctx.settings.onChange(() => bar.refresh())
ctx.timers.debounce(fn, 180)                 // 字数统计防抖
```

完整的 SDK 文档见 Morz 仓库的 `docs/PLUGIN-SDK.md`。

## 发布

`release.yml` 是独立公开仓库用的 GitHub Actions 工作流：打 `v*` tag 后创建 Release。
移动到独立仓库时把它放到 `.github/workflows/release.yml`。
