---
title: Promise总结
date: 2021-02-25 12:19:35
tags: JavaScript
categories: [编程语言, JavaScript]
cover: http://oss.xiefeng.tech/img/20210225122345.jpeg
keywords: Promise
---

# ES6异步模型

`Promise` 是异步编程的一种解决方案，它由社区最早提出和实现，ES6 将其写进了语言标准，原生提供了 `Promise` 对象。

1. 一件可能发生异步操作的事情，分为两个阶段：`unsettled` 和 `settled`

	- `unsettled`： 未决阶段，表示事情还在进行前期的处理，并没有发生通向结果的那件事
	- `settled`：已决阶段，事情已经有了一个结果，不管这个结果是好是坏，整件事情无法逆转

	- 事情总是从**未决阶段**逐步发展到**已决阶段**的，并且未决阶段拥有控制何时通向已决阶段的能力

2. 一件异步的事情被划分为三种状态： `pending`、`fulfilled`、`rejected`

	- `pending`：处于未决阶段，则表示这件事情还在挂起，最终的结果还没出来
	- `fulfilled`：已决阶段的一种状态，是一个可以按照正常逻辑进行下去的结果
	- `rejected`：已决阶段的一种状态，是一个无法按照正常逻辑进行下去的结果，通常用于表示有错误
	- 把事情推向 `fulfilled` 状态的过程叫做：`resolve`，推向 `rejected` 状态的过程叫做：`reject`
	- 将事情从 `pending` 推向 `fulfilled` 或 `rejected` 时可以传递数据
	- **无论是阶段，还是状态，是不可逆的，一旦改变无法逆转**
	
3. 当事情达到已决阶段后，通常需要进行后续处理，不同的已决状态，决定了不同的后续处理

	- `thenable`：正常的已决状态的后续处理
	- `catchable`：非正常的已决状态的后续处理
	- 后续处理可能有多个，因此会形成作业队列，这些后续处理会按照顺序，当状态到达后依次执行
	
4. 整件事称之为 `Promise`

![Promise](http://oss.xiefeng.tech/img/20210225182153.png)

# Promise细节

1. 运行到 `then` 或 `catch` 时，如果 `Promise` 的状态已决，该函数会立即执行，否则会等到已决才会执行

2. `thenable` / `catchable` 函数是异步的，立即执行说的不够准确，应该是立即放入事件队列的微任务队列

3. 在未决阶段如果发生未捕获的错误，会将状态推向 `rejected`，并会被 `catchable` 函数捕获

4. 一旦状态推向了已决阶段，无法再对状态做任何更改

5. 如果 `resolve` 的参数是另一个 `Promise`，该行为和 `then` 相同

   ```javascript
   const promise1 = new Promise((resolve, reject) => Math.random() < 0.5 ? resolve(1) : reject('error'))
   
   const promise2 = new Promise((resolve, reject) => resolve(promise1))
   
   promise2.then(data => console.log(data), err => console.log('err', err))
   
   console.log(promise1 === promise2) // false
   ```

6. 如果 `reject` 参数的另一个参数是 `Promise`，则该 `Promise` 会被作为返回的 `Promise` 的数据

   ```javascript
   const promise1 = new Promise((resolve, reject) => reject(1))
   
   const promise2 = new Promise((resolve, reject) => reject(promise1))
   
   promise2.then(data => console.log(data), err => console.log('err', err, err === promise1))
   // err Promise {<rejected>: 1} true
   ```

# Promise串联

`then` 和 `catch` 可以注册已决阶段处理的函数，并且他们都返回一个新的 `Promise`，该 `Promise` 的特点：

1. 如果当前的 Promise 是未决的，得到的新的 Promise 是 `pending` 状态

   ```javascript
   new Promise(resolve => setTimeout(resolve, 1000)).then(console.log)
   
   // Promise {<pending>}
   ```

2. 如果当前的 Promise 是已决的（或变成已决），会运行 `thenable` 或 `catchable`

   1. 函数的返回结果就是新 `Promise` 的数据
   2. 只要 `thenable` 或 `catchable` 没有抛出未捕获的错误， 新 `Promise` 的状态一定是 `fulfilled`
   3. 如果 `thenable` 或者 `catchable` 返回的是一个 `Promise`，则新 `Promise` 的状态和数据会和返回值保持一致

   ```javascript
   const promise1 = new Promise(resolve => setTimeout(resolve, 1000, 1))
   
   const promise2 = promise1.then(data => {
     console.log(data)
     return 2
   })
   
   console.log(promise1, promise2)
   
   setTimeout(() => console.log(promise1, promise2), 1000)
   
   // Promise {<pending>} Promise {<pending>}
   // 1
   // Promise {<fulfilled>: 1} Promise {<fulfilled>: 2}
   ```

3. 如果 `then` / `catch` 中并没有传入回调函数，那么这个新 `Promise` 只是简单地接受原 `Promise` 的终态作为它的终态

   ```javascript
   const promise1 = new Promise((resolve) => resolve(1))
   
   const promise2 = promise1.then()
   
   promise2.then(console.log)
   
   console.log(promise1, promise2, promise1 == promise2)
   // Promise {<fulfilled>: 1} Promise {<pending>} false
   // 1
   ```

# 取消Promise

有些时候会遇到 Promise 正在处理过程中，程序却不再需要其结果的情形，例如：取消一个已发送的网络请求

可以在现有实现基础上提供一种临时性的封装（cancel token），以实现取消 Promise 的功能：

```javascript
class CancelToken {
  constructor(cancelFn) {
    this.promise = new Promise(resolve => cancelFn(resolve))
  }
}
```

就是给 CancelToken 实例提供的 Promise 注册取消的方法，通过 cancelFn 让 Promise 状态改变从而运行取消原本 Promise 的方法

```javascript
const startButton = document.querySelector('#start')
const cancelButton = document.querySelector('#cancel')

let id

const asyncFn = (delay) => new Promise((resolve) => {
  id = setTimeout(resolve, delay)
})

startButton.addEventListener("click", () => asyncFn(1000))

const cancelToken = new CancelToken((cancel) => cancelButton.addEventListener("click", cancel))
cancelToken.promise.then(() => clearTimeout(id))
```

所谓的取消 Promise 就是在还没有产生结果的时候让改变状态的函数不再运行，让原本的 Promise 永远也不会被 `resolve`

可以封装一个更加一般的 CancelToken，实现类似 axios 的效果，只需要调用 `source` 方法：

```javascript
class CancelToken {
  constructor(cancelFn) {
    this.promise = new Promise(resolve => cancelFn(resolve))
  }

  static source() {
    let cancel
    const token = new CancelToken(cancelCallback => cancel = cancelCallback)
    return {
      token,
      cancel,
    }
  }
}

function ajax  (options) {
  return new Promise((resolve, reject) => {

    const xhr = new XMLHttpRequest()

    const { url, data = null, type = "GET", cancelToken = null } = options

    xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)))

    xhr.addEventListener('error', error => reject(error))

    xhr.addEventListener('abort', () => console.log('xhr has been abort'))

    cancelToken?.promise && cancelToken.promise.then(() => xhr.abort())

    xhr.open(type, url, true)

    xhr.send(data)
  })
} 
```



