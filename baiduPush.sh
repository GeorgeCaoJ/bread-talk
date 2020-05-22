#!/usr/bin/env sh

set -e

# 百度链接推送
curl -H 'Content-Type:text/plain' --data-binary @urls.txt "http://data.zz.baidu.com/urls?site=https://bread-whisper.now.sh&token=dENgAjBdRXKJx6qf"

rm -rf urls.txt # 灭迹