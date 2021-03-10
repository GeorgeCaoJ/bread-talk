---
layout: post
title: Docker部署yapi框架
description: 使用阿里云公开的yapi镜像进行部署
tags:
- docker
- yapi
date: 2021-3-10 20:34:11
comments: true
---

## 安装过程

1. 安装并启动MongoDB
```shell
docker run -d -p 27017:27017 --name mongo-yapi mongo
```

2. 获取 Yapi 镜像，版本信息可在 阿里云镜像仓库 查看
```shell
docker pull registry.cn-hangzhou.aliyuncs.com/anoy/yapi
```

3. 初始化 Yapi 数据库索引及管理员账号
```shell
docker run -it --rm \
  --link mongo-yapi:mongo \
  --entrypoint npm \
  --workdir /api/vendors \
  registry.cn-hangzhou.aliyuncs.com/anoy/yapi \
  run install-server
```

4. 启动 Yapi 服务
```shell
docker run -d \
  --name yapi \
  --link mongo-yapi:mongo \
  --workdir /api/vendors \
  -p 3000:3000 \
  registry.cn-hangzhou.aliyuncs.com/anoy/yapi \
  server/app.js
```

使用 Yapi访问 http://localhost:3000   登录账号 admin@admin.com，密码 ymfe.org

> 以上大部分内容搬运自[知乎](https://zhuanlan.zhihu.com/p/276312100),仅以我实际部署情况修改个别参数，此处仅仅做备份记录