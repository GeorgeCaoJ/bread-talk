---
layout: post
title: java代码中调用shell脚本无效或线程挂起问题
description: 记录java中调用shell脚本或线程挂起的原因和解决方法
tags:
- java
- shell
- linux
date: 2020-12-07 17:36:21
comments: true
---

## shell脚本的调用方式
Java中调用shell脚本可以用[ProcessBuilder.start()](https://docs.oracle.com/javase/8/docs/api/java/lang/ProcessBuilder.html)或[Runtime.exec](https://docs.oracle.com/javase/8/docs/api/java/lang/Runtime.html),目前官方推荐是使用[ProcessBuilder.start()](https://docs.oracle.com/javase/8/docs/api/java/lang/ProcessBuilder.html)
> As of 1.5, ProcessBuilder.start() is the preferred way to create a Process.

使用`ProcessBuilder.start()`的简单示例：
```java
ProcessBuilder pb = new ProcessBuilder("/bin/bash", "myShellScript.sh", "myArg1", "myArg2");
Map<String, String> env = pb.environment();
env.put("VAR1", "myValue");
env.remove("OTHERVAR");
env.put("VAR2", env.get("VAR1") + "suffix");
pb.directory(new File("myDir"));
try{
    Process p = pb.start();
    p.waitFor();
} catch (IOException | InterruptedException e) {
    e.printStackTrace();
}
```
## 调用问题及原因
1. 脚本调用无效
   
[原因](https://stackoverflow.com/questions/25647806/running-shell-script-from-external-directory-no-such-file-or-directory):脚本本身无运行权限，`ProcessBuilder.start()`需要通过`/bin/bash`来调用脚本

1. 线程挂起不退出  

现象：接口无返回，线程未退出，通过`ps`命令查看到子进程命令行参数正确，但是进程常驻，挂起未退出
![img1](/img/java/java-run-shell-1.jpg)
可以看到子进程的脚本中运行的程序停留在了`pipe_w`状态，这里的w指wait，表明该进程在操作管道通信的时候发生了挂起

原因:`ProcessBuilder.start()`默认创建的`Process`，其标准IO（标准输入stdin-0、标准输出stdout-1、标准错误stderr-2）会通过管道的方式重定向到父进程，容易造成死锁（父进程在等待子进程退出，子进程在等待父进程接收它的输出，若父进程缓冲区满或未处理子进程的输入，则会导致死锁，这就是我调用后接口无返回，线程挂起的原因），具体原因和分析参见[博客](https://blog.csdn.net/sj13051180/article/details/47865803)  
解决方法：  
1. 重定向子线程的标准IO,其具体方式可以通过操作`Process`对象或者直接使用命令行重定向到特殊文件
2. 父线程接收并处理子线程的输出，若子线程输出数据过大，需要创建单独的子线程处理子进程的输出，以避免死锁情况。  

我并不关心脚本是输出，因此将脚本的标准输出和标准错误重定向到特殊文件`/dev/null 2>&1`，直接抛弃脚本的输出信息
```java
ProcessBuilder pb = new ProcessBuilder("/bin/bash", "myShellScript.sh", "myArg1", "myArg2", ">dev/null 2>&1");
```
正常情况下，脚本中调用其他脚本，其标准IO会继承父进程的设置，但我实际测试中，脚本中也调用了其他人编写三方程序，其标准IO也需要重定向，否则依然会挂起，猜测可能是这个三方程序的IO未继承父进程的IO,需单独指定。
![img2](/img/java/java-run-shell-2.jpg)
## 知识点补充
`>/dev/null 2>&1`  
这里`/dev/null`完整表述是`1>/dev/null`指将标准输出（stdout-1）重定向，`2>&1`指将标准错误（stderr-2）重定向到标准输出，因此这个表达式最后其实是将标准输出和标准错误都重定向到一个特殊的文件,这个文件的作用是接收输入数据并将其丢弃，相当于垃圾桶。