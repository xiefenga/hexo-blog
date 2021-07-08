---
title: JWT是什么
date: 2020-10-24 16:26:35
tags:
- http/https
- 网络
categories: [计算机基础, 计算机网络]
keywords: JWT
description: JWT是什么
copyright: false
cover: http://oss.xiefeng.tech/img/20210315204530.jpg
---

# JWT概述

JWT 全称 `Json Web Token`，强行翻译就是 json 格式的网络令牌，可以看出来 JWT 是一个令牌。

令牌的作用是什么？令牌一般用来验证身份，和 cookie 的作用相同，JWT 就是用来做这件事的。

都有 cookie 了，为什么还要有 JWT？

## 存在的问题

随着前后端分离的发展，以及数据中心的建立，越来越多的公司会创建一个中心服务器，服务于各种产品线。

而这些产品线上的产品，它们可能有着各种终端设备，包括但不仅限于浏览器、桌面应用、移动端应用、平板应用、甚至智能家居。

![中心服务器](http://oss.xiefeng.tech/img/20210315205336.png)

一般来说，中心服务器至少承担着认证和授权的功能，例如登录：各种设备发送消息到中心服务器，然后中心服务器响应一个身份令牌。

当这种结构出现后，就出现一个问题：它们之间还能使用传统的cookie方式传递令牌信息吗？

因为cookie在传输中无非是一个消息头而已，当然可以。但是除了浏览器对cookie有完善的管理机制，其他设备上就需要开发者自己手动处理。

JWT 的出现就是为了解决这个问题，JWT 要解决的问题，就是为多种终端设备，提供**统一的、安全的**令牌格式。

![](http://oss.xiefeng.tech/img/20210315205834.png)

## 使用

JWT 只是一个令牌格式，可以使用任何传输方式来传输 JWT，一般会使用消息头来传输它。

JWT 令牌可以出现在响应的任何一个地方，也可以出现在响应的多个地方，比如为了充分利用浏览器的cookie，同时为了照顾其他设备，可以让 JWT 出现在 `set-cookie` 和 `authorization` 或 `body` 中，尽管这会增加额外的传输量。

```http
HTTP/1.1 200 OK
...
set-cookie:token=jwt令牌
authorization:jwt令牌
...

{..., token:jwt令牌}
```

客户端拿到令牌后，它要做的只有一件事：存储它；当后续请求发生时，你只需要将它作为请求的一部分发送到服务器即可。

这样一来，服务器就能够收到这个令牌了，通过对令牌的验证，即可知道该令牌是否有效。

![](http://oss.xiefeng.tech/img/20210315210305.png)

# JWT组成

为了保证令牌的安全性，JWT 由三个部分组成，分别是：

1. header：令牌头部，记录了整个令牌的类型和签名算法
2. payload：令牌负荷，记录了保存的主体信息，比如你要保存的用户信息就可以放到这里
3. signature：令牌签名，按照头部固定的签名算法对整个令牌进行签名，该签名的作用是：保证令牌不被伪造和篡改

它们组合而成的完整格式是：`header.payload.signature`

![](http://oss.xiefeng.tech/img/20210315210551.webp)

比如，一个完整的 JWT 如下：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9.BCwUy3jnUQ_E6TqCayc7rCHkx-vxxdagUwPOWqwYCFc
```

它各个部分的值分别是：

- `header：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- `payload：eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9`
- `signature: BCwUy3jnUQ_E6TqCayc7rCHkx-vxxdagUwPOWqwYCFc`

## header

它是令牌头部，记录了整个令牌的类型和签名算法

它的格式是一个 JSON 对象：

```json
{
  "alg":"HS256",
  "typ":"JWT"
}
```

该对象记录了：

- `alg`：`signature` 部分使用的签名算法，通常可以取两个值
  - `HS256`：一种对称加密算法，使用同一个秘钥加密解密
  - `RS256`：一种非对称加密算法，使用私钥加密，公钥解密
- `typ`：整个令牌的类型，固定写 `JWT` 即可

设置好了`header`之后，就可以生成 `header` 部分了

具体的生成方式及其简单，就是把 `header` 部分使用 `base64 url` 编码即可

> `base64 url` 在 `base64` 算法的基础上对 `+`、`=`、`/ `三个字符做出特殊处理的算法

浏览器提供了 `btoa` 函数，可以完成这个操作：

```js
window.btoa(JSON.stringify({
  "alg":"HS256",
  "typ":"JWT"
}))
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

浏览器也提供了`atob`函数，可以对其进行解码：

```js
window.atob("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
// {"alg":"HS256","typ":"JWT"}
```

## payload

这部分是 JWT 的主体信息，它仍然是一个 JSON 对象，它可以包含以下内容：

```json
{
    "ss"："发行者",
    "iat"："发布时间",
    "exp"："到期时间",
    "sub"："主题",
    "aud"："听众",
    "nbf"："在此之前不可用",
    "jti"："JWT ID"
}
```

以上属性可以全写，也可以一个都不写，它只是一个规范，就算写了，也需要你在将来验证这个 JWT 令牌时手动处理才能发挥作用。

上述属性表达的含义：

- `ss`：该 JWT 的发行者，可以写公司名字，也可以写服务名称
- `iat`：该 JWT 的发放时间，通常写当前时间的时间戳
- `exp`：该 JWT 的到期时间，通常写时间戳
- `sub`：该 JWT 是用于干嘛的
- `aud`：该 JWT 是发放给哪个终端的，可以是终端类型，也可以是用户名称，随意一点
- `nbf`：一个时间点，在该时间点到达之前，这个令牌是不可用的
- `jti`：JWT 的唯一编号，设置此项的目的，主要是为了防止重放攻击（重放攻击是在某些场景下，用户使用之前的令牌发送到服务器，被服务器正确的识别，从而导致不可预期的行为发生）

**存放用户信息**

当用户登陆成功之后，可能需要把用户的一些信息写入到 JWT 中（如用户id、账号等）

其实很简单，payload 这一部分只是一个 JSON 对象而已，可以向对象中加入任何想要加入的信息，前面的属性可以完全忽略。

比如，下面的 JSON 对象仍然是一个有效的 payload：

```json
{
    "foo":"bar",
    "iat":1587548215
}
```

`foo: bar` 是我们自定义的信息，`iat: 1587548215` 是 JWT 规范中的信息

payload 部分和 header一样，需要通过 `base64 url` 编码：

```js
window.btoa(JSON.stringify({
  "foo":"bar",
  "iat":1587548215
}))
// eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9
```

## signature

这一部分是 JWT 的签名，它的存在保证了整个 JWT 不被篡改

这部分的生成，是对前面两个部分的编码结果，按照头部指定的方式进行加密

例如，头部指定的加密方法是 `HS256`，前面两部分的编码结果是`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9`

则第三部分就是用对称加密算法 `HS256` 对字符串`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9 ` 进行加密。

当然你得指定一个秘钥，比如 `shhhhh`：

```js
HS256(`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9`, "shhhhh")
// BCwUy3jnUQ_E6TqCayc7rCHkx-vxxdagUwPOWqwYCFc
```

最后将三部分组合在一起，就得到了完整的 JWT：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1ODc1NDgyMTV9.BCwUy3jnUQ_E6TqCayc7rCHkx-vxxdagUwPOWqwYCFc
```

由于签名使用的秘钥保存在服务器，客户端由于拿不到秘钥就无法伪造出签名，无法伪造令牌。

# 令牌的验证

JWT 的 `signature` 可以保证令牌不被伪造，那如何保证令牌不被篡改呢？

比如，某个用户登陆成功了，获得了 JWT，但人为的篡改了 `payload`，比如把自己的账户余额修改为原来的两倍，然后重新编码出`payload` 发送到服务器，服务器如何验证信息？

验证方式非常简单，就是对 `header+payload` 用同样的秘钥和加密算法进行重新加密

然后把加密的结果和传入的 JWT 的 `signature` 进行对比，如果完全相同，则表示前面两部分没有动过，是自己颁发的，如果不同，肯定是被篡改过了。

令牌首先就需要验证是否被篡改，之后可以再进行其他验证：比如是否过期、听众是否满足要求等等。

# 总结

JWT 的特点：

- JWT 本质上是一种令牌格式，它和终端设备、服务器、传输无关，它只是规范了令牌的格式而已
- JWT 由三部分组成：header、payload、signature
- JWT 由于签名的存在难以被篡改和伪造

**参考文章**

- [JWT原理详解](http://yuanjin.tech/article/100)