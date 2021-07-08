---
title: Node事件循环
date: 2021-03-07 17:17:34
tags: 
- JavaScript
- NodeJS
categories: [编程语言, JavaScript]
cover: http://oss.xiefeng.tech/img/20210307173031.jpg
katex:
keywords: 事件循环, JavaScript
---

# Node事件循环

当 Node.js 启动后，它会初始化事件循环，处理已提供的输入脚本，它可能会调用一些异步的 API、调度定时器，或者调用 `process.nextTick()`，然后开始处理事件循环。

![](http://oss.xiefeng.tech/img/20210307153001.png)

事件循环分为六个阶段，每个阶段都有一个 FIFO 队列来执行回调。

通常情况下，当事件循环进入给定的阶段时，将执行该阶段队列中的回调，直到队列用尽或最大回调数已执行。当该队列已用尽或达到回调限制，事件循环将移动到下一阶段。

## 阶段概述

- **timers**：本阶段执行已经被 `setTimeout()` 和 `setInterval()` 的调度回调函数。
- **pending**：系统级回调
- **idle, prepare**：仅系统内部使用
- **poll**：执行与 I/O 相关的回调（除了关闭的回调函数，那些由计时器和 `setImmediate()` 调度的之外的几乎所有回调）
- **check**：`setImmediate()` 回调函数在这里执行。
- **close**：一些关闭的回调函数，如：`socket.on('close', ...)`。

在每次运行的事件循环之间，Node.js 检查它是否在等待任何异步 I/O 或计时器，如果没有的话，则完全关闭。

## 阶段详情

### timers

在 Node 中，计时器分为 `Immediate` 和 `Timeout` 两类，这两种计时器都是一个 Node 对象。`Timeout` 类计时器的回调在该阶段执行。

一旦计时器过期，在下一轮事件循环的 timers 阶段就会调用回调。

Node 中 `setInterval` 和 `setTimeout` 都可创建该类计时器，在创建该计时器时， `delay` 参数是可选的，如果没有提供值或指定的值为 0，那么该参数值默认情况下为 1 毫秒。

和浏览器类似，计时器也是不够准确的，因为不是计时器一过期就会执行，只有到达该阶段才会执行。

### pending

一些系统级回调将会在此阶段执行。例如，TCP 套接字在尝试连接时接收到 `ECONNREFUSED`，则某些 *nix 的系统希望等待报告错误。

### poll

I/O 回调在此阶段执行，例如 `fs.readFile`、`http.createServer`，而且该阶段是 Node 事件循环中最常呆的阶段。

轮询阶段所做的事：

1. 如果该阶段队列不为空，则循环访问回调队列并同步执行它们，直到队列已用尽或者达到了与系统相关的硬性限制
2. 如果该阶段的队列为空且其他阶段队列不为空，则该阶段结束
3. 如果该阶段的队列为空且其他阶段队列也为空阻塞

```javascript
const fs = require('fs');

const start = Date.now();

function sleep(n) {
  const start = Date.now();
  while (Date.now() - start < n);
}

setTimeout(() => {
  console.log('timeout', Date.now() - start);
}, 100);


fs.readFile('./index.html', () => {
  console.log('readFile', Date.now() - start);
  sleep(200);
});

// readFile 3
// timeout 208
```

### check

只有 `setImmediate()` 回调会在该阶段中执行。这使能够在 poll 阶段变得空闲时立即执行一些代码。

`setImmediate` 和 `setTimeout` 的区别：

1. 两者所属队列不同
2. `setImmediate` 会立即将回调加入 checks 队列，而 `setTimeout` 会开启计时器线程，等待计时器过期

3. `setImmediate` 比 `setTimeout` 效率高

	```javascript
	function test(fn, name) {
	    let i = 0;
	    console.time(name);
	    const run = () => {
	        i++;
	        if (i < 1000) {
	            fn(run);
	        } else {
	            console.timeEnd(name);
	        }
	    }
	    run();
	}
	
	test(setTimeout, 'setTimeout');
	test(setImmediate, 'setImmediate');
	// setImmediate: 6.696ms
	// setTimeout: 1.698s
	```

4. 计时器受进程性能的约束，二者的回调运行顺序非确定，取决于系统当时的状况

	```javascript
	setTimeout(() => {
	  console.log('timeout');
	}, 0);
	
	setImmediate(() => {
	  console.log('immediate');
	});
	```

## nextTick

`process.nextTick()` 是异步 API 的一部分，但从技术上讲不是事件循环的一部分。

每次执行一个事件循环中**每个阶段**的每一个回调之前，必须要清空 nextTick 队列和 microtask 队列。

根据语言规范，`Promise` 对象的回调函数，会进入异步任务里面的 microtask队列。

但是在 Node 中微任务队列追加在 `process.nextTick` 队列的后面，而且只有一个队列清空完毕才会清空另一个。

```javascript
process.nextTick(() => {
    console.log(1);
    process.nextTick(() => {
        console.log(2)
    })
});
Promise.resolve().then(() => console.log(3));
process.nextTick(() => console.log(4));
Promise.resolve().then(() => console.log(5));
// 1
// 4
// 2
// 3
// 5
```