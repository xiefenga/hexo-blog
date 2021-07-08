---
title: cookie和session
date: 2020-10-24 16:26:35
tags:
- http/https
- 网络
categories: [计算机基础, 计算机网络]
keywords: cookie,session
description: cookie和session含义以及区别
cover: http://oss.xiefeng.tech/img/20210315204204.jpg
---

# 前言

HTTP 是无状态协议，也就是说这一次的请求和上一次的请求没有任何关系，服务器不会知道发出这两次请求是同一个用户。而很多时候我们是需要知道状态的，比如记录登录状态、操作的权限认证。

为了能够认出这个用户是刚才已经登录过的用户，服务器就想出了一个办法：给请求过的用户颁发一个凭证（token），而且每次请求用户都需要带上这个凭证，这样服务器通过验证请求所携带过来的凭证就可以确定客户端的身份。

# cookie

cookie 的出现就是用来解决 HTTP 无状态的问题。cookie 的工作原理就是前面所说，每当一个新的用户发起请求，服务器都会在响应头中添加一个头部 `set-cookie` 用来向用户颁发凭证，浏览器每次发送请求时都会带上 cookie 表明身份。

cookie 里面保存的是我们出入服务器所需要的状态信息，一般都会被加密。里面是重要的身份信息，为了安全，永远不要把你的cookie泄露给别人。

![cookie](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201024164525498.png)

## cookie的组成

- key 和 value：一个 cookie 主要就是一个键值对，这就是 cookie 中的存放的凭证信息
- domain：设置了 cookie 能起作用的域，如果不设置，浏览器会自动将其设置为当前请求的域
- path：指定 path 下才能使用 cookie，如果不设置，浏览器会将其自动设置为当前请求的路径
- expire / max-age：设置 cookie 的过期时间
  - expire 设置的是 GMT 时间，max-age 设置的是秒数
  - `max-age` 优先级高于 `expires` 且不能为0，http 1.1出现
- secure：设置该 cookie 只能在 https 协议下发送
- httponly：设置该 cookie 只能用于传输，js无法获取，这对防止跨站脚本攻击（XSS）会很有用
- SameSite：限制 cookie 跨站，可用于防御 CSRF 攻击
	- Strict：所有跨站请求都不附带 cookie，有时会导致用户体验不好
	- Lax：所有跨站的超链接、GET请求的表单、预加载连接时会发送cookie，其他情况不发送
	- None：无限制

## cookie的设置

浏览器对于 cookie 的支持非常好，浏览器会自动设置好 cookie，并会在 cookie 符合要求时自动放到请求头中附带到服务器。

服务器可以通过设置响应头`set-cookie`，来告诉浏览器应该如何设置 cookie

```http
set-cookie: token=123456; max-age=3600; secure; httponly
```

每个 cookie 除了键值对是必须要设置的，其他的属性都是可选的，并且顺序不限

浏览器收到请求头中带有 `set-cookie` 的响应之后，会创建 cookie，就像这样：

```
key: token
value: 123456
domain: xiefeng.tech
path: /
expire: 2020-10-25 17:00:00 
secure: false 
httponly: true
```

在后续发送请求的过程中，如果该 cookie 符合条件，则浏览器则会默认带上 cookie，在http请求头中添加：

```http
cookie: token1=value1; token2=value2;
```

客户端（浏览器）也可以设置 cookie：

```js
document.cookie = `token=value; path=/; max-age=3600; secure;`;
```

删除 cookie 就是把 cookie 的有效时间设置为一个过期的时间，浏览器就会自己删除：

```js
document.cookie = `token=value; domain=xiefeng.tech; max-age=-1;`;
```

## 第三方cookie

浏览器允许对于其他与下的资源（如广告图片）响应中的 `Set-Cookie`，会保存 cookie，并在后续访问该域时自动使用 Cookie

## 使用cookie登录的例子

1. 浏览器发送登录的请求，附带账号密码
2. 服务器验证账号信息的正确性，接着为了实现能够记住登录的状态，服务器设置 cookie，并写入认证的信息（至于是什么信息，这个无法确定，可以是用户的 id，也可以和 session 或者 jwt 连用，总之服务器通过该信息可以认证客户端的身份）
3. 浏览器收到请求创建 cookie
4. 后续的请求会自动附带上 cookie，服务器可以认证我们的身份，允许我们执行一些需要权限的操作

# session

cookie 是保存到在客户端的，而 session 是保存在服务器上的，session 的原理大致就是：

1. 服务器会创建一个数据结构来保存用户的标识（sesionID）和认证该用户的数据
2. 当请求第一次来的时候（可能仅仅在请求页面），服务器生成一个 sessionID，然后将该 ID 和数据（数据可能暂时是空）存入该数据结构
3. 然后将该 sessionID 返回该客户端，后续客户端请求的时候需要带上该 ID
4. 后续的请求中，服务器可以通过该 sessionID 来判断用户的身份

![session原理示意图](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/session%E5%8E%9F%E7%90%86%E7%A4%BA%E6%84%8F%E5%9B%BE.jpg)

从原理可以看出来，session 可以 cookie 结合来使用，将 sessionID 通过 cookie 发送给浏览器，而关键的认证信息放在服务器，这也导致了服务器可能会被占用大量的存储空间。

## 区别

1. cookie 存储在客户端，存在安全隐患，别人可以通过存放在本地的 cookie 进行 cookie 欺骗
2. session 存储在服务器，会占用很多的空间，当访问量很多很大的时候，比较占用服务器的性能

3. 大多数的时候，cookie 和 session 都是结合起来一起使用

