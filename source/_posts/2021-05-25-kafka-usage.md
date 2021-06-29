---
layout: post
title: 
description: kafka知识点归档
tags:
- kafka
- zookeeper
- docker
date: 2021-5-25 10:44:12
comments: true
---

## 环境搭建
使用docker搭建单机环境,包括kafka，zookeeper,kafka-manager，环境要求：  
1. docker  
2. docker-compose  
`docker-compose.yml`如下:  
```yml
version: '2'
services:
  zookeeper:
    image: zookeeper
    ports:
      - "2181:2181"
  kafka:
    image: wurstmeister/kafka:2.12-2.4.1
    ports:
      - "9092:9092"
    environment:
      DOCKER_API_VERSION: 1.22
      KAFKA_ADVERTISED_HOST_NAME: 10.41.163.131
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
  kafka-manager:
    image: kafkamanager/kafka-manager
    ports:
      - "9000:9000"
    environment:
      ZK_HOSTS: zookeeper:2181
```
容器运气成功后，通过访问kafka-manager的页面`http://server:9000`添加kafka节点，即可查看当前单机节点的运行状态