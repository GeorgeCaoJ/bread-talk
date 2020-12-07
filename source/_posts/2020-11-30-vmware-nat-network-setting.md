---
layout: post
title: VMWare NAT网络设置
description: 设置虚拟机网络以实现虚拟机通过宿主机网络来访问外部网络
tags:
- VMWare
- NAT
date: 2020-11-30 15:39:00
comments: true
--

1. 虚拟机网络选择使用NAT模式
![vm-nat1.jpg](/img/tools/vm-nat1.jpg)

2. 设置本地网络适配器VMnet8
先查看本地NAT网络适配器VMnet8的子网IP,进入**编辑->虚拟网络编辑器**中查看到VMnet8对应的子网ip为192.168.38.0
![vm-nat2.jpg](/img/tools/vm-nat2.jpg)
PS:此处取消勾选通过DHCP方式分配IP给虚拟机，后续虚拟机使用静态IP方式配置网络。

3. 手动指定VMnet8的本机地址
在192.168.38.x中选择未被使用的一个ip，此处使用192.168.38.1作为本机地址
![vm-nat3.jpg](/img/tools/vm-nat3.jpg)

4. 设置虚拟机静态ip访问
使用`ifconfig`可查看当前网络配置，编辑其中非回环网络的配置项，增加以下配置
![vm-nat4.jpg](/img/tools/vm-nat4.jpg)
此处`ONBOOT`必须为yes，标识启用此网络，新增后面`IPADDR`和`GATEWAY`的配置，虚拟机的ip地址选择闲置的ip，192.168.38.1被宿主机已经使用，192.168.38.2为网关地址，因此选项192.168.38.3为虚拟机ip。配置完成后重启网络服务以启用修改`service network restart`

5. 设置DNS服务器
通过ping能访问局域网内的地址，但是ping bing.com时系统返回unknown host，通过配置域名服务器来解决
```shell
$ vim /etc/resolv.conf
nameserver 10.1.7.97
```