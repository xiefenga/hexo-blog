---
title: Promise总结
date: 2021-02-25 12:19:35
tags: JavaScript
categories: [编程语言, JavaScript]
cover: http://oss.xiefeng.tech/img/20210225122345.jpeg
keywords: Promise
---

# ES6异步模型

`Promise` 是异步编程的一种解决方案，比传统的解决方案——回调函数和事件，更合理和更强大。它由社区最早提出和实现，ES6 将其写进了语言标准，统一了用法，原生提供了 `Promise` 对象。

1. 一件可能发生异步操作的事情，分为两个阶段：`unsettled` 和 `settled`。

	- `unsettled`： 未决阶段，表示事情还在进行前期的处理，并没有发生通向结果的那件事
	- `settled`：已决阶段，事情已经有了一个结果，不管这个结果是好是坏，整件事情无法逆转

	事情总是从**未决阶段**逐步发展到**已决阶段**的。并且，未决阶段拥有控制何时通向已决阶段的能力。

2. 事情被划分为三种状态： `pending`、`fulfilled`、`rejected`。

	- `pending`：处于未决阶段，则表示这件事情还在挂起，最终的结果还没出来。
	- `resolved/fulfilled`：已决阶段的一种状态，是一个可以按照正常逻辑进行下去的结果
	- `rejected`：已决阶段的一种状态，是一个无法按照正常逻辑进行下去的结果，通常用于表示有错误

	把状态推向`fulfilled`状态的过程叫做：`resolve`，推向该状态时，可能会传递一些数据；推向`rejected`状态的过程叫做：`reject`，推向该状态时，同样可能会传递数据，通常为错误信息。

	**无论是阶段，还是状态，是不可逆的，一旦改变无法逆转。**

3. 当事情达到已决阶段后，通常需要进行后续处理，不同的已决状态，决定了不同的后续处理。

	- `fulfilled`：这是一个正常的已决状态，后续处理表示为 `thenable`
	- `rejected`：这是一个非正常的已决状态，后续处理表示为 `catchable`

	后续处理可能有多个，因此会形成作业队列，这些后续处理会按照顺序，当状态到达后依次执行。

4. 整件事称之为 `Promise`

![Promise](http://oss.xiefeng.tech/img/20210225182153.png)

# 基本使用

`Promise`是一个构造函数，用来生成 `Promise` 实例，未决阶段的处理会立即执行（`Promise` 新建后就会立即执行）

`resolve` 和 `reject` 均可以传递最多一个参数，表示推向状态的数据

```js
const promise = new Promise((resolve, reject) => {
    // 未决阶段的处理立即执行
    Math.random() < 0.5 ? resolve(1) : reject('error');
});
```

通过 `Promise.prototype.then` 注册 `fulfilled` 和 `rejected` 状态的函数

```js
promise.then(data => {
    // thenable 处理函数
},err => {
    // catchable 处理函数
});
```

通过 `Promise.prototype.catch` 注册 `rejected` 状态的函数

```js
promise.catch(err => {
    // catchable 处理函数
});
```

`thenable` 和 `catchable` 函数都可以注册多个，执行时会按照注册顺序执行

**注意点**

1. 运行到注册 `thenable` / `catchable` 函数时，如果 `Promise` 的状态已决，该函数会立即执行；如果是未决，则会加入到**作业队列**，等待到达 `fulfilled` / `rejected` 状态后再执行

2. `thenable` / `catchable` 函数是异步的，也就是说第一点的立即执行说的不准确，应该是立即放入事件队列的微任务队列等待同步函数执行完再执行

	```js
	const promise = new Promise((resolve, reject)=>{
	    setTimeout(() => resolve(1), 1000);
	});
	
	console.log(promise); 
	promise.then(data => console.log(data));
	console.log(promise);
	// pending
	// pending
	// 1
	```

3. 在未决阶段的处理函数中，如果发生未捕获的错误，会将状态推向 `rejected`，并会被 `catchable` 函数捕获

	```js
	const promise = new Promise(() => throw new Error('出错了'));
	
	console.log(promise);  // rejected
	
	promise.catch(err => console.log(err)); // Error: 出错了
	```

4. 一旦状态推向了已决阶段，无法再对状态做任何更改，也就是说，一旦状态变为 `fulfilled` / `rejected` 再执行 `reject` / `resolve` 函数或者抛出错误是没有办法再改变状态的

	```js
	const promise = new Promise((resolve, reject)=>{
	    throw new Error('出错了');
	    resolve(1);
	});
	
	console.log(promise);  // rejected
	promise.then(data => console.log(data), err => console.log(err)); // Error: 出错了
	```

5. 如果 `resolve` 的参数是另一个 `Promise`，则该 `Promise` 的状态和参数由那个 `Promise` 参数的状态决定

	```js
	const promise1 = new Promise((resolve, reject) => Math.random() < 0.5 ? resolve(1) : reject('error'));
	
	const promise2 = new Promise((resolve, reject) => resolve(promise1));
	
	promise2.then(data => console.log(data), err => console.log('err', err));
	
	console.log(promise1 === promise2); // false
	```

6. 如果 `reject` 参数的另一个参数是 `Promise`，则该 `Promise` 的状态为 `rejected`，`err` 参数为传入的参数 `Promise`

	```js
	const promise1 = new Promise((resolve, reject) => reject(1));
	
	const promise2 = new Promise((resolve, reject) => reject(promise1));
	
	promise2.then(data => console.log(data), err => console.log('err', err, err === promise1))
	// err Promise {<rejected>: 1} true
	```

# Promise 的串联

`Promise.prototype.then` 和 `Promise.prototype.catch` 函数可以注册已决阶段处理的函数，并且他们都返回一个新的 `Promise`。

1. 只有当当前的 `Promise` 的状态已决并且处理函数执行完该 `Promise` 的状态才会从 `pendding` 变为 `fulfilled` / `rejected`，并且 `thenable` / `catchable` 函数的返回值就是这个新的 `Promise` 的数据

2. 无论这个 `Promise` 是`then` 函数还是 `catch` 返回的，只要该处理函数没有抛出未捕获的错误，新的 `Promise` 的状态一定是 `fulfilled`

	```js
	const promise1 = new Promise((resolve, reject) => {
	    setTimeout(() => {
	        resolve(1)
	    }, 1000);
	})
	
	const promise2 = promise1.then(data => {
	    console.log(data);
	    return 2;
	});
	
	console.log(promise1, promise2)
	
	setTimeout(() => {
	    console.log(promise1, promise2);
	}, 1000);
	
	// Promise {<pending>} Promise {<pending>}
	// 1
	// Promise {<pending>: 1} Promise {<pending>: 2}
	```

3. 如果前面的 `Promise` 的后续处理，返回的是一个 `Promise`，则返回的新的 `Promise` 状态和后续处理返回的 `Promise` 状态保持一致，并且数据也一致

	```js
	const promise1 = new Promise((resolve, reject) => resolve(1));
	
	let p;
	
	const promise2 = promise1.then(data => {
	    console.log(data);
	    p = new Promise((resolve, reject) => reject(2));
	    return p;
	});
	
	console.log(promise1, promise2);
	
	setTimeout(() => {
	    console.log(promise2, p, promise2 === p);
	}, 1000);
	// Promise {<pending>: 1}  Promise {<pending>}
	// 1
	// Promise {<rejected>: 2} Promise {<rejected>: 2} false
	```

4. `catchable` 函数可以捕获前面所有未捕获的错误

	```js
	new Promise((resolve, reject) => {
	    resolve(1);
	}).then(data => {
	    // ...
	}).catch(err => {
	    //...
	}) // 可以捕获前面所有的错误
	```

5. 如果 `then/catch` 中并没有传入回调函数，那么 `then/catch` 将创建一个没有经过回调函数处理的新 `Promise` 对象，这个新 `Promise` 只是简单地接受原 `Promise` 的终态作为它的终态。

	```js
	const promise1 = new Promise((resolve, reject) => resolve(1));
	
	const promise2 = promise1.then();
	
	promise2.then(res => console.log(res));
	
	console.log(promise1, promise2, promise1 == promise2)
	// Promise {<fulfilled>: 1} Promise {<pending>} false
	// 1
	```

# 其他API

## Promise.prototype.finally

> ES 2018 引入

该方法用于指定不管 `Promise` 对象最后状态如何，都会执行操作，该方法没有参数，这表明`finally`方法里面的操作，应该是与状态无关的，不依赖于 `Promise` 的执行结果。

`finally` 方法返回的 `Promise` 的数据是原来的数据，`finally` 的实现：

```js
Promise.prototype.finally = function (callback) {
    return this.then(
        value  => Promise.resolve(callback()).then(() => value),
        reason => Promise.resolve(callback()).then(() => { throw reason })
    );
};
```

## Promise.resolve

- 传递普通参数该方法返回一个 `fulfilled` 状态的 `Promise`，传递的数据作为状态数据

	```js
	console.log(Promise.resolve(1)); // Promise {<fulfilled>: 1}
	// 等同于 new Promise(resolve => resolve(data));
	```

- 如果传递的参数是一个 `Promise` ，则直接返回该 `Promise`

	```js
	const promise1 = new Promise(resolve => resolve(1));
	const promise2 = Promise.resolve(promise1);
	console.log(promise1 == promise2);  // true
	
	const promise3 = new Promise((resolve, reject) => reject(1));
	const promise4 = Promise.resolve(promise3);
	console.log(promise3 == promise4);  // true
	```

- 传入的参数是一个 `thenable`对象，会将这个对象转为 Promise 对象，然后立即执行 `thenable` 对象的`then()`方法

	`thenable` 对象指的是具有 `then `方法的对象：

	```js
	const thenable = {
	    then(resolve, reject) {
	        console.log(1);
	        reject(42);
	    }
	};
	const promise = Promise.resolve(thenable);
	console.log(promise);
	
	setTimeout(() => {
	    console.log(promise)
	}, 0);
	// Promise {<pending>}
	// 1
	// Promise {<rejected>: 42} 
	```

	这个立即执行 `then` 方法，**立即执行**可能需要打问号。

## Promise.reject

等同于：

```js
new Promise((resolve, reject) =>  reject(err));
```

## Promise.all

将多个 `Promise` 实例，包装成一个新的 `Promise` 实例，参数必须实现 `Iterator` 接口，每个成员都是 `Promise` 实例，如果不是会调用 `Promise.resolve` 进行包装。

所有的`Promise`对象都 `resloved` 的时候才会 `fulfilled`，只要有一个 `rejected` 该`Promise`对象就会 `rejected`

`thenable` 的参数为一个包含所有`Promise` 数据的数组，`catchable` 的参数为第一个`rejected`的 `Promise` 对象的错误信息。

## Promise.race

和 `Promise.all` 类似，将多个 `Promise` 实例，包装成一个新的 `Promise` 实例，区别就是只要有一个`Promise`已决，整个`Promise` 就已决，状态和数据取决于第一个已决的 `Promise`。

## Promise.allSettled 

> ES 2020 引入

`Promise.allSettled()`方法接受一组 `Promise` 实例作为参数，包装成一个新的 `Promise` 实例，和 `Promise.all`类似，不同的是返回的`Promise`对象始终是 `fulfilled`，参数为一个这样的数组：

```js
const resolved = Promise.resolve(42);
const rejected = Promise.reject(-1);
Promise.allSettled([resolved, rejected]).then(res => console.log(res));

// [
//    { status: 'fulfilled', value: 42 },
//    { status: 'rejected', reason: -1 }
// ]
```

## Promise.any

> ES 2020 引入

该方法接受一组 `Promise` 实例作为参数，包装成一个新的 `Promise` 实例返回。只要参数实例有一个变成`fulfilled`状态，包装实例就会变成`fulfilled`状态；如果所有参数实例都变成`rejected`状态，包装实例就会变成`rejected`状态。