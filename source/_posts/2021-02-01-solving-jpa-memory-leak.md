---
layout: post
title: 记录JPA的findIn语句导致的内存泄漏问题排查过程
description: JPA使用了Hibernate框架，用起来方便，但是迷惑行为也比较多
tags:
- java
- spring
- jpa
- hibernate
- memory leak
date: 2021-02-01 12:10:47
comments: true
---

## 问题定位
### 查看内存使用情况
使用`jps`先获取到服务的进程号，然后查看其当前的内存情况
```shell
$ jmap -heap 112968
Attaching to process ID 112968, please wait...
Debugger attached successfully.
Server compiler detected.
JVM version is 25.131-b11

using thread-local object allocation.
Parallel GC with 43 thread(s)

Heap Configuration:
   MinHeapFreeRatio         = 0
   MaxHeapFreeRatio         = 100
   MaxHeapSize              = 2147483648 (2048.0MB)
   NewSize                  = 715653120 (682.5MB)
   MaxNewSize               = 715653120 (682.5MB)
   OldSize                  = 1431830528 (1365.5MB)
   NewRatio                 = 2
   SurvivorRatio            = 8
   MetaspaceSize            = 21807104 (20.796875MB)
   CompressedClassSpaceSize = 1073741824 (1024.0MB)
   MaxMetaspaceSize         = 17592186044415 MB
   G1HeapRegionSize         = 0 (0.0MB)

Heap Usage:
PS Young Generation
Eden Space:
   capacity = 551026688 (525.5MB)
   used     = 518816080 (494.7815704345703MB)
   free     = 32210608 (30.718429565429688MB)
   94.15443776109807% used
From Space:
   capacity = 83886080 (80.0MB)
   used     = 0 (0.0MB)
   free     = 83886080 (80.0MB)
   0.0% used
To Space:
   capacity = 80740352 (77.0MB)
   used     = 0 (0.0MB)
   free     = 80740352 (77.0MB)
   0.0% used
PS Old Generation
   capacity = 1431830528 (1365.5MB)
   used     = 1431445640 (1365.132942199707MB)
   free     = 384888 (0.36705780029296875MB)
   99.97311916511951% used

47236 interned Strings occupying 4971728 bytes.
```
发现新生代和老年代的内存都占满了，程序存在内存泄漏问题；使用`jmap`查看占用内存最大的20个类，
```shell
jmap -histo:live 112968|head -20

 num     #instances         #bytes  class name
----------------------------------------------
   1:       6046666      299242256  [C
   2:       9032034      289025088  java.util.HashMap$Node
   3:       4528820      217383360  org.hibernate.hql.internal.ast.tree.Node
   4:      10672868      170765888  java.lang.Integer
   5:       2355402      161978488  [Ljava.lang.Object;
   6:       6043611      145046664  java.lang.String
   7:       2249013      143936832  org.hibernate.hql.internal.ast.tree.ParameterNode
   8:       2249006       71968192  org.hibernate.engine.query.spi.OrdinalParameterDescriptor
   9:       2249006       71968192  org.hibernate.param.PositionalParameterSpecification
  10:         41596       69191408  [Ljava.util.HashMap$Node;
  11:       2440587       58574088  java.util.ArrayList
  12:       2265154       55649696  [I
  13:       2249006       53976144  org.hibernate.hql.internal.ast.PositionalParameterInformationImpl
  14:       1232254       19716064  org.hibernate.loader.custom.sql.NamedParamBinder
  15:         93637        5243672  java.util.LinkedHashMap
  16:        162597        5203104  java.util.concurrent.ConcurrentHashMap$Node
  17:         49030        4314640  java.lang.reflect.Method
  ```
  可以初步看出是hibernate相关业务即数据库操作时发现了泄漏，但暂时无法看出是具体是哪个业务,将当前堆栈转储下，待使用内存分析工具来辅助分析
  ```shell
  $ jmap -dump:format=b,file=heapdump.phrof 112968
  ```
  dump-options主要有：

* live 只dump存活的对象，如果不加则会dump所有对象
* format=b 表示以二进制格式
* file=filepath 输出到某个文件中  
此命令把java堆中的对象dump到本地文件，然后使用第三方工具进行分析，如MAT，JProfile,IBM的分析工具等，我使用了**JProfile**工具来分析该dump  

### 分析内存dump
使用JProfile打开内存快照
![jprofile1](/img/java/jprofile1.png)
等待程序载入并分析dump文件后，查看到占用内存最大的对象是`org.hibernate.internal.SessionFactoryImpl`
![jprofile2](/img/java/jprofile2.png)
深入查看此对象
![jprofile3](/img/java/jprofile3.png)
发现所有内存都被`QueryPlanCache`占用，通过内部的`BoundedConcurrentHashMap`存放缓存对象，并且，所有的缓存对象执行的sql都为`in`类型的语句，如：
```sql
select i from oe.workflow.entity.WorkflowBinding i where i.processId in (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)
```
### 问题原因
首先通过代码走读调用该sql的相关业务，未能发现有任何泄漏的风险，然后通过google搜索问题，发现这是个已知问题，问题原因可见[stackflow的解答](https://stackoverflow.com/questions/31557076/spring-hibernate-query-plan-cache-memory-usage)。  
原因是hibernate会缓存生成的sql语句，这样的机制在通常场景下可以提高查询效率，但是当涉及in语句时，可能会带来问题；由于in语句中参数列表的个数是不确定的，所以缓存对象会随着in语句参数个数的不同而增加，例如in6000个参数与in60001个参数是两个不同的sql，因此会缓存两次。
### 解决方法
#### Hibernate版本小于5.3.0 
通过配置文件减小`QueryPlanCache`内部缓存的大小
```yaml
spring:
  jpa:
    properties:
      hibernate:
        query:
          plan_cache_max_size: 64
          plan_parameter_metadata_max_size: 32
```
#### Hibernate版本大于等于5.3.0
hibernate对该问题进行了优化，将in语句参数的个数按log2来划分区间，如参数个数为5,6,7的语句使用参数个数为8的in语句，复用执行过程，减少缓存数量。通过以下配置来使用该特性
```yaml
spring:
  jpa:
    properties:
      hibernate:
        query:
          in_clause_parameter_padding: true
```
更多介绍参见[其他博客](https://vladmihalcea.com/improve-statement-caching-efficiency-in-clause-parameter-padding/)


