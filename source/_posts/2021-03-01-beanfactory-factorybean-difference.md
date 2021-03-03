---
layout: post
title: [知识点速记]-BeanFactory和FactoryBean的区别
description: 积累spring源码知识点
tags:
- java
- spring
- 源码阅读
- 好记性不如烂笔头
date: 2021-3-1 15:15:45
comments: true
---

### 总结
命名上的区别：
* BeanFactory以Factory结尾，是工厂类的接口，定义了spring中IOC容器获取其管理的Bean的规范接口。
* FactoryBean以Bean结尾，其本质是一个bean，对其内部的Bean功能进行代理，用以实现AOP功能。
功能定位上区别：
* BeanFactory是Spring ApplicationContext的底层接口，定义了获取对象容器管理Bean的对外接口，ApplicationContext实现了BeanFactory并进行了增强，因此在spring中推荐使用ApplicationContext。
* FactoryBean是由Object Container管理的一种Bean,从BeanFactory可以获取到FactoryBean的对象，但注意点是通过bean name获取得到的只是FactoryBean.getObject()生成的代理对象；若要获取FactoryBean本身，需要在name前增加`&`符号，该特殊符号是在BeanFacotry接口中定义的静态变量
```java
public interface BeanFactory {
	/**
	 * Used to dereference a {@link FactoryBean} instance and distinguish it from
	 * beans <i>created</i> by the FactoryBean. For example, if the bean named
	 * {@code myJndiObject} is a FactoryBean, getting {@code &myJndiObject}
	 * will return the factory, not the instance returned by the factory.
	 */
	String FACTORY_BEAN_PREFIX = "&";
    ...
}
```
### 参考文章
* [BeanFactory 简介以及它 和FactoryBean的区别(阿里面试)](https://www.cnblogs.com/aspirant/p/9082858.html)