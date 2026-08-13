#!/bin/bash
# Phase 1: 20 min pure Nigeria, Phase 2: wapas ngmix (all, sessions on)
DIR="/home/shaharyar/Desktop/node"
LOG="$DIR/ng20_cycle.log"

echo "[$(date)] PHASE 1: Nigeria-only 20 min" >> "$LOG"
bash "$DIR/run-multi.sh" 20 adult ng 60 >> "$LOG" 2>&1

echo "[$(date)] PHASE 2: wapas ngmix unlimited" >> "$LOG"
sleep 5
bash "$DIR/run-multi.sh" all adult ngmix 60 >> "$LOG" 2>&1

echo "[$(date)] PHASE 2 running" >> "$LOG"