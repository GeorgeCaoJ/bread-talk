---
layout: post
title: 科学上网-v2ray-plugin协议混淆插件部署记录
tags:
- shadowsocks
- v2ray
- VPN
date: 2022-04-01 10:00:00
comments: true
---

声明：科学上网的目的是学习国外科学技术，不涉及任何违法活动
## 涉及工具
[v2ray](https://github.com/v2fly/v2ray-core): 开源的网络代理工具，类似于shadowsocks工具，仅用于学习国外科学技术。  
[v2ray-plugin](https://github.com/shadowsocks/v2ray-plugin): 流量混淆插件，类似于[simple-obfs](https://github.com/shadowsocks/simple-obfs)工具，目的是避免代理流量特征被识别而拦截,提高隐匿性。
## 技术原理
> 原始的基于Websocket的数据传输，特征非常明显：有大量数据传递是在Websocket协议包里。    
> 使用HTTP协议的数据传输：第一个包是HTTP协议包，后面的数据传递都是普通的TCP包。    
流量混淆伪装成HTTP：Websocket协议只用来协商必要的内容同步信息，真实的数据传递都是用普通的TCP包（看起来像是http协议在传递数据）
抓包查看到websocket协议的协商过程
```http
#----------------------------------REQUEST--------------------------------#
GET / HTTP/1.1
Host: bing.com
User-Agent: Go-http-client/1.1
Connection: Upgrade
Sec-WebSocket-Key: 9Hee2ejpy7tBnCcxXcGJNg==
Sec-WebSocket-Version: 13
Upgrade: websocket
#----------------------------------RESPONSE--------------------------------#
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: iQCxTMLlPjRMTJN36aAZ/IthOTE=
#----------------------------------REQUEST--------------------------------#
....Y...Y...X...Y...Y..q.$a.%..A."+Q....}...k...3...d
.....s.8....FE....u.b.....l..9..,...=..<(.I...%...z..~....]....g.......A...4.e.P..A...D.N..M6....0.2o...X.n.@'....@..S......N...d...3.@.#.,..K...L......+..r.I........N.\..3e.8...@..K+...{...
.......p...y.X.C-|.V..Th.4.Z@gM.
..vy7nr...9..$...!...R......e...7,...z<..oab.PEX^..`,...$.U...G#..8CY....=...R%.[..o......*yD.+..*.~|.ZqP..>V..'.J.\52v.qdo.r7a}_.\.5...=....y......EPX2..l-&./.`."[.4.
%....^.4.iy."=.G.a....I.8.......-.....DW>..8P.Q....%..B.........Nq......sDP..^.|#...
..za.E>.nT.....j.V.
```

## 部署架构
![v2ray-plugin](/img/tools/v2ray-plugin.png)
在原有ss-local和ss-server之间，通过插件进行流量混淆，混淆的动作是在obfs-local和obfs-server之间代理的，对于使用方是无感知的。  
通过抓包可以看到，obfs-local与obfs-server之间是先通过websocket形式
<!-- more -->
## 部署步骤
### 服务端
使用[v2ray](https://github.com/v2ray/v2ray-core)进行服务端部署，无需改变原有部署配置，对于ss-server端的透明的
配置文件如下：
```json
{
  "inbounds": [
    {
      "port": 16823,
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "b831e82d-6324-4d53-ad4f-8ada48b60811",
            "alterId": 64
          }
        ]
      }
    },
     {
      "port": 9999,
      "protocol": "shadowsocks",
      "settings": {
        "method": "aes-128-gcm",
        "ota": true,
        "password": "xxxxx"
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {}
    }
  ]
}
```
使用[v2ray-plugin](https://github.com/shadowsocks/v2ray-plugin)最新的release版本进行服务端部署，命令行如下
``` shell
/opt/v2ray-plugin_linux_amd64 -server -localAddr 10.0.0.1 -localPort 1985 -remotePort 16823
```
PS:  
 -server 服务端模式  
 -localAddr 绑定地址，使用网卡实际ip地址，内网服务器需要绑定内网ip而不是外网ip（公有云提供商的vps一般都是有内网机器和外网ip随机分配的）  
 -localPort 对外监听的端口，用于接收obfs-client的数据，因此需要在防火墙把开启这个端口  
 -remoteAddr 远程地址，默认127.0.0.1，这里想要的就是obfs-server出来的数据转到本机的ss-server  
 -remotePort 远程端口，这里想要的就是obfs-server出来的数据转到本机ss-server的vmess端口  
### 客户端
它是直接与obfs-server连接进行通信，因此它的远程端口为代理服务器的obfs-server监听端口；它的数据请求来源于ss-client,因此需要在本机监听一个端口，让ss-client来链接通信。命令行如下
``` shell
/opt/v2ray-plugin_linux_amd64 -localPort 1984 -remoteAddr 101.101.101.101 -remotePort 1985 -host bing.com
```
ps:  
 -localAddr 绑定地址，默认127.0.0.1，只接收本地ss-client的连接  
 -localPort 本地监听端口，用于接收obfs-client的数据  
 -remoteAddr 远程代理服务器地址  
 -remotePort 远程代理服务端口  
 -host 伪装的域名地址  
ss-client的改造主要是outbound，从原本直接指向代理服务器修改为指向本机obfs-client，配置文件如下
```json
{
    "log": {
        "loglevel": "warning"
    },
    "inbounds": [
        {
            "port": 1080,
            "listen": "xx.xx.xx.xx",
            "tag": "socks-inbound",
            "protocol": "socks",
            "settings": {
                "auth": "noauth"
            },
            "sniffing": {
                "enabled": true,
                "destOverride": [
                    "http",
                    "tls"
                ]
            }
        }
    ],
    "outbounds": [
        {
            "protocol": "vmess",
            "settings": {
                "vnext": [
                    {
                        "address": "127.0.0.1",
                        "port": 1984,
                        "users": [
                            {
                                "id": "b831e82d-6324-4d53-ad4f-8ada48b60811",
                                "alterId": 64
                            }
                        ]
                    }
                ]
            },
            "tag": "direct"
        }
    ]
}
```

## 参考阅读
更多详细配置如https代理可参考[科学上网2：shadowsocks+v2ray-plugin+TLS](https://huhao.ai/shadowsocks-v2ray-plugin-tls-cdn/)