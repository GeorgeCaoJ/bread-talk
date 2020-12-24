---
layout: post
title: 多台服务器通过docker部署consul集群
description: 使用docker compose工具部署consul
tags:
- docker
- consul
date: 2020-12-23 22:28:21
comments: true
---

## 同台服务器consul集群
consul docker节点都在相同服务器，通过docker网桥模式默认连接，需要组成集群的前提是知道对方的ip地址，由于docker默认创建的网关无法固定ip，因此通过自定义的网关，让两个consul server节点同时部署在相同网关内，同时固定各自的ip，然后join对方的ip，这样即可让本机的两个server节点选举leader组成集群，测试的docker-compose.yml如下:

```yml
version: "3.8"

services:
  consul-1:
    image: docker/consul
    command: consul agent -server -bootstrap-expect 2 -data-dir /tmp/consul -node node1 -bind 172.19.0.2 -retry-join 172.19.0.3 -datacenter dc -client=0.0.0.0 -ui
    ports:
      - "8500:8500" # 只开放8500端口让我们从ui页面看到集群节点，其他8301,8302等端口无需开放，因为同一个网段内，因此直接可以访问对方的端口
  networks:
      consul-net:
        ipv4_address: 172.19.0.2

  consul-2:
    image: docker/consul
    command: consul agent -server -bootstrap-expect 2 -data-dir /tmp/consul -node node2 -bind 172.19.0.3 -retry-join 172.19.0.2 -datacenter dc -client=0.0.0.0 -ui
    networks:
      consul-net:
        ipv4_address: 172.19.0.3

networks:
  consul-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.19.0.0/16

```
## 多台服务器consul集群
多台服务consul集群时与在单台服务有许多地方需要注意：
1. 每台服务器都需要暴露端口给对方，进行集群的必要通信和协商，其中8301和8302的tcp和udp都需要开放  
2. 需要将本机的ip指定advertise    
以上两个条件不满足，可能会出现我遇到的`memberlist: Suspect <name> has failed, no acks received`[错误](https://github.com/hashicorp/consul/issues/953)  
服务器1的ip：10.2.145.183的docker-compose.yml
```yml
version: '3.8'
services:
  consul:
    image: docker/consul
    command: consul agent -server -bootstrap-expect 2 -data-dir /tmp/consul -node 10.2.145.183 -advertise 10.2.145.183 -retry-join 10.2.145.182 -datacenter dc -client=0.0.0.0 -ui
    restart: always
    ports:
      - "8500:8500"
      - "8600:8600"
      - "8300:8300"
      - "8400:8400"
      - "8301:8301/tcp"
      - "8302:8302/tcp"
      - "8301:8301/udp"
      - "8302:8302/udp"
    networks:
      - consul-net
networks:
  consul-net:
```

服务器2的ip：10.2.145.182的docker-compose.yml 
```yml
version: "3.8"

services:
  consul:
    image: docker/consul
    command: consul agent -server -bootstrap-expect 2 -data-dir /tmp/consul -node 10.2.145.182 -advertise 10.2.145.182 -retry-join 10.2.145.183 -datacenter iot -client=0.0.0.0 -ui
    ports:
      - "8500:8500"
      - "8600:8600"
      - "8300:8300"
      - "8400:8400"
      - "8301:8301/tcp"
      - "8302:8302/tcp"
      - "8301:8301/udp"
      - "8302:8302/udp"
    networks:
      - consul-net

networks:
  consul-net:
    driver: bridge
```
