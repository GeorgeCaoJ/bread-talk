---
layout: post
title: IDEA中JRebel代码调试插件的使用方法及其原理初探
description: 使用JRebel插件工具实现代码的本地/远程热部署,调过构建部署重启的步骤，可大大加快开发调试的效率
tags:
- JRebel
- java
- idea
- debug
date: 2020-5-22 09:52:51
comments: true
---

## 代码调试的痛点
调试C++的代码时，顺序肯定是代码修改-代码编译-重启运行。C++的可执行程序都是二进制的机器码，依赖于编译的平台和环境，不同编译平台的程序无法做到兼容，每次修改都要经历这么个过程。因此C++代码调试起来，重复得在编译和重启的过程浪费时间，调试效率受限。而对比java，其编译成果物是.class的字节码，实际运行是通过对应平台的java虚拟机对字节码进行解释运行的。因此java程序在运行中，可以通过修改其字节码，实现java程序的动态修改。因此，java开发的领域就涌现了热部署（HotSwap)的技术，主要是对class文件监控，有修改则动态加载到jvm，实时改变代码行为，避免重启应用。但是当前的官方的HotSwap技术有其局限性，JRebel在其基础上进行了优化。

## JRebel是什么
> Reload Code Changes Instantly With JRebel  
> 
[JRebel](https://www.jrebel.com/products/jrebel)的广告宣传语简明扼要，描述了它最直接的用途，就是用来加载新代码,避免重新启动服务来使代码生效，跳过部署-重启（少数情况还是需要重启才能生效）的过程，提高代码调试的效率。  
JRebel是一个款商业插件，可大大提高代码调试的效率，因此有条件的可以购买授权，没条件可以自建注册服务器来伪造授权，具体可以参见[gitee](https://gitee.com/gsls200808/JrebelLicenseServerforJava)。
安装激活后可在IDEA是Settings面板查看到插件的信息，并在工具栏出现了JRebel的启动器图标
![setting](/img/jrebel/setting.jpg)

## JRebel怎么用
### 本地热部署
启用JRebel的本地热部署功能很简单，打开Jrebel的Panel视图，勾选当前模块启用本地热部署功能。然后，使用JRebel的启动器启动项目
![tool](/img/jrebel/tool.jpg)
启动成功后，JRebel打印日志如下，可见其监控的是该项目的class编译目录，一旦发现.class文件有修改，就热部署到当前的JVM中
```
2020-05-21 21:48:52 JRebel: Directory 'E:\CodeExercise\jrebel\target\classes' will be monitored for changes.
```
在运行中的服务，尝试修改代码，然后触发编译构建（可手动build project,快捷键CTRL+F9)，构建完成后，JRebel会自动加载修改的代码.class文件，部署到已运行的服务中，实现代码直接更新的效果
```
2020-05-21 22:27:58 JRebel: Reloading class 'com.example.jrebel.demo.controller.StudentController'.
2020-05-21 22:27:58 JRebel: Reconfiguring bean 'studentController' [com.example.jrebel.demo.controller.StudentController]
```

### 本地+远程同步热部署
实现本地热部署往往不够，希望远程的测试环境也能及时更新本地代码，这样其他同事在测试环境联调发现问题时能快速响应并修复，大大提高联调测试的效率。  
JRebel实现远程热部署的方式对原有代码没有侵入性，只需要将一个配置文件打包到原有的成果物中，然后启动时使用JReble的插件库一同启动，具体步骤如下：
#### 本地IDE中启用远程部署功能
![remote1](/img/jrebel/remote1.jpg)
勾选后，会在本地项目目录的resources文件下生成一个`jrebel-remote.xml`文件，此文件会在打包时一起打包进jar包中，该文件的内容如下
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rebel-remote xmlns="http://www.zeroturnaround.com/rebel/remote">
    <id>com.example.jrebel.demo</id>
</rebel-remote>
```
其中生成的id即该jar包的坐标,对应的项目pom定义如下：
```xml
<groupId>com.example.jrebel</groupId>
<artifactId>demo</artifactId>
```

#### 加载JRebel插件的方式启动远程服务
将包含`jrebel-remote.xml`文件的jar包部署到远程服务器，然后将`jrebel.jar`和`libjrebel64.so`（32位系统选择`libjrebel32.so`,windows平台也有对应的dll）两个插件库一同部署到远程目录，此两个插件库可以从本机IDEA的插件配置目录找到，如我本机的路径是`C:\Users\george\.IntelliJIdea2019.3\config\plugins\jr-ide-idea\lib\jrebel6\lib`  
远程目录如下：
```sh
.
- jrebel.jar
- libjrebel64.so
- target
    - demo-0.0.1-SNAPSHOT.jar
```

部署成功后，用以下命令加载插件并启动服务,`remoting_port`参数用于指定远程JRebel调试端口，来同步本地IDE的class变更信息，远程JRebel接收后即可进行代码的热部署。若同时部署多个服务，需要指定不同的端口，避免端口冲突
```sh
 java -agentpath:/home/george/jrebel/libjrebel64.so -Drebel.remoting_plugin=true -Drebel.remoting_port=10340 -jar /home/george/jrebel/target/demo-0.0.1-SNAPSHOT.jar

```

服务启动后，可见其日志如下为成功启动
```sh
[george@centos target]$ java -agentpath:/home/george/jrebel/libjrebel64.so -Drebel.remoting_plugin=true -Drebel.remoting_port=10340 -jar /home/george/jrebel/target/demo-0.0.1-SNAPSHOT.jar
May 21, 2020 11:06:45 PM java.util.prefs.FileSystemPreferences$1 run
INFO: Created user preferences directory.
2020-05-21 23:06:53 JRebel:  Starting logging to file: /home/george/.jrebel/jrebel.log
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel:  #############################################################
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel:  JRebel Agent 2020.2.0 (202003201446)
2020-05-21 23:06:53 JRebel:  (c) Copyright 2007-2020 Perforce Software, Inc.
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel:  Over the last 1 days JRebel prevented
2020-05-21 23:06:53 JRebel:  at least 0 redeploys/restarts saving you about 0 hours.
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel:  JRebel started in remote server mode.
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel:  #############################################################
2020-05-21 23:06:53 JRebel:  
2020-05-21 23:06:53 JRebel: Starting embedded remoting on port 10340.
2020-05-21 23:06:53.798:INFO::Logging to STDERR via com.zeroturnaround.jrebel.bundled.org.mortbay.log.e
2020-05-21 23:06:53.799:INFO::jetty-202003201446
2020-05-21 23:06:53 JRebel: Embedded remoting started successfully with '0.0.0.0:10340'.

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::        (v2.2.6.RELEASE)

2020-05-21 23:06:56.089  INFO 84378 --- [           main] com.example.jrebel.demo.DemoApplication  : Starting DemoApplication v0.0.1-SNAPSHOT on HikvisionOS with PID 84378 (/home/george/jrebel/target/demo-0.0.1-SNAPSHOT.jar started by george in /home/george/jrebel/target)
2020-05-21 23:06:56.094  INFO 84378 --- [           main] com.example.jrebel.demo.DemoApplication  : No active profile set, falling back to default profiles: default

.....
```

#### 配置本地IDEA JRebel服务信息实现本地与远程的通信

![remote-server](/img/jrebel/remote-server.jpg)
在JRebel的远程服务器配置页面添加对应的远程服务其IP和`remoting_port`（多个服务要配置多个服务器信息），测试连接成功（远程应用启动改端口可以加上用户认证，但自己测试的话直接省略认证了）。添加完成后，确保下方的`Synchronize on build`功能勾选上，同时本地和远程的JRebel调试确认勾选，之后每次本地代码更新构建后会自动触发同步到远程服务器。

## 缺点
JRebel并不能对所有情况下修改的代码热部署生效，遇到未生效的情况，也不可避免需要重新部署和重启服务，IDEA自带的部署和SSH通信功能也可大大提高部署效率，详情可参见我另一篇[博客](https://bread-whisper.now.sh/2020/05/21/ftp-and-ssh-used-in-idea/)
## 总结
以上即IDEA中使用JRebel的进行本地和远程热部署的步骤，JRebel可以大大加快debug速度，即时发现即时修复，减少了编译构建、部署、重启的时间。