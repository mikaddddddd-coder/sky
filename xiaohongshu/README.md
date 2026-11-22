# 小红书预热素材

- `teaser/01–03.png`：预热图（1080×1440），`teaser/文案.md` 是标题、正文和话题。
- `video/lookup-teaser.mp4`：约 30 秒的预告视频（1080×1440，无配乐）。
- `assets/`：2026-11-22 在 iPhone 17 模拟器上截的图（上海，晚霞 94%），以及从中裁出的卡片；`poster.png` 是 App 里保存的生日月亮海报（示例日期 2000-01-10）。

重新生成：

- 图片：`slides.html#1…#3`，用 Chrome 无头模式 `--window-size=1080,1440 --screenshot` 截图。
- 视频：`node video/render.mjs <帧目录> 30`，再
  `ffmpeg -framerate 30 -i <帧目录>/%04d.png -c:v libx264 -crf 17 -pix_fmt yuv420p video/lookup-teaser.mp4`。
  `video/video.html#12.5` 可以在浏览器里看某一秒的画面。
