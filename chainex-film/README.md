# Chainex hero film

The homepage hero film: an original six-piece skincare range assembling itself on stone plinths in a
charcoal studio. It is rendered frame by frame from `range-film.js`, the range-assembly-film skill's
scene with four added options (label print colour, fade colour, lens shift, portrait framing).

| File | What it is |
|---|---|
| `range-film.js` | the scene (three.js r186). Every frame is a pure function of time |
| `desktop.json` | options for the 16:9 cut: white products, charcoal ink labels, composition shifted right for the headline |
| `phone.json` | options for the 4:5 cut: wider framing, final shot centred |
| `render.mjs` | renders frames with motion blur (resumes if stopped) |
| `encode.sh` | encodes AV1 and H.264 MP4s with a dip to charcoal at the end, plus the still |

## Re-render

Put `three.module.js` and `three.core.js` (from `npm i three@0.186.0`) next to `range-film.js` in a stage
folder, then:

```bash
node render.mjs --stage stage --out frames-desk --width 2560 --height 1440 --config desktop.json
node render.mjs --stage stage --out frames-phone --width 1080 --height 1350 --config phone.json
./encode.sh frames-desk hero-desk 2560 1440 5.1 34 23
./encode.sh frames-phone hero-phone 1080 1350 4.0 34 22
```

Without a GPU (software WebGL) the desktop cut takes about 45 minutes and the phone cut about 25 on four cores.
Copy the MP4s and stills into `chainex-site/assets/film/`.
