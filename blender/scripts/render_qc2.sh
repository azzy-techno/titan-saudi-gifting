#!/usr/bin/env bash
# render_qc2.sh -- final QC2 renders (Cycles GPU/OptiX, background, factory startup, prefs never saved).
# Usage (project root, Git Bash): bash blender/scripts/render_qc2.sh blender/watch_v008.blend [samples] [WxH]
set -u
BLEND="${1:-blender/watch_v008.blend}"
SAMPLES="${2:-768}"
RES="${3:-1800x1125}"
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
TMP="blender/wip/tmp/qc2_raw"
mkdir -p "$TMP" qa/qc2
LOG="qa/qc2/render_log.txt"
echo "QC2 render $(date -Iseconds) blend=$BLEND samples=$SAMPLES res=$RES view=AgX look='AgX - Medium High Contrast'" > "$LOG"
run () {
  name="$1"; shift
  "$B" -b --factory-startup "$BLEND" -P blender/scripts/render.py -- "$@" --out "$TMP/$name.png" --samples "$SAMPLES" --res "$RES" 2>&1 | grep -E "RENDER_INFO|Error|Traceback" >> "$LOG"
  node blender/scripts/composite.mjs "$TMP/$name.png" "qa/qc2/$name.png" >> "$LOG"
}
run 01-hero-three-quarter --shot hero
run 02-exploded --shot exploded --exposure 0.3
run 03-movement-macro --shot macro
run 04-engraved-caseback --shot caseback
run 05-finish-steel --shot finish_steel
run 06-finish-gold --shot finish_gold
run 07-finish-black --shot finish_black
echo "DONE $(date -Iseconds)" >> "$LOG"
