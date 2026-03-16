# AI Influencer Image Prompting — Best Practices
*Date: 2026-03-16*
*Sources: NextDiffusion, Leonardo.ai, Midjourney/SD community guides*

## Key Insights (15 Bullets)

1. **Use photography-based language** — "editorial photo", "portrait photograph" beats "hyper realistic" which tends to produce plastic/uncanny results.
2. **Specify lens and camera** — "Sony 85mm f/1.8", "Canon 5D Mark IV", "35mm film" grounds the output in real-world optics and improves realism.
3. **Name the lighting setup explicitly** — "soft window light from left", "overcast natural light", "warm golden hour" rather than just "good lighting".
4. **Anchor physical traits in every prompt** — repeat hair color, eye color, approximate age every generation. "52-year-old woman, salt-and-pepper hair, warm brown eyes" keeps character identity stable.
5. **Avoid vague style terms** — skip "ultra-realistic", "hyperdetailed"; use "natural skin texture", "visible pores", "soft skin" instead to avoid the AI doll look.
6. **Full face visible rule** — character consistency requires the face to be fully in frame, not cropped or at extreme angles.
7. **Depth-of-field descriptors help realism** — "shallow depth of field", "bokeh background", "f/2.0 aperture" separates subject from background naturally.
8. **Specify background with blur intent** — "blurred bookshelf background", "soft focus kitchen" keeps background contextual without competing with face.
9. **Emotion must be described precisely** — "gentle knowing smile", "thoughtful but warm", "confident direct gaze" — vague emotions produce generic expressions.
10. **Clothing anchors character energy** — casual but put-together: "soft cotton top", "natural linen blouse" signals "real person" not "model on set".
11. **Avoid jewelry overload** — any jewelry described should be minimal; complex jewelry distracts and dates poorly. State "minimal jewelry" or "no jewelry" explicitly.
12. **Body realism phrase** — include "natural body type", "not model-thin", "real proportions" to counteract default model body bias.
13. **Character sheet for multi-image consistency** — for ongoing use, generate a reference sheet showing the same face from multiple angles in one frame, then use that as a reference for subsequent generations.
14. **Negative prompts matter** — for platforms that support it: avoid "cartoon, anime, illustration, airbrushed, plastic skin, overexposed, lens flare".
15. **Portrait orientation (768x1376 or similar tall ratio)** beats square for social content — matches TikTok/Reels format natively.

## Prompt Formula for Kate Mercer
```
[Setting + action]. [Age + physical description]. [Expression + energy]. [Lighting]. [Lens/camera]. [Background]. [Clothing note]. Photorealistic portrait photograph. Natural skin texture. Shallow depth of field.
```
