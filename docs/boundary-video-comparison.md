# Recorded boundary comparisons

`boundary-videos.html` presents recorded video, without launching a game, requiring taps to fly or forcing phone rotation. The comparison is stacked in portrait and side by side on wider screens. A matching enlarged clip can be selected below; Compare still freezes all views at the same close pass. Playback is muted and inline, with only the comparison and selected detail decoding at once.

All three treatments are recorded from the production WispFlightView, with the actual authored pinewood course, scenery, lighting, Collector, Wisp and exposed collision contours. One engine renders all three styles at each identical time, position and camera value. The pass is a controlled visual replay rather than a physics/balance test. It approaches the real terrain slowly, then zooms to 2.35× to make the fine contact differences readable. No collision geometry, ordinary game art, progression or player saves are changed.

Moonlit Rim is cool ivory with a local blue rim. Living Stone has mineral-green, irregular solid-side grain. Danger Wake warms to amber near contact. These remain alternatives for review; none is selected as the default game treatment.

To reproduce, start `node scripts/record-boundary-video.mjs`, open its local recorder and press Export. It exports 360 exact rendered PNG frames to work/boundary-video/frames. Then run `python scripts/encode-boundary-videos.py`. The outputs are 12-second, 30 FPS H.264/yuv420p MP4s with fast-start headers, plus still posters. They use existing game assets; no substitute artwork is used. The video gallery and its videos are deliberately outside the offline gameplay manifest so an older worker has no cached page or video to substitute.
