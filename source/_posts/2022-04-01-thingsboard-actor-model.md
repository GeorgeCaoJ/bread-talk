---
layout: post
title: ThingsBoard规则引擎探究和学习
tags:
- ThingsBoard
- distributed system
- IoT
date: 2022-04-01 21:00:00
comments: true
---
## 什么是Actor模型
探究ThingsBoard之前，需要先了解Actor（演员）模型：
>在电脑科学中，演员模型（英语：Actor model）是一种并发运算上的模型。“演员”是一种程序上的抽象概念，被视为并发运算的基本单元：当一个演员接收到一则消息，它可以做出一些决策、创建更多的演员、发送更多的消息、决定要如何回答接下来的消息。演员可以修改它们自己的私有状态，但是只能通过消息间接的相互影响（避免了基于锁的同步)      -- [wikipedia](https://www.wikiwand.com/zh-sg/%E6%BC%94%E5%91%98%E6%A8%A1%E5%9E%8B)  

在函数方法执行模式上，该模型与传统的面向对象的OOP模型不同。  
OOP中方法调用是通过线程在不同对象的方法中进栈和出栈实现的，如下图：
![单线程方法调用](/img/java/thread_call_stack.png)  
对象涉及多线程调用时，就需要使用锁机制，避免单个对象的内在状态同时被多个线程修改而引发逻辑异常，未获取锁的线程就处于阻塞状态，浪费了系统资源，如下图：
![多线程方法调用](/img/java/multi_thread_call_stack.png)  
<!-- more -->
actor模型引入了acotr单元的概念，每个actor又通过mailbox邮箱机制进行消息通信，同一时间，actor只能处理一个消息，就不存在多线程竞争。  
以饭馆作为例子，传统的线程执行模型类似于一个人（线程）从洗菜-烧菜-出菜都是顺序的一步步执行的，而actor模型类似于将洗菜，烧菜，出菜都独立成一个actor，各自通过查看mailbox中是否有任务消息;洗菜actor接收到洗菜任务的消息后，执行洗菜，完成后将洗好菜的消息传递出去。每个actor的执行都是从线程池中的多个线程来执行的。如下图所示：
![饭馆actor模型示意](/img/java/cooking.png)
同一时间，actor只会存在一个线程来消费一个消息，每个actor都会对自己的邮箱进行轮询然后处理任务，可以改变其自身状态、发送新的消息或产生新的actor,因此actor节点中的逻辑都是单线程的，天然就有状态隔离和线程安全的优点，但是整个系统是多线程进行并发协同共同完成了一个业务的处理，这就提高了系统的并发能力，避免锁竞争的资源消耗。这样的执行模型方便进行分布式集群扩展，一个业务处理不一定是在单个机器中进完成，而是可以分发到多台机器，通过远程RPC调用，只要发送到对应的actor邮箱即可实现集群的并发计算。因此著名的分布式计算引擎[Flink](https://nightlies.apache.org/flink/flink-docs-master/zh/)0.9版本开始引入[akka](https://akka.io/)框架，利用了akka实现的actor模型，来实现了分布式通信。  
关于Actor模型，可以参考其他资料：  
[The actor model in 10 minutes](https://www.brianstorti.com/the-actor-model/)  
[Akka and Actors](https://cwiki.apache.org/confluence/display/FLINK/Akka+and+Actors)  
[How the Actor Model Meets the Needs of Modern, Distributed Systems](https://doc.akka.io/docs/akka/current/typed/guide/actors-intro.html)  

## ThingsBoard中actor模型
ThingsBoard(https://thingsboard.io/)是一个开源物联网平台，工程产品化程度的较高，支持了多租户管理，其内部是通过Actor模型实现了高性能的处理架构，核心actor如下：
![ThingsBoard的Actor架构](/img/java/tb_actor.png)
App Actor: 系统actor，负责管理租户actor，常驻内存  
Tenant Actor: 租户actor，服务于对应租户,负责管理设备actor和规则actor  
Device Actor: 设备actor，维护设备的状态，活动的Sessions, 订阅, 侦听RPC命令等  
Rule Chain Actor: 规则链actor, 负责规则引擎的某个规则链
Rule Node Actor: 规则节点actor，负责规则引擎中某个逻辑节点    
一个ThingsBoard实例只存在一个App actor，负责产生和管理多个租户actor，每个租户actor又会产生多个该租户下的设备Actor和规则actor，它们的层级结构如下：
![Actor层级结构](/img/java/tb_actor_brain.png)

## ThingsBoard的规则引擎如何运行
这里我重点研究下ThingsBoard的规则引擎，它是如何执行运作的。 




