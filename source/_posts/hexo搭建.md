---
title: hexo 搭建个人博客（github + 阿里云）
date: 2020-10-20 19:46:52
tags: hexo
categories: hexo
keywords: hexo, 搭建博客
description: hexo搭建个人博客部署到github和阿里云。
---

# 前言

写博客基本上是每一个程序员都需要做的事，但是在哪里发布是一个比较头疼的问题，当然可以发布在掘金、CSDN这些平台上，但是如果有个人的站点岂不是更好，可以随心所欲的进行配置。

# 准备工作

## 安装 node

Hexo 是基于 node，所以需要安装 [node.js](https://nodejs.org/en/)，如果你也是搞前端的电脑里一定有 node，下长期支持版（LTS）就可以，安装比较无脑，next 下去就可以。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/5deb6fd734735101.jpg)

安装完成之后，在命令行里输入 `node -v` 和 `npm -v`  来分别验证 node 和 npm（node 的包管理器）是否安装成功

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020210203104.png)

## 安装 Git

为什么要安装 [git](https://git-scm.com/book/zh/v2/%E8%B5%B7%E6%AD%A5-%E5%AE%89%E8%A3%85-Git) 呢，无论我们是部署到 github 上还是自己的服务器上都需要用到 [git](https://git-scm.com/book/zh/v2/%E8%B5%B7%E6%AD%A5-%E5%AE%89%E8%A3%85-Git) 来实现自动化的部署。

安装完成后通过 `git  --version` 来查看是否安装成功

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020210604104.png)

## 安装 Hexo

使用 npm 安装 Hexo 的 cli 工具，类似于 vue 那样，选择全局安装比较方便，如果npm玩的比较好的可以选择其他的安装方式。

```shell
npm i -g hexo-cli
```

通过 `hexo version` 验证安装是否成功

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020211718621.png)

# 本地搭建 hexo 项目

就像 vue 项目那样，我们的博客也是一个项目，通过 hexo 来搭建

```shell
hexo init <projname>

# 搭建完成后 进入项目文件夹
cd <projname>

# 安装项目依赖
npm i
```

最后我们的项目目录结构应该是这样（忽略 `.deploy_git`）：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020212535700.png)

`source/_posts` 目录下的 `.md` 文件是我们的博客源文件

`themes/` 目录下是博客的主题，默认有一篇 hello world

`_config.yml` 是我们博客站点的配置文件

`public/` 是我们博客的页面文件

我们先来试试一些常用的操作，打开 `localhost:4000` 会看见：

```shell
# 将 md 生成 静态页面
hexo g

# 开启本地服务器 预览
hexo s
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/8-2019-11-26-21-37-43.png)

更改主题暂不涉及，可以看看别的博客

# 部署到 github 上

首先我们需要注册 github 的账号，然后新建一个仓库，仓库名：`username.github.io` ，这一点很重要！！！

就像这样：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020214014597.png)

然后复制仓库克隆的链接，在 `_config.yml` 中设置 deploy

```yml
deploy:
  type: 'git'
  repo: https://github.com/xiefenga/xiefenga.github.io.git
  branch: master
```

将自己的博客部署到 github ，接着打开 `https://username.github.io/`，例如我的就是 `https://xiefenga.github.io/` 

```shell
hexo d
```

# 部署到阿里云

## 准备

首先我们需要购买 云主机，然后连接到该主机进行操作，有两种方式（以我的轻量应用服务器为例）

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020214719476.png)

为了可以自动化部署，我们需要在本地生成 ssh 密钥，这样我们就可以在本地直接提交代码到远端 git 仓库。

```ssh
ssh-keygen -t rsa -C "你设置的邮箱" # 接着连着回车不用管
```

如果是第一次下 git，需要先配置 git 的用户名和密码

```shell
git config --global user.name "用户名"
git config --global user.email "邮箱"
```

生成的密钥在 `用户/用户名/.ssh/` 

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020221624323.png)

## 连接主机

1. 使用 阿里云控制台自带的 网页终端

2. 通过 ssh（建议，操作方便）

	![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020215220485.png)

添加密钥后，下载（只有一次下载机会，后缀为 `.pem`），然后自己在命令行中通过 ssh 远程连接服务器

```shell
ssh root@ip -i .\xxx.pem
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020215456496.png)

## 配置 git 

### 安装 git

我们需要在服务器上 安装 git，因为部署的原理和使用 github 差不多，中途需要输入 `y` 确认

```shell
yum install git
```

### 创建 git 账户

```shell
adduser git

# 添加账户权限
chmod 740 /etc/sudoers

vi /etc/sudoers 
```

找到下面的内容，然后输入 `i` 在后面插入内容，接着 `esc` `:wq` 保存退出

```shell
## Allow root to run any commands anywhere
root    ALL=(ALL)     ALL
```

在这个后面添加的内容

```shell
git     ALL=(ALL)     ALL
```

接着就是完善设置（Linux 输入密码的时候是不会显示的）

```shell
# 修改权限
chmod 400 /etc/sudoers

# 设置 git账户密码
sudo passwd git
```

### 让本地的 git 能免密登录服务器的 git

将我们在win10中生成的 id_rsa.pub 文件中的公钥复制到 authorized_keys

```shell
su git
mkdir ~/.ssh
vi ~/.ssh/authorized_keys # 和上面添加内容一样的操作，i 插入内容，esc :wq 保存退出

# 赋予文件权限
chmod 600 /home/git/.ssh/authorized_keys
chmod 700 /home/git/.ssh
```

接着回到 win10 桌面，测试是否配置成功

```shell
ssh -v git@ip
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020222056116.png)

## 建立 git 仓库

```shell
# 回到 root 账户
exit

# 建立仓库
mkdir /var/repo
chown -R git:git /var/repo
chmod -R 755 /var/repo
cd /var/repo
git init --bare hexo.git

# 创建 git 钩子，用于自动部署
vi /var/repo/hexo.git/hooks/post-receive

# 先复制完内容 再操作
chown -R git:git /var/repo/hexo.git/hooks/post-receive
chmod +x /var/repo/hexo.git/hooks/post-receive
```
复制的内容：

```shell
#!/bin/bash
git --work-tree=/var/hexo --git-dir=/var/repo/hexo.git checkout -f
```

接着建立网站的根目录：


```
mkdir /var/hexo
```

## 使用宝塔面板

安装之前记得先要再 阿里云的控制台把 8888 端口的限制打开

![image-20201020224117927](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020224117927.png)

安装宝塔面板

```shell
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && bash install.sh
```

接着按安装完成的提示信息用浏览器打开宝塔面板的后台，然后在软件商店 安装 nginx

然后在网站那一栏，新建网站，如果有域名就填域名，没有就先瞎填一个

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020224416324.png)

然后点这个网站的设置，如果是没有域名，就先点击域名，新增一个域名（填 ip），然后修改配置文件和网站目录

![image-20201020224759441](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020224759441.png)

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201020224719009.png)

然后重启宝塔面板

## 修改 hexo 配置

修改 `_config.yml` 文件

```yml
deploy:
  type: 'git'
  repo: git@ip/域名:/var/repo/hexo.git
  branch: master
```

接着最后一步：

```shell
hexo clean

hexo d
```



**参考文章：**

- [将Hexo部署到阿里云轻量服务器（保姆级教程）](https://hjxlog.com/posts/20191130a1.html)
- [Hexo博客部署到阿里云服务器](https://zhengyujie.github.io/2019/08/17/%E9%83%A8%E7%BD%B2%E5%88%B0%E9%98%BF%E9%87%8C%E4%BA%91%E6%9C%8D%E5%8A%A1%E5%99%A8/)

