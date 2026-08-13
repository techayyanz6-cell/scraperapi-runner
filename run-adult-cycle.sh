#!/bin/bash
# Adult link 20 min test pe Tier1 countries, phir auto wapas all-countries pe default link
DIR="/home/shaharyar/Desktop/node"
LOG="$DIR/adult_cycle.log"

echo "[$(date)] PHASE 1: Adult link + Tier1 (20 min)" >> "$LOG"
bash "$DIR/run-multi.sh" 20 adult tier1 >> "$LOG" 2>&1

echo "[$(date)] PHASE 2: Default link + all countries (unlimited)" >> "$LOG"
sleep 5
bash "$DIR/run-multi.sh" all default all >> "$LOG" 2>&1

echo "[$(date)] PHASE 2 running" >> "$LOG"