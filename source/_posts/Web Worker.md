---
title: Web Worker
tags:
- JavaScript
categories:
- 前端
- Web API
cover: 'http://oss.xiefeng.tech/img/20210328122054.jpg'
date: 2021-03-28 12:16:00
---

# 工作者线程

Web Worker 赋予了浏览器中的 JavaScript 多线程并发执行任务的能力。

传统的多线程模型（例如：POSIX 线程或者 Java 线程）不适合 JavaScript，因为像 DOM 这样的 API 会出现问题。

而这也正是工作者线程的价值所在：允许把主线程的工作转嫁给独立的实体，而不会改变现有的单线程模型。

Web 工作者线程规范中定义了三种主要的工作者线程：

- **专用工作者线程**：通常简称为Web Worker，脚本可以单独创建一个 JavaScript 线程执行委托的任务

- **共享工作者线程**：与专用工作者线程非常相似，主要区别是共享工作者线程可以被多个不同的上下文使用

- **服务工作者线**：与专用工作者线程和共享工作者线程截然不同。它的主要用途是拦截、重定向和修改页面发出的请求

# 专用工作者线程

专用工作者线程可以称为后台脚本，JavaScript 线程的各个方面，包括生命周期管理、代码路径和输入/输出，都由初始化线程时提供的脚本来控制。

## 创建

通过 `Worker` 构造函数创建专用 Worker 线程，构造函数返回一个 Worker 实例，通过该实例可以和 Worker 通信。

有两种创建 Worker 的方式，一种是通过同源的 URL，一种是通过行内生成Object URL 的方式。

```javascript
const worker = new Worker('./worker.js', { type: "module" });

console.log(worker); // Worker { }


// 通过行内的方式创建 Worker
const workerScript = `
	self.onmessage = ({data}) => console.log(data);
`;
const workerScriptBlob = new Blob([workerScript]);

const workerScriptBlobUrl = URL.createObjectURL(workerScriptBlob);
const worker = new Worker(workerScriptBlobUrl);
```

第二个参数可以传递配置：

- `name`：可以在工作者线程中通过 `self.name` 读取到的字符串标识符
- `type`：脚本的运行方式
	- `classic`：脚本作为常规脚本来执行
	- `module`：脚本作为模块执行
- `credentials`：在 `type` 为 `"module"` 时，指定如何获取与传输凭证数据相关的工作者线程模块脚本
	- 这些选项与 `fetch` 的凭证选项相同
	- `omit`、`same-orign`、`include`

## 实例

构造函数返回的 Worker 对象是与刚创建的专用工作者线程通信的连接点。它可用于在工作者线程和父上下文间传输信息，以及捕获专用工作者线程发出的事件。

### 事件

- `onerror`：该事件会在工作者线程中抛出错误时发生
- `onmessage`：该事件会在工作者线程向父上下文发送消息时发生
- `onmessageerror`：该事件会在工作者线程收到无法反序列化的消息时发生

由于 Worker 继承自 EventTarget，事件也可以通过 `worker.addEventListener` 来注册。

如果工作者线程脚本抛出了错误，该工作者线程沙盒可以阻止它打断父线程的执行。即在父线程中无法捕获，只能通过事件。

```javascript
// worker.js
throw Error('foo');

// main.js
try {
    const worker = new Worker('./worker.js');
    console.log('no error');
} catch(e) {
    console.log('caught error');
}
// no error

const worker = new Worker('./worker.js');
worker.onerror = console.log; 
// ErrorEvent {message: "Uncaught Error: foo"}
```

### 方法

- `postMessage`：用于通过异步消息事件向工作者线程发送信息
- `terminate`：用于立即终止工作者线程。没有为工作者线程提供清理的机会，脚本会突然停止

## 全局对象

专用工作者线程的全局作用域是 `DedicatedWorkerGlobalScope` 的实例。因为这继承自 `WorkerGlobalScope`，所以包含它的所有属性和方法。工作者线程可以通过 `self` 关键字访问该全局作用域。

`DedicatedWorkerGlobalScope` 增加的属性和方法：

- `name`：Worker 构造函数的一个可选的字符串标识符
- `postMessage`：与 `worker.postMessage` 对应的方法，用于从工作者线程内部向父上下文发送消息 
- `close`：与 `worker.terminate` 对应的方法，用于立即终止工作者线程
- `importScripts`：可以加载任意源的脚本，只能在 `classic` 脚本中使用，可以接收任意数量的脚本

## 通信

与工作者线程的通信都是通过异步消息完成的。

### postMessage

可以使用 `postMessage` 在主线程和工作者线程之间传递消息，传递的数据保存在事件对象 `e` 的 `data` 属性中。

```javascript
// worker.js
function factorial(n) {
    let result = 1;
    while (n) { result *= n--; }
    return result;
}

self.onmessage = (e) => self.postMessage(`${e.data}! = ${factorial(e.data)}`);

// main.js
const worker = new Worker('./worker.js');

worker.onmessage = e => console.log(e.data);

worker.postMessage(5);
```

### MessageChannel

`MessageChannel` 接口允许我们创建一个新的消息通道，并通过它的两个端口（`MessagePort` 实例）发送数据。

`MessagePort` 实例具有 `onmessage` 等事件和 `postMessage` 方法。

```javascript
const channel = new MessageChannel();

console.log(channel);
```

![](http://oss.xiefeng.tech/img/20210328140040.png)

首先父线程需要将端口传递给子线程，然后再开始使用端口通信。

`MessagePort` 是可转移对象，可以使用 `postMessage` 的第二个参数进行传递端口，`MessagePort` 会自动保存在 `e.ports` 数组中。

```javascript
// worker.js
let messagePort = null;
// 通过在全局的事件接收端口
self.onmessage = e => {
    messagePort = e.ports[0];
    self.onmessage = null;
    // 通过 channel 进行数据的发送、接收
    messagePort.onmessage = e => messagePort.postMessage(`data: ${e.data}`);
}; 

// main.js
const channel = new MessageChannel();
const worker = new Worker('./worker.js');

worker.postMessage(null, [channel.port1]);  // 把端口发送到工作者线程
// 通过 channel 发送、接收数据
channel.port2.onmessage = ({data}) => console.log(data);
channel.port2.postMessage(5);
```

使用 MessageChannel 实例与父进程通信感觉没有必要。MessageChannel 真正有用的地方是让两个子线程之间直接通信。

父线程创建一个 channel，并将端口传递给子线程，让子线程之间通过端口进行通信。

```javascript
// main.js
const channel = new MessageChannel();

const workerA = new Worker('./worker.js');

const workerB = new Worker('./worker.js');

workerA.postMessage('workerA', [channel.port1]);

workerB.postMessage('workerB', [channel.port2]);

// worker.js
let messagePort = null;

function sendData(target, data) {
    target.postMessage(data);
}

self.onmessage = ({data, ports}) => {
    if (ports.length) {
        messagePort = ports[0];
        messagePort.onmessage = ({data}) => sendData(self, data);
    } else {
        sendData(messagePort, data);
    }
}; 
```

### BroadcastChannel

`BroadcastChannel` 接口代理了一个命名频道，它允许同源的不同浏览器窗口、Tab页、frame或者 iframe 下的不同文档之间相互通信。

通过触发一个 `message` 事件，消息可以广播到所有监听了该频道的 `BroadcastChannel` 对象。

这种通道类型的设置比较简单， 不需要像 `MessageChannel` 那样转移乱糟糟的端口。

```javascript
// main.js
const channel = new BroadcastChannel('worker_channel');

const worker = new Worker('./worker.js');

channel.onmessage = ({data}) => {
    console.log(`heard ${data} on page`);
}

setTimeout(() => channel.postMessage('foo'), 1000);

// worker.js
const channel = new BroadcastChannel('worker_channel');

channel.onmessage = ({data}) => {
    console.log(`heard ${data} in worker`);
    channel.postMessage('bar');
} 
```

`BroadcastChannel` 这种信道没有端口所有权的概念，所以如果没有实体监听这个信道，广播的消息就不会有人处理。

在这种情况下，如果没有 `setTimeout`，则由于初始化工作者线程的延迟，就会导致消息已经发送了，但工作者线程上的消息处理程序还没有就位。

## 数据传输

工作者线程是独立的上下文，因此在上下文之间传输数据就会产生消耗。

在支持传统多线程模型的语言中，可以使用锁、互斥量，以及 volatile 变量。

JavaScript 中有三种在上下文间转移信息的方式：

- 结构化克隆算法
- 可转移对象
- 共享数组缓冲区

### 结构化克隆算法

结构化克隆算法可用于在两个独立上下文间共享数据。该算法由浏览器在后台实现，不能直接调用。

在通过 `postMessage` 传递对象时，浏览器会遍历该对象，并在目标上下文中生成它的一个副本。

###  可转移对象

使用可转移对象可以把所有权从一个上下文转移到另一个上下文。在不太可能在上下文间复制大量数据的情况下，这个功能特别有用。

只有几种对象是可转移对象：

- `ArrayBuffer`
- `MessagePort` 
- `ImageBitmap` 
- `OffscreenCanvas`

`postMessage` 方法的第二个可选参数是数组，它指定应该将哪些对象转移到目标上下文。

### SharedArrayBuffer

在把 `SharedArrayBuffer` 传给 `postMessage` 时，浏览器只会传递原始缓冲区的引用。

两个不同的上下文会分别维护对同一个内存块的引用。每个上下文都可以随意修改这个缓冲区， 防止出现错误可以使用 `Atomics` API。

# 共享工作者线程

共享工作者线程或共享线程与专用工作者线程类似，但可以被多个可信任的执行上下文访问。

例如：同源的两个标签页可以访问同一个共享工作者线程。

共享工作者线程通过 `SharedWorker` 构造函数创建，和 `Worker` 参数相同。

Worker 构造函数始终会创建新线程，而 SharedWorker 则只会在相同的标识不存在的情况下才创建新线程。

标识取决于脚本 URL、名称和文档源。

如果的确存在与标识匹配的共享工作者线程，则只会与已有共享者线程建立新的连接。

```javascript
new SharedWorker('./sharedWorker.js');
new SharedWorker('./sharedWorker.js');
new SharedWorker('./sharedWorker.js');
```

## 连接

SharedWorker 只有 `error` 事件和一个 `port` 属性，是一个 `MessagePort` 实例，专门用于通信。

在共享线程内部，全局作用域是 `SharedWorkerGlobalScope` 的实例，它没有 `postMessage` 等属性和事件，只有一个 `connect` 事件。

每次调用 SharedWorker 构造函数，无论是否创建了工作者线程，都会在共享线程内部触发 `connect` 事件。

发生 `connect` 事件时，SharedWorker 构造函数会隐式创建 MessageChannel 实例，并把 `MessagePort` 实例的所有权唯一地转移给该 SharedWorker 的实例。这个 `MessagePort` 实例会保存在 `connect` 事件对象的 `ports` 数组中。

所以 SharedWorker 想要通信需要通过该事件通过端口来通信。

```javascript
// main.js
const worker = new SharedWorker('./worker.js')

worker.port.onmessage = e => console.log(e)

worker.port.postMessage('aa');

// worker.js
self.onconnect = ({ ports }) => {
    ports[0].onmessage = e => {
        ports[0].postMessage(e.data)
    }
};
```

> 根据浏览器实现，在 SharedWorker 中把日志打印到控制台不一定能在浏览器默 认的控制台中看到。

在Chrome 中，SharedWorker 上下文中的打印统统看不到，只有 Firefox 能够隐晦的看到。





