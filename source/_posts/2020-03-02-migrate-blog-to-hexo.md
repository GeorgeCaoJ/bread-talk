---
layout: post
title: 博客从jekyll迁移至hexo并部署zeit过程
description: 給自己博客换了个门面，从简单的jekyll模板迁移至hexo并使用next主题，最后通过zeit进行自动部署
tags:
- jekyll
- Hexo
- linux
- git
date: 2020-03-01 12:34:56
comments: true
---


无意中看了自己原有[博客页面](https://georgecaoj.github.io/blog/)在[google search](https://search.google.com/search-console)的搜索情况，虽然内容价值不高，点击率也很低，但是也算是做到了自己的知识记录和简单分享，想起来坚持下去还是很有意义。因而将当初自己手动写的jekyll模板实现的简单[博客页面](https://georgecaoj.github.io/blog/)迁移至功能更丰富，风格更现代的hexo，通过部署到免费的[zeit](https://zeit.co/home)，获取了独立的域名并将博客添加进了百度索引，希望我所遇到的问题及其解决方法能与更多的人分享,一如我一直享用其他人的知识经验一样。

## Zeit部署Hexo博客
原本想通过百度收录自己原本github page地址，以便自己的博客可以通过百度搜索分享给其他人，但是百度无法收录github page,据查是因为百度爬虫过于频繁，被github禁止，因此得通过购买域名代理到github page，最后通过其他博主的推荐，使用zeit可以实现静态博客的部署，并支持CDN加速，全球都有节点，免费版一个月20GB的流量，对于博客已经完全够用了。  
### Zeit不支持git子模块
[Hexo](https://hexo.io/zh-cn/docs/)用于的人很多，用于生成静态博客实用方便，社区提供的插件也很丰富。此次将原有jekyll博客迁移至hexo问题不大，主要的坑点在于[zeit](https://zeit.co/home)无法支持git子模块，其[论坛](https://spectrum.chat/zeit/now/problems-with-now-github-when-project-contains-a-submodule~f238f86b-7a42-47f7-a477-0976ca0da1a5)显示，当前无法做到子模块的自动拉取，原因是github没有对功能支持。  
因此，`Hexo/themes`中[next](https://github.com/theme-next/hexo-theme-next)主题直接提交其原始文件，不进行子模块的关联，这样在zeit上自动构建时就会避免构建失败，next文件夹中无内容的问题。这样的弊端是要手动更新next版本，以获取到最新功能和bug修复。  
github博客项目每次提交后，zeit会被触发自动构建最新的提交版本，然后部署到它的服务器上，因而，博客项目在提交时，不能只提交hexo生成的`public`静态输出文件目录，而是要把包含`_config.yml`的hexo根目录，一起提交，这样zeit的持续集成服务能直接build和deploy。因此，在本地写博客的好处是只要写对应的博客md文件，不用`hexo generate`后再叫`public`文件目录了。  
目录概览：
![blog-tree](/img/github/blog-tree.jpg)


