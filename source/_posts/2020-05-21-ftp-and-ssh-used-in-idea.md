---
layout: post
title: 在IDEA中使用FTP和SSH进行远程部署教程
description: 有效利用IDEA自带的FTP和SSH工具进行远程部署
tags:
- linux
- ftp
- centos
- idea
- ssh
- java
- debug
date: 2020-5-21 15:00:27
comments: true
---

## 开发测试的常见场景
在后端接口开发完成并自测验证ok后，功能进入联调阶段，通常是将服务部署至测试环境，让前端同事直接连接测试环境进行接口联调，这样的好处的可以不阻塞本地继续开发下个功能。但是联调测试不可避免会发现各种接口bug，需要及时更新和修复，更新测试环境服务有多种方式：  
* CI/CD服务平台，直接构建并部署到测试环境
* maven工具实现远程部署
* 通过FTP和SSH方式换包重启进行更新部署
* [JRebel](https://www.jrebel.com/products/jrebel)三方辅助工具实现代码热部署,详情见我其他[博客](https://bread-whisper.now.sh/2020/05/22/debug-with-jrebel/)

本文主要介绍使用IDEA自带的工具，通过FTP和SSH方式换包重启进行更新部署,及时修复测试环境bug，提高联调测试效率。

## FTP服务安装和配置
首先需要确保远程服务器已安装FTP服务,未安装则需要进行以下的安装和配置过程
```sh
vsftpd -v
```

新增用户用于ssh和ftp登录
```sh
$ sudo useradd george
$ sudo passwd george
```

安装ftp服务器程序
```sh
$ sudo yum install vsftpd
```
安装成功后可以查看已经运行，并使用`vsftpd.conf`

```sh
$ ps aux | grep vsftpd
root      61486  0.0  0.0  53256   576 ?        Ss   15:23   0:00 /usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf
```

ftp的配置文件目录中包含其他文件，在修改`vsftpd.conf1`先进行备份原始配置
```sh
$ ll /etc/vsftpd
total 28
-rw------- 1 root root  125 Apr  1 12:55 ftpusers
-rw------- 1 root root  368 May 21 15:50 user_list
-rw------- 1 root root 5133 May 21 15:54 vsftpd.conf
-rw------- 1 root root 5116 May 21 15:32 vsftpd.conf.backup
-rwxr--r-- 1 root root  338 Apr  1 12:55 vsftpd_conf_migrate.sh
```
`user_lsit`是ftp用户白名单列表，将新用户名添加至末尾，允许此用户登录ftp服务器，然后在`vsftpd.conf`配置文件最后启用此白名单文件
```sh
# This directive enables listening on IPv6 sockets. By default, listening
# on the IPv6 "any" address (::) will accept connections from both IPv6
# and IPv4 clients. It is not necessary to listen on *both* IPv4 and IPv6
# sockets. If you want that (perhaps because you want to listen on specific
# addresses) then you must run two copies of vsftpd with two configuration
# files.
# Make sure, that one of the listen options is commented !!
listen_ipv6=YES

pam_service_name=vsftpd
userlist_enable=YES
tcp_wrappers=YES
userlist_deny=NO # 启动白名单文件
```
至此，新用户可以通过ssh和ftp来与服务器通信

## IDEA中配置FTP服务器
进入IDEA的`Tools->Deplyment->configuration`菜单
![deploy1](/img/idea/deploy1.jpg)

配置FTP服务器信息,types选择`FTP`
![ftp](/img/idea/ftp.jpg)

FTP配置中增加项目与服务器目录路径的映射
![ftp-mapping](/img/idea/ftp-mapping.jpg)

配置完成后即可将当前项目的任何文件通过IDEA自带的工具同步到服务器，特别是本地打包的jar包，直接部署到服务器
![deploy-jar](/img/idea/deploy-jar.jpg)
IDEA日志显示上传成功
```sh
[2020/5/21 16:44] Upload to 105-ftp
[2020/5/21 16:44] Upload file 'E:\CodeExercise\jrebel\target\demo-0.0.1-SNAPSHOT.jar' to '/home/george/jrebel/target/demo-0.0.1-SNAPSHOT.jar'
[2020/5/21 16:44] Upload to 105-ftp completed in 425 ms: 1 file transferred (42.6 Mbit/s)
```
至此，最新的开发的jar已上传至服务器，下面通过IDEA自带的SSH工具，手动启动该服务

## IDEA通过SSH访问服务器
有两种方式添加SSH连接信息
1. 通过菜单栏`Tools->Start SSH Session...->Edit credentials`
![ssh1](/img/idea/SSH1.jpg)

2.与FTP服务器配置相同，进入IDEA的`Tools->Deplyment->configuration`菜单, types选择`SFTP`,配置SSH的连接信息

![ssh2](/img/idea/ssh-connection.jpg)

配置完成即可通过`Tools->Start SSH Session...`选择对应的SSH连接，访问服务器，然后通过命令行启动jar服务
![start service](/img/idea/start-service.jpg)

## 总结
直接通过IDEA自带工具，实现远程部署和服务器控制，避免切换外部工具，如xshell，可加快调试部署效率。