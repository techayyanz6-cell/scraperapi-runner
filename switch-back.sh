#!/bin/bash
# 20 min baad ngmix wapas
sleep 1240
bash /home/shaharyar/Desktop/node/run-multi.sh all adult ngmix 60 >> /home/shaharyar/Desktop/node/switchback.log 2>&1
echo "[$(date)] SWITCHED BACK to ngmix" >> /home/shaharyar/Desktop/node/switchback.log