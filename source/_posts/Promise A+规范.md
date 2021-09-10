---
title: Promise/A+规范以及简单实现
date: 2021-02-26 16:18:35
tags: JavaScript
categories: [编程语言, JavaScript]
cover: http://oss.xiefeng.tech/img/20210226162029.png
keywords: Promise, Promise/A+
description: Promise/A+规范以及简单实现
---

# Promise A+ 规范

## 术语

1. Promise：promise 是一个拥有 `then` 方法的对象或函数，其行为符合本规范；

2. thenable：是一个定义了 `then` 方法的对象或函数，文中译作“拥有 `then` 方法”；

3. value：指任何 JavaScript 的合法值（包括 `undefined` , thenable 和 promise）；

4. exception：是使用 `throw` 语句抛出的一个值。

5. reason：表示一个 promise 的拒绝原因。

## 要求

### Promise 的状态

一个 Promise 的当前状态必须为以下三种状态中的一种：**Pending**、**Fulfilled**和**Rejected**。

#### 等待态（Pending）

处于等待态时，promise 需满足以下条件：

- 可以迁移至执行态或拒绝态

#### 执行态（Fulfilled）

处于执行态时，promise 需满足以下条件：

- 不能迁移至其他任何状态
- 必须拥有一个**不可变**的终值

#### 拒绝态（Rejected）

处于拒绝态时，promise 需满足以下条件：

- 不能迁移至其他任何状态
- 必须拥有一个**不可变**的据因

这里的不可变指的是恒等（即可用 `===` 判断相等），而不是意味着更深层次的不可变。

### Then 方法

一个 promise 必须提供一个 `then` 方法以访问其当前值、终值和据因。

promise 的 `then` 方法接受两个参数：

```javascript
promise.then(onFulfilled, onRejected)
```

#### 参数可选

`onFulfilled` 和 `onRejected` 都是可选参数。

- 如果 `onFulfilled` 不是函数，其必须被忽略
- 如果 `onRejected` 不是函数，其必须被忽略

#### onFulfilled

如果 `onFulfilled` 是函数：

- 当 `promise` 执行结束后其必须被调用，其第一个参数为 `promise` 的终值
- 在 `promise` 执行结束前其不可被调用
- 其调用次数不可超过一次

#### onRejected

如果 `onRejected` 是函数：

- 当 `promise` 被拒绝执行后其必须被调用，其第一个参数为 `promise` 的据因
- 在 `promise` 被拒绝执行前其不可被调用
- 其调用次数不可超过一次

#### 调用时机

`onFulfilled` 和 `onRejected` 只有在[执行环境](http://es5.github.io/#x10.3)堆栈仅包含**平台代码**时才可被调用

#### 调用要求

`onFulfilled` 和 `onRejected` 必须被作为函数调用（即没有 `this` 值）

#### 多次调用

`then` 方法可以被同一个 `promise` 调用多次

- 当 `promise` 成功执行时，所有 `onFulfilled` 需按照其注册顺序依次回调
- 当 `promise` 被拒绝执行时，所有的 `onRejected` 需按照其注册顺序依次回调

#### 返回

`then` 方法必须返回一个 `promise` 对象：

```javascript
promise2 = promise1.then(onFulfilled, onRejected);
```

- 如果 `onFulfilled` 或者 `onRejected` 返回一个值 `x` ，则运行**Promise解决过程**：`[[Resolve]](promise2, x)`
- 如果 `onFulfilled` 或者 `onRejected` 抛出一个异常 `e` ，则 `promise2` 必须拒绝执行，并返回拒因 `e`
- 如果 `onFulfilled` 不是函数且 `promise1` 成功执行， `promise2` 必须成功执行并返回相同的值
- 如果 `onRejected` 不是函数且 `promise1` 拒绝执行， `promise2` 必须拒绝执行并返回相同的据因

### Promise 解决过程

**Promise 解决过程** 是一个抽象的操作，其需输入一个 `promise` 和一个值，我们表示为 `[[Resolve]](promise, x)`，如果 `x` 有 `then` 方法且看上去像一个 Promise ，解决程序即尝试使 `promise` 接受 `x` 的状态；否则其用 `x` 的值来执行 `promise` 。

这种 *thenable* 的特性使得 Promise 的实现更具有通用性：只要其暴露出一个遵循 Promise/A+ 协议的 `then` 方法即可；这同时也使遵循 Promise/A+ 规范的实现可以与那些不太规范但可用的实现能良好共存。

运行 `[[Resolve]](promise, x)` 需遵循以下步骤：

1. `x` 与 `promise` 相等

	如果 `promise` 和 `x` 指向同一对象，以 `TypeError` 为据因拒绝执行 `promise`

2. `x` 为 Promise

	- 如果 `x` 处于等待态， `promise` 需保持为等待态直至 `x` 被执行或拒绝
	- 如果 `x` 处于执行态，用相同的值执行 `promise`
	- 如果 `x` 处于拒绝态，用相同的据因拒绝 `promise`

3. `x` 为对象或函数

	- 把 `x.then` 赋值给 `then` [注5](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/#note-5)
	- 如果取 `x.then` 的值时抛出错误 `e` ，则以 `e` 为据因拒绝 `promise`
	- 如果 `then` 是函数，将 `x` 作为函数的作用域 `this` 调用。传递两个回调函数作为参数，第一个参数叫做 `resolvePromise`，第二个参数叫做 `rejectPromise`：
		- 如果 `resolvePromise` 以值 `y` 为参数被调用，则运行 `[[Resolve]](promise, y)`
		- 如果 `rejectPromise` 以据因 `r` 为参数被调用，则以据因 `r` 拒绝 `promise`
		- 如果 `resolvePromise` 和 `rejectPromise` 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
		- 如果调用 `then` 方法抛出了异常 `e`：
			- 如果 `resolvePromise` 或 `rejectPromise` 已经被调用，则忽略之
			- 否则以 `e` 为据因拒绝 `promise`
	- 如果 `then` 不是函数，以 `x` 为参数执行 `promise`

	- 如果 `x` 不为对象或者函数，以 `x` 为参数执行 `promise`

如果一个 promise 被一个循环的 *thenable* 链中的对象解决，而 `[[Resolve]](promise, thenable)` 的递归性质又使得其被再次调用，根据上述的算法将会陷入无限递归之中。算法虽不强制要求，但也鼓励施者检测这样的递归是否存在，若检测到存在则以一个可识别的 `TypeError` 为据因来拒绝 `promise`。

# Promise 实现

```javascript
const PENDING = 'pending';

const FULFILLED = 'fulfilled';

const REJECTED = 'rejected';

class Promise {

  promiseState = PENDING;

  promiseResult = undefined;

  #thenables = [];

  #catchables = [];

  constructor(excutor) {
    if (typeof excutor !== 'function') {
      throw new TypeError(`Promise resolver ${excutor} is not a function`);
    }

    const resolve = value => {
      if (this.promiseState === PENDING) {
        this.promiseState = FULFILLED;
        this.promiseResult = value;
        setTimeout(() => this.#thenables.forEach(onFulfilled => onFulfilled()), 0);
      }
    }

    const reject = reason => {
      if (this.promiseState === PENDING) {
        this.promiseState = REJECTED;
        this.promiseResult = reason;
        setTimeout(() => this.#catchables.forEach(onRejected => onRejected()), 0);
      }
    }

    try {
      excutor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };
    const promise = new Promise((resolve, reject) => {
      if (this.promiseState === PENDING) {
        this.#thenables.push(() => {
          try {
            const x = onFulfilled(this.promiseResult);
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
        this.#catchables.push(() => {
          try {
            const x = onRejected(this.promiseResult)
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      } else if (this.promiseState === FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.promiseResult)
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      } else if (this.promiseState === REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected(this.promiseResult);
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
    });
    return promise;
  }
}

function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    reject(new TypeError(''));
  } else if (x && (typeof x === 'function' || typeof x === 'object')) {
    let used = false;
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(x,
          y => {
            if (used) { return; }
            used = true;
            resolvePromise(promise, y, resolve, reject);
          },
          r => {
            if (used) { return; }
            used = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch (error) {
      if (used) { return; }
      used = true;
      reject(error);
    }
  } else {
    resolve(x);
  }
}
```

# 测试

1. 安装 `promises-aplus-tests` 库

2. 添加代码：

	```javascript
	Promise.defer = Promise.deferred = function () {
	  let dfd = {};
	  dfd.promise = new Promise((resolve, reject) => {
	    dfd.resolve = resolve;
	    dfd.reject = reject;
	  });
	  return dfd;
	}
	
	module.exports = Promise;
	```

3. 终端运行 `npx promises-aplus-tests .\promise.js`


**参考列表**

1. [Promise A+ 规范翻译](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/)
2. [Promise A+ 规范和解读](http://yuanjin.tech/article/102)
3. [Promise A+ 规范](https://promisesaplus.com/)
4. [Promise的源码实现（完美符合Promise/A+规范）](https://github.com/YvetteLau/Blog/issues/2)

