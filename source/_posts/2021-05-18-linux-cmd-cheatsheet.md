---
layout: post
title: 
description: [CHEATSHEET]linux工具与命令
tags:
- linux
- cheatsheet
date: 2021-5-18 10:24:03
comments: true
---

CheatSheet系列参考自[国外大神博客](https://cheatsheet.dennyzhang.com/cheatsheet-leetcode-a4)的备忘录博客系列，针对计算机领域多而复杂的工具和命令知识进行快速记录和索引，方便后续查找和使用。这里记录下我自己接触并使用到的命令知识，暂时内容较少不分页。
## 目录
[toc]  (github markdown toc keyword may not work~)

## 系统维护
|名称|命令|更多信息|
|---|---|---|
|命令行别名|`alias ll='ls -l'`|[link](https://wangchujiang.com/linux-command/c/alias.html)|
|文件磁盘占用递增排序|`du -sh ./* \| sort -h`|[link](https://wangchujiang.com/linux-command/c/du.html)|

## 微服务 
|名称|命令|更多信息|
|---|---|---|
|consul主动踢出服务|`http://{consulHost}:{consulPort}/v1/agent/service/deregister/{serviceId}`||
