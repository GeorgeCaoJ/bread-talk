---
layout: post
title: Linux动态库链接与库版本管理
description: 探究linux环境下C/C++动态库链接方式及其多版本情况下的管理机制
tags:
- C
- CPP
- linux
date: 2020-03-01 12:34:56
comments: true
---

# 

## libssl.so与libssl.so.1与libssl.so.1.0.2k区别

openssl是我们常用的加解密公共库，但是在linux系统中，存在很多以libssl开头的动态库，存在即有意义，那他们的区别和作用是什么?首先需要理解linux中关于动态库名称的三个概念：**linkname**、**soname**和**realname**

### linkname - libssl.so

gcc编译动态库时需要指定链接动态库时使用的名称，通过gcc命令参数`-l<shared-lib-name>`,这里链接时使用的名称为去掉lib和.so的库名称，如libssl.so文件是在编译链接时使用，如下

```shell
$ gcc -g -o demo deomo.o -L. -lssl -Wl,-rpath,./
```

`-L.`指在当前目录下搜索链接的库
`-g`指开启调试模式，保留符号信息
`-Wl,-rpath,./`指程序加载动态库时优先在当前路径下搜索

### soname - libssl.so.1
经过编译链接后的demo运行时可能会提示缺少libssl.so.1（程序当前目录与系统库目录/lib,/lib64中都不存在此动态库文件)，导致程序无法运行。通过**ldd**命令可以查看程序依赖的库名称为libssl.so.1
```shell
$ ldd -r demo
	libssl.so.1 => not found
```
此处libssl.so.1即为soname，程序运行前动态库装载时会以此名称来搜索动态库；虽然在编译阶段是使用的libssl.so来进行链接的，但是程序ELF信息是使用soname来记录依赖关系的,通过**readelf**查看libssl.so文件的soname也为libssl.so.1
```shell
$ readelf -d libssl.so
	Dynamic section at offset 0x649a8 contains 25 entries:
      Tag        Type                         Name/Value
     0x0000000000000001 (NEEDED)             Shared library: [libcrypto.so.1.0.0]
     0x0000000000000001 (NEEDED)             Shared library: [libdl.so.2]
     0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
     0x000000000000000e (SONAME)             Library soname: [libssl.so.1]
     0x0000000000000010 (SYMBOLIC)           0x0
     0x000000000000000f (RPATH)              Library rpath: [./:./engines]
     0x000000000000000c (INIT)               0x18048
     .............

```
### realname - libssl.so.1.0.2k
操作系统中没有libssl.so.1的文件，只存在libssl.so.1.0.2k的动态库文件，通过**readelf**此文件是soname也为libssl.so.1，因此此文件可作为最终程序运行时加载的动态库文件使用。因此通过创建软链接，libssl.so.1软连接到libssl.so.1.0.2k后，程序加载动态库时便能成功加载运行。
```shell
$ ln -sf /lib64/libssl.so.1.0.2k /lib64/libssl.so.1
```
此处将软链接的文件放于系统库目录，demo程序在优先搜索当前目录后，查询失败会继续搜索系统库目录。
此处libssl.so.1.0.2k便为realname，此文件为最终程序加载的动态库文件，通过相同soname和不同realname即可实现linux下的库版本管理方式，结论见库版本管理章节末尾。



## 库版本管理

通过示例来理解linux下的动态库版本管理机制
### 生成V1.0版本的动态库
新建libhello.h和libhello.c文件，编译成动态库
动态库V1.0示例代码：

```c
/* libhello.h - demonstrate library use. */

void hello(void);

```
```c
/* libhello.c - demonstrate library use. */

#include <stdio.h>
#include "libhello.h"

void hello(void) {
  printf("Hello V1.0, library world.\n");
}
```
编译动态库命令行如下：
```shell
# Create shared library's object file, libhello.o.

$ gcc -fPIC -Wall -g -c libhello.c

# Create shared library.
# Use -lc to link it against C library, since libhello
# depends on the C library.

$ gcc -g -shared -Wl,-soname,libhello.so.1 \
    -o libhello.so.1.0 libhello.o -lc
```
最后生成了realname为libhello.so.1.0的动态库，其soname为libhello.so.1，通过**readelf**可查看到：
```shell
$ readelf -d libhello.so.1.0
Dynamic section at offset 0xe08 contains 25 entries:
  Tag        Type                         Name/Value
 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
 0x000000000000000e (SONAME)             Library soname: [libhello.so.1]
 0x000000000000000c (INIT)               0x580
 0x000000000000000d (FINI)               0x6dc
 0x0000000000000019 (INIT_ARRAY)         0x200de8
 0x000000000000001b (INIT_ARRAYSZ)       8 (bytes)
 0x000000000000001a (FINI_ARRAY)         0x200df0
 0x000000000000001c (FINI_ARRAYSZ)       8 (bytes)
 0x000000006ffffef5 (GNU_HASH)           0x1f0
 0x0000000000000005 (STRTAB)             0x380
 0x0000000000000006 (SYMTAB)             0x230
 0x000000000000000a (STRSZ)              188 (bytes)
 0x000000000000000b (SYMENT)             24 (bytes)
 ........
```
当前文件目录为：
```shell
$ ll
-rw-rw-r--. 1 gogo gogo  105 Aug 14 00:16 libhello.c
-rw-rw-r--. 1 gogo gogo   18 Aug 14 00:04 libhello.h
-rw-rw-r--. 1 gogo gogo 3296 Aug 14 00:17 libhello.o
-rwxrwxr-x. 1 gogo gogo 9030 Aug 14 00:10 libhello.so.1.0
```
###  编译测试程序
测试程序代码示例：
```c
/* demo_use.c -- demonstrate direct use of the "hello" routine */

#include "libhello.h"

int main(void) {
 hello();
 return 0;
}
```
编译链接前，需要创建libhello.so文件进行链接，通过软链接创建文件
```shell
ln -sf libhello.so.1.0 libhello.so
```
编译链接程序：
```shell
# Compile demo_use program file.
gcc -Wall -g -c demo_use.c -o demo_use.o

# Create program demo_use.
# The -L. causes "." to be searched during creation
# of the program; note that this does NOT mean that "."
# will be searched when the program is executed.

gcc -g -o demo_use demo_use.o -L. -lhello -Wl,-rpath,./
```

### 运行测试程序
此处链接demo_use加上`-Wl,-rpath,./`，因此程序运行时会默认先从程序当前目录搜索动态库，运行测试程序：
```shell
$ ./demo_use
./demo_use: error while loading shared libraries: libhello.so.1: cannot open shared object file: No such file or directory
```
因此还需要生成libhello.so.1文件，有3种方式可以成功让demo_use加载到依赖库：
1. 在本地软连接生成libhello.so.1文件（使用`ln`命令或`ldconfig -n .`命令)，然后命令行设置环境变量`LD_LIBRARY_PATH=.`，动态链接器（ld.so)在加载动态库时便可以在当前目录中搜索到库文件;此种情况可用于用户无root权限，没法修改系统库文件情况。
2. 使用`ln`命令在/lib64中创建软链接到本地libhello.so.1.0
3. 拷贝libhello.so.1.0文件到/lib64中，然后执行`ldconfig -v`命令，强制系统刷新动态库缓存，此命令会在/lib64中创建软链接，如下：
```shell
[/lib64]$ ll | grep libhello
lrwxrwxrwx.  1 root root       15 Aug 14 02:49 libhello.so.1 -> libhello.so.1.0
-rwxr-xr-x.  1 root root     9030 Aug 14 02:48 libhello.so.1.0

```
也可以通过`ldconfig -p`打印出当前所有动态库链接缓存列表：
```shell
$ ldconfig -p | grep libhello
	libhello.so.1 (libc6,x86-64) => /lib64/libhello.so.1
```
> **ldconfig**命令的用途主要是在默认搜寻目录/lib、/lib64和/usr/lib以及动态库配置文件/etc/ld.so.conf内所列的目录下，搜索出可共享的动态链接库（格式如lib*.so*）,进而创建出动态装入程序(ld.so)所需的连接和缓存文件。缓存文件默认为/etc/ld.so.cache，此文件保存已排好序的动态链接库名字列表，为了让动态链接库为系统所共享，需运行动态链接库的管理命令ldconfig，此执行程序存放在/sbin目录下。
ldconfig通常在系统启动时运行，而当用户安装了一个新的动态链接库时，就需要手工运行这个命令。

通过以上库安装操作即可成功运行测试程序：
```shell
$ ./demo_use
Hello V1.0, library world.
```
#### LD_DEBUG环境变量辅助调试

通过设置LD动态链接器的环境变量还可以查看程序运行前搜索和加载动态库的过程和顺序，通过设置`LD_DEBUG`环境变量为help可以查看到此环境变量的可选参数列表：

```shell
$ export LD_DEBUG=help
$ ./demo_use
Valid options for the LD_DEBUG environment variable are:

  libs        display library search paths
  reloc       display relocation processing
  files       display progress for input file
  symbols     display symbol table processing
  bindings    display information about symbol binding
  versions    display version dependencies
  scopes      display scope information
  all         all previous options combined
  statistics  display relocation statistics
  unused      determined unused DSOs
  help        display this help message and exit

To direct the debugging output into a file instead of standard output
a realname can be specified using the LD_DEBUG_OUTPUT environment variable.
```

所以查看当前程序搜索动态库的顺序和路径，将参数设置为libs即可：

```shell
$ export LD_DEBUG=libs
$ ./demo_use
	  6440:	find library=libhello.so.1 [0]; searching
      6440:	 search path=./tls/x86_64:./tls:./x86_64:.		(RPATH from file ./demo_use)									        #搜索程序当前路径
      6440:	  trying file=./tls/x86_64/libhello.so.1
      6440:	  trying file=./tls/libhello.so.1
      6440:	  trying file=./x86_64/libhello.so.1
      6440:	  trying file=./libhello.so.1
      6440:	 search path=./tls/x86_64:./tls:./x86_64:.		(RPATH from file ./demo_use)
      6440:	  trying file=./tls/x86_64/libhello.so.1
      6440:	  trying file=./tls/libhello.so.1
      6440:	  trying file=./x86_64/libhello.so.1
      6440:	  trying file=./libhello.so.1			   #以上路径都没有找到
      6440:	 search cache=/etc/ld.so.cache             #搜索ldconfig命令作用的缓存列表
      6440:	  trying file=/lib64/libhello.so.1         #找到了
      6440:	
      6440:	find library=libc.so.6 [0]; searching
      6440:	 search path=./tls/x86_64:./tls:./x86_64:.		(RPATH from file ./demo_use)
      6440:	  trying file=./tls/x86_64/libc.so.6
      6440:	  trying file=./tls/libc.so.6
      6440:	  trying file=./x86_64/libc.so.6
      6440:	  trying file=./libc.so.6
      6440:	 search path=./tls/x86_64:./tls:./x86_64:.		(RPATH from file ./demo_use)
      6440:	  trying file=./tls/x86_64/libc.so.6
      6440:	  trying file=./tls/libc.so.6
      6440:	  trying file=./x86_64/libc.so.6
      6440:	  trying file=./libc.so.6
      6440:	 search cache=/etc/ld.so.cache
      6440:	  trying file=/lib64/libc.so.6
      6440:	
      6440:	
      6440:	calling init: /lib64/ld-linux-x86-64.so.2   #初始化ld动态链接器
      6440:	
      6440:	
      6440:	calling init: /lib64/libc.so.6				#初始化C标准库
      6440:	
      6440:	
      6440:	calling init: /lib64/libhello.so.1			#初始化libhello
      6440:	
      6440:	
      6440:	initialize program: ./demo_use
      6440:	
      6440:	
      6440:	transferring control: ./demo_use
      6440:	
Hello V1.0 shared library
      6440:	
      6440:	calling fini: ./demo_use [0]
      6440:	
      6440:	
      6440:	calling fini: /lib64/libhello.so.1 [0]
      6440:	

```



###  生成V1.1版本的动态库并使用

libhello动态库修复了某些问题，但接口未修改，版本升级到1.1：
```c
/* libhello.c - demonstrate library use. */

#include <stdio.h>
#include "libhello.h"

void hello(void) {
  printf("Hello V1.1, library world.\n");
}
```
重新编译链接libhello动态库，soname继续保持为libhello.1，但realname变更为libhello.1.1:

```shell
# Create shared library's object file, libhello.o.

$ gcc -fPIC -Wall -g -c libhello.c

# Create shared library.
# Use -lc to link it against C library, since libhello
# depends on the C library.

$ gcc -g -shared -Wl,-soname,libhello.so.1 \
    -o libhello.so.1.1 libhello.o -lc
```
当前文件目录为：
```shell
$ ll
-rw-rw-r--. 1 gogo gogo  105 Aug 14 00:16 libhello.c
-rw-rw-r--. 1 gogo gogo   18 Aug 14 00:04 libhello.h
-rw-rw-r--. 1 gogo gogo 3296 Aug 14 00:17 libhello.o
-rwxrwxr-x. 1 gogo gogo 9030 Aug 14 00:10 libhello.so.1.0
-rwxrwxr-x. 1 gogo gogo 9030 Aug 14 00:18 libhello.so.1.1
-rwxr-xr-x. 1 root root  9414 Aug 14 00:51 demo_use
-rw-rw-r--. 1 gogo gogo    64 Aug 14 00:08 demo_use.c
-rw-rw-r--. 1 gogo gogo  2696 Aug 14 00:11 demo_use.o
```
将libhello.so.1.1拷贝到/lib64中，然后`ldconfig -v`强制手动刷新缓存后，此时/lib64中自动将libhello.1软连接到了libhello.1.1，实现的动态库版本的升级：
```shell
$ ll | grep libhello
lrwxrwxrwx.  1 root root       15 Aug 14 06:36 libhello.so.1 -> libhello.so.1.1
-rwxr-xr-x.  1 root root     9030 Aug 14 02:48 libhello.so.1.0
-rwxr-xr-x.  1 root root     9030 Aug 14 06:36 libhello.so.1.1
```
因此当前测试程序能运行后是使用升级版本动态库：
```shell
$ ./demo_use
Hello V1.1, library world.
```

### 库版本管理
通过以上示例,可以得到linux库版本管理的方式:
1. 动态库soname为动态库的版本标识，realname为动态库文件名称同时也是版本标识的扩展，可以理解为先按soname对动态库分类，在每个类中挑realname名称字符串最大的作为该版本标识的当前版本库
2. 使用多个相同soname的不同realname动态库时，系统重启后或手动ldconfig后将soname文件软链接到realname名称字符串最大的库，因此程序会下次运行时会使用更新后的动态库版本
3. 同一动态库迭代中进行重大更新无法保持向后兼容时，使用不同soname生成对应版本动态库，旧版本和新版本的库可同时在系统中使用

可见以下示例：
```shell
[/lib64]$ ll | grep libhello.so.
lrwxrwxrwx.  1 root root       15 Aug 14 06:36 libhello.so.1 -> libhello.so.1.1
-rwxr-xr-x.  1 root root     9030 Aug 14 02:48 libhello.so.1.0
-rwxr-xr-x.  1 root root     9030 Aug 14 06:36 libhello.so.1.1
lrwxrwxrwx.  1 root root       15 Aug 14 07:10 libhello.so.2 -> libhello.so.2.2
-rwxr-xr-x.  1 root root     9030 Aug 14 07:02 libhello.so.2.0
-rwxr-xr-x.  1 root root     9030 Aug 14 07:05 libhello.so.2.2

```

在编译动态库时可以不设置soname，这样也就意味着放弃使用linux系统库版本管理的方式，直接使用realname搜索动态库。



### 运行时动态链接

动态库有在使用时有两种链接方式：

1. 装载时动态链接(Load-time Dynamic Linking)：这种用法的前提是在编译之前已经明确知道要调用DLL中的哪几个函数，编译时在目标文件中只保留必要的链接信息，而不含DLL函数的代码；当程序执行时，调用函数的时候利用链接信息加载DLL函数代码并在内存中将其链接入调用程序的执行空间中(全部函数加载进内存），其主要目的是便于代码共享。（动态加载程序，处在加载阶段，主要为了共享代码，共享代码内存）
2. 运行时动态链接(Run-time Dynamic Linking)：这种方式是指在编译之前并不知道将会调用哪些DLL函数，完全是在运行过程中根据需要决定应调用哪个函数，将其加载到内存中（只加载调用的函数进内存），并标识内存地址。（dll在内存中只存在一份，处在运行阶段）

以上介绍的都是程序通过装载时动态链接的方式来搜索依赖库的，以下通过简单示例来说明运行时动态链接方式是如何搜索并使用动态库的。

#### 测试程序

测试代码示例：

```c
/* demo_dynamic.c -- demonstrate dynamic loading and
   use of the "hello" routine */


/* Need dlfcn.h for the routines to
   dynamically load libraries */
#include <dlfcn.h>

#include <stdlib.h>
#include <stdio.h>

/* Note that we don't have to include "libhello.h".
   However, we do need to specify something related;
   we need to specify a type that will hold the value
   we're going to get from dlsym(). */

/* The type "simple_demo_function" describes a function that
   takes no arguments, and returns no value: */

typedef void (*simple_demo_function)(void);


int main(void) {
 const char *error;
 void *module;
 simple_demo_function demo_function;

 /* Load dynamically loaded library */
 module = dlopen("libhello.so", RTLD_LAZY);
 if (!module) {
   fprintf(stderr, "Couldn't open libhello.so: %s\n",
           dlerror());
   exit(1);
 }

 /* Get symbol */
 dlerror();
 demo_function = dlsym(module, "hello");
 if ((error = dlerror())) {
   fprintf(stderr, "Couldn't find hello: %s\n", error);
   exit(1);
 }

 /* Now call the function in the DL library */
 (*demo_function)();

 /* All done, close things cleanly */
 dlclose(module);
 return 0;
}
```

编译脚本：

```shell
#!/bin/sh
# Dynamically loaded library demo

# Presume that libhello.so and friends have
# been created (see dynamic example).

# Compile demo_dynamic program file into an object file.

gcc -Wall -g -c demo_dynamic.c

# Create program demo_use.
# Note that we don't have to tell it where to search for DL libraries,
# since the only special library this program uses won't be
# loaded until after the program starts up.
# However, we DO need the option -ldl to include the library
# that loads the DL libraries.

gcc -g -o demo_dynamic demo_dynamic.o -ldl

```

此时编译完成的`ldd`查看demo_dynamic无法获取它依赖libhello.so的信息，程序运行后报错：

```shell
$ ./demo_dynamic
Couldn't open libhello.so: libhello.so: cannot open shared object file: No such file or directory

```

因为程序的动态库搜索是默认从系统库路径搜索，编译程序时未设置从当前程序路径搜索，可通过`LD_LIBRARY_PATH`来设置，当前程序路径中存在libhello.so文件软链接到了libhello.1.0动态库。

```shell
$ export LD_LIBRARY_PATH=.
$ ./demo_dynamic
Hello V1.0, library world.
```

因此，运行时动态链接的方式，搜索依赖库的名称是代码中`dlopen`函数指定的名称。

--------------------

### 延伸阅读

[语义化版本 2.0.0](https://semver.org/lang/zh-CN/)

### 参考资料

[Program-Library-HOWTO](http://tldp.org/HOWTO/Program-Library-HOWTO/)：以上C代码示例来源出处

[stackoverflow](https://stackoverflow.com/questions/12637841/what-is-the-soname-option-for-building-shared-libraries-for/14613602#14613602)

[动态链接和静态链接的区别](https://www.cnblogs.com/tracylee/archive/2012/10/15/2723816.html)