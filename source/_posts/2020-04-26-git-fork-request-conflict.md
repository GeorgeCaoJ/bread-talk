---
layout: post
title: fork项目进行merge request到原项目时发生冲突的解决方法
description: 记录在使用gitlab进行merge request时发现与原项目冲突无法merge的解决方法
tags:
- git
- gitlab
date: 2020-4-26 14:09:40
comments: true
---

## 问题及解决思路
fork repo进行修改提交后，想提交到original repo，但是在merge request时被检测到了冲突，因此需要先将fork repo同步拉取orginal repo的更新，然后本地解决冲突后提交fork repo再请求merget request

### 拉取original repo的更新
按照[gist上分享的方法](https://gist.github.com/CristinaSolana/1885435)，成功拉取original repo的update
1. Clone your fork:
```bash
 git clone git@github.com:YOUR-USERNAME/YOUR-FORKED-REPO.git
 ```
2. Add remote from original repository in your forked repository:
```bash
cd into/cloned/fork-repo
git remote add upstream git://github.com/ORIGINAL-DEV-USERNAME/REPO-YOU-FORKED-FROM.git
git fetch upstream
```

3. Updating your fork from original repo to keep up with their changes:
```bash
git pull upstream master
```

### 解决本地fork repo的冲突并提交后再进行merge request
