---
layout: post
title:  使用VSCode进行远程开发
tags:
- vscode
date: 2022-11-30 16:07:00
comments: true
---

## 远程开发是什么

讲到远程开发之前先看下我们常见的本地开发，本地开发的流程一般为：本地IDE打开本地源码的工程项目，然后本地运行程序进行debug，开发完成后打包部署到目标服务器环境进行部署运行。  

本地开发模式对开发者极为方便，但会存在某些缺点和限制，如： 

* 本地环境与服务器环境存在差异，本地运行正常，但服务器运行出现异常的情况
* 本地环境性能受限，如本地开发环境硬件资源紧张，无法完整运行程序所需的解释器/虚拟机
* 本地环境无法满足程序在服务器环境执行的条件，如NodeJS v14及以上无法在Win7环境安装

相反，远程开发的模式，就是将源码工程文件、代码编译、程序debug和运行过程都在远程服务器进行，本地只通过代码编辑器来与远程服务器交互，实现本地开发，远程运行并调试的效果。因此具有本地资源占用小，程序的开发环境可以与部署环境一致的优点。

我尝试远程开发的原因是遇到开发一个web前端项目时，原有工程中依赖包所需NodeJS版本必须要v14及以后，然而我本机操作系统为Win7能安装的最高版本为v13，无法满足这个前端工程的开发环境要求。因此，采用远程开发的模式，将开发环境放在Linux服务器，本地可以直接绕过环境限制，并且获得了开发和部署使用相同操作系统环境的优势。

## VSCode配置远程开发

VSCode官方支持了[Remote SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)插件来满足远程开发的功能，其原理架构如下：

![arch](/img/tool/arch.png)

本地开发环境使用VSCode的基础编辑器功能，远程服务器包含实际的工程代码，工作区插件，本地通过SSH通信与远程服务器进行交互，实现本地开发远程修改和调试的目标。

### 系统要求

本地客户端：OpenSSH客户端（windows环境安装git客户端时会默认安装上）

远程服务器：

- x86_64 Debian 8+, Ubuntu 16.04+, CentOS / RHEL 7+.
- ARMv7l (AArch32) Raspberry Pi OS (previously called Raspbian) Stretch/9+ (32-bit).
- ARMv8l (AArch64) Ubuntu 18.04+ (64-bit).
- Windows 10 / Server 2016/2019 (1803+) using the [official OpenSSH Server](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse).
- macOS 10.14+ (Mojave) SSH hosts with [Remote Login enabled](https://support.apple.com/guide/mac-help/allow-a-remote-computer-to-access-your-mac-mchlp1066/mac).
- 1 GB RAM is required for remote hosts, but at least 2 GB RAM and a 2-core CPU is recommended.

更多细节见[官方文档](https://code.visualstudio.com/docs/remote/ssh)

### 具体步骤

1. 本机VSCode安装[Remote SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)插件(IDE内插件安装失败情况下，可以尝试在官网下载.vsix包离线安装)

2. 可选：配置插件，开启VSCode Server通过本机客户端传输安装（服务器网络无限制时可忽略此配置）。配置路径：打开[首选项]->[扩展]->[Remote - SSH] 找到`remote.SSH.localServerDownload`，设置为`always`。

  ![ssh-setting](/img/tool/ssh-setting.png)

  该配置作用是解决远程服务器无法直接访问[官方成果物地址](https://code.visualstudio.com/docs/remote/faq#_what-are-the-connectivity-requirements-for-vs-code-server)，导致的远程开发环境直接从官方地址下载相关库进行初始化时任务挂起异常，无法完成环境初始化的情况。其原理是通过本机VSCode客户端使用本地通畅的网络下载VSCode Server成果物然后`scp`到远程服务器进行环境初始化。

3. 服务器创建登录用户
    创建linux用户

  ```sh
  useradd <newuser>
  ```

  	设置密码
  ```sh
  passwd <newuser>
  ```

4. 本机VSCode设置远程SSH登录信息
    命令面板打开`Remote-SSH: Open SSH Configuration file..`，添加远程服务器信息

  ```ssh
  Host tom@10.41.2.79:2333
  
  Host george@10.41.2.79:2333
  ```

  	可以添加多个用户和服务器信息

5. 登录远程环境

   命令面板打开`Remote-SSH: Connet to host..`，输入用户密码登录后，等待VSCode的Server端在服务器自动配置完成即可

   ![host-init](/img/tool/host-init.png)


## 远程开发的使用技巧

1. 登录成功后，可以选择服务器上的工程文件夹，也可以直接clone仓库

   ![use-ssh-1](/img/tool/use-ssh-1.png)

2. web前端工程通过install相关依赖，完成工程初始化后即可开启正常的开发调试。

   此处示例中开启页面调试，工程配置了使用端口3000来访问

   ![use-ssh-2](/img/tool/use-ssh-2.png)

   本地VSCode自动开启了3001端口进行代理转发，因此本地浏览器访问`http://localhost:3001`即可查看实际运行在服务器端的web页面程序。

   ![use-ssh-3](/img/tool/use-ssh-3.png)

3. VSCode资源管理器中的文件都为远程环境文件，可以将本地文件直接拖拽到VSCode的目标文件夹实现复制本地文件到远程的功能



## 总结
尝试使用VSCode进行远程开发web前端工程，总体上配置简单，开发和debug体验上与本地开发基本一致，但是占用本地机器的资源少，实现了在Windows环境开发代码直接部署运行在Linux环境的程序，能大大减少因为操作系统环境差异带来的异常问题和环境配置工作，值得在C/C++，web等其他Linux程序开发的工程中应用。


