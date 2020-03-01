---
layout: post
title: linux下使用curl和shell进行POST并行请求测试
description: 记录在linux环境下使用curl和shell进行POST压力测试
tags:
- linux
- curl
- shell
date: 2019-08-06 12:34:56
comments: true
---

## curl

### 进行POST请求

```shell
$ curl -H "http-header: value" --data @body.json http://ip:port/url
```

`-H`表示header字段，`--date`表示body字段，body可以单独写成json格式如：
```json
{
    "user": "GerorgeCaoJ",
    "location": "china"
}
```

## shell多进程运行脚本
### 场景
同一时间对远程地址POST请求
### 工具
POST请求使用curl，http body放于body.json, curl命令存于request.sh
### shell脚本
使用`&`可让shell fork出进程单独执行脚本
```shell
for i in {1..100}
do
	(./request.sh; echo "[$i] done") &
done
```

