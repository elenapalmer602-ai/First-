#!/bin/bash
# encode.sh <frames-dir> <name> <width> <height> <h264-level> <av1-crf> <h264-crf>
# Dips to the hero charcoal over the last 0.6 s so the loop restarts seamlessly from the opening fade-up.
set -e
F=$1; N=$2; W=$3; H=$4; LV=$5; ACRF=$6; HCRF=$7
OUT=/tmp/claude-0/-home-user-First-/73845e65-9a26-5817-b1de-5a62c0c4b401/scratchpad/film/out; mkdir -p $OUT
cnt=$(ls $F/*.jpg | wc -l); dur=$(python3 -c "print($cnt/30)"); st=$(python3 -c "print(round($cnt/30-0.6,3))")
VF="fade=t=out:st=$st:d=0.6:color=0x1c1c1d,format=yuv420p"
ffmpeg -y -loglevel error -framerate 30 -i $F/%05d.jpg -vf "$VF" -c:v libsvtav1 -preset 4 -crf $ACRF -g 60 -svtav1-params tune=0 -movflags +faststart $OUT/$N-av1.mp4
ffmpeg -y -loglevel error -framerate 30 -i $F/%05d.jpg -vf "$VF" -c:v libx264 -preset slow -crf $HCRF -profile:v high -level:v $LV -g 60 -movflags +faststart $OUT/$N.mp4
# the finished-range still (before the dip), for reduced motion and blocked autoplay
last=$(ls $F/*.jpg | tail -1); fr=$(printf "%05d" $(( cnt - 28 )))
ffmpeg -y -loglevel error -i $F/$fr.jpg -q:v 3 $OUT/$N-still.jpg
ls -la $OUT/$N*
