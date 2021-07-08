---
title: HTTP缓存
date: 2021-03-10 20:43:37
tags: 
- http/https
- 网络
categories: [计算机基础, 计算机网络]
cover: http://oss.xiefeng.tech/img/20210310204612.png
keywords: HTTP, cache
---

# 缓存控制

## Cache-Control

> Cache-Control 出现于 HTTP / 1.1 用于实现缓存， 使用相对时间来实现缓存，优先级高于 Expires

### 响应

- `public`：表示无论私有缓存或者共享缓存，皆可将该响应缓存
- `private`：表示该响应不能被代理服务器作为共享缓存使用。若 `private` 后指定头部，则在告诉代理服务器不能缓存指定的头部，但可缓存其他部分
- `no-cache`：告诉客户端不能直接使用缓存的响应，使用前必须在源服务器验证得到 304 返回码。如果 `no-cache` 后指定头部，则若客户端的后续请求及响应中不含有这些头则可直接使用缓存
- `no-store`：告诉所有下游节点不能对响应进行缓存
- `max-age`：告诉客户端缓存时间超出 `max-age` 秒后则缓存过期
- `s-maxage`：与 `max-age` 相似，但仅针对共享缓存，且优先级高于 `max-age` 和 `Expires`，告诉缓存最多缓存多久
- `no-transform`：告诉代理服务器不能修改消息包体的内容
- `must-revalidate`：告诉**客户端**一旦缓存过期，必须向服务器验证后才可使用
- `proxy-revalidate` ：与 `must-revalidate` 类似，但它仅对**代理服务器**的共享缓存有效

### 请求

- `no-cache`：告诉服务器不能直接使用已有缓存作为响应返回，除非带着缓存条件到上游服务端得到 304 验证返回码才可使用现有缓存

- `no-store` ：告诉各代理服务器不要对该请求的响应缓存（实际有不少不遵守该规定的代理服务器）

- `max-age`：告诉服务器，客户端不会接受时间超出 `max-age` 的缓存

- `min-fresh`：要求服务器返回至少还未超过指定时间的缓存资源（在指定时间内没有过期的缓存可以返回）

	告诉服务器，`Age` 至少经过 `min-fresh` 秒后缓存才可使用

- `max-stale`：接收缓存即使过期，没指定数值怎样都会接收缓存；如果指定数值，即使过期，只要没有超过指定的时间都可以接收

- `no-transform`：告诉代理服务器不要修改消息包体的内容

- `only-if-cached`：告诉服务器仅能返回缓存的响应，若没有缓存则返回 504 错误码

Cache-Control 可以设置为上面的一个或多个值：

```http
Cache-Control: public, max-age=315360000
```

## Expires

> Expires是 HTTP / 1.0 的表示资源过期时间的头部，它描述的是一个绝对时间，由服务器返回

Expires 受限于本地时间，如果修改了本地时间，可能会造成缓存失效

```http
Expires: Wed, 11 May 2021 07:20:00 GMT
```

## Pragma

> HTTP / 1.0 的头部，当该消息头出现在请求中时，是向服务器表达：不要考虑任何缓存，给我一个正常的结果

相当于 HTTP / 1.1 请求头中的 `Cache-Control: no-cache` 

在`Chrome`浏览器中调试时，如果勾选了`Disable cache`，则发送的请求中会附带该信息

```http
Cache-Control: no-cache
Pragma: no-cache
```

## Vary

服务器告诉缓存服务器/客户端，只有请求持有和该头部指定的值相同且头部的相同才可以使用缓存

```http
// 浏览器 -> 代理
GET /sample.html
Accept-Language: en-us

// 代理 -> 源服务器
GET /sample.html
Accept-Language: en-us

// 源 -> 代理
Vary: Accept-Language
```

![vary](http://oss.xiefeng.tech/img/20210310212342.png)

## 时间

Age：表示自源服务器发出响应（或者验证过期缓存），到使用缓存的响应发出时经过的秒数，代理服务器添加

```http
Age: 3825683
```

Date：表示消息发送的时间，缓存在评估响应的新鲜度时要用到

```http
Date: Wed, 11 May 2021 07:20:00 GMT
```

# 条件

## ETag

资源的实体标识，服务器会为每一份资源分配对应的 `ETag` 值，资源更新时，`ETag` 也需要更新

- 强 `ETag`

	不论实体发生多么细微的变化该值都会变化，如：`ETag: "usagi-1234"` 

- 弱 `ETag`

	只用于提示资源是否相同，只有资源发生了根本的改变，才会改变该值，会在字段开始添加 `W/` 如： `ETag: W/"usagi-1234"`

```http
ETag: W/"121-171ca289ebf"
```

## If-Match

它会告知服务器匹配资源所用的实体标记（`ETag`）值，服务器会比对 `If-Match` 的字段值和资源的 `ETage` 值，一致则会执行请求，不一致返回 412

```http
If-Match: "123456"
```

`If-None-Match` 和 `If-Match` 相反，当和 `ETag` 值不一致时处理请求

## If-Modified-Since

如果在该字段的日期之后资源没有更新，服务器返回 304，否则返回 200 + `Last-Modified`

```http
If-Modified-Since: Thu, 15 Apr 2004 00:00:00 GMT
```

`If-Unmodified-Since` 和 `If-Unmodified-Since` 相反，如果发生了更新返回412，没更新处理请求

目前的很多服务器，只要发现 `If-None-Match` 存在，就不会去看 `If-Modified-Since`

`If-Modified-Since`是`http1.0`版本的规范，`If-None-Match`是`http1.1`的规范

# 缓存原理

## 缓存指令

服务器在响应头中加入一些头部，可以使得浏览器进行缓存，就像这样的头部：

```http
Cache-Control: max-age=3600
ETag: W/"121-171ca289ebf"
Date: Thu, 30 Apr 2020 12:39:56 GMT
Last-Modified: Thu, 30 Apr 2020 08:16:31 GMT
```

浏览器把这次请求得到的响应体缓存到本地文件中，并标记这次请求的相关信息（请求方法、路径、缓存时间等）。

![](http://oss.xiefeng.tech/img/20210310220336.png)

## 缓存判断

浏览器在加载资源时，根据请求头的 `expires` 和 `cache-control` 判断缓存是否可用：

- 可用直接从缓存读取资源，不会发请求到服务器
- 如果没有命中缓存，浏览器会发送一个**带缓存**的请求到服务器
- 服务器会返回缓存是否有效以及新资源
	- 缓存有效：`304 Not Modified`
	- 缓存过期：新的缓存指令 + 新的消息体 

![](http://oss.xiefeng.tech/img/20210310220249.png)



## 缓存时间

浏览器会根据服务器不同的响应情况，设置不同的有效期：

![缓存时间的设置](http://oss.xiefeng.tech/img/20210310221030.png)

# 强缓存和协商缓存

**强缓存**

强缓存通过 `Expires` 和 `Cache-Control` 两种响应头实现，也就是强缓存由服务器主动设置。

**协商缓存**

> 当浏览器对某个资源的请求没有命中强缓存，就会发一个请求到服务器，验证协商缓存是否命中，如果协商缓存命中，请求响应返回的http状态为304并且会显示一个Not Modified的字符串。

所谓协商缓存就是浏览器和服务器协商缓存是否有效。

