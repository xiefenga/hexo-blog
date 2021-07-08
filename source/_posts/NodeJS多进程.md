---
title: NodeJS多进程
date: 2021-06-26 18:16:56
tags: [JavaScript, NodeJS]
categories: [后端, NodeJS]
cover: http://oss.xiefeng.tech/img/20210626205227.jpg
---

# 多进程

通过 `child_process` 模块即可创建多进程，被创建的进程称之为子进程，创建进程的进程称之为父进程。

多进程的意义在于可以充分利用计算机的 CPU 资源，早期的 Node 没有提供创建线程的方式，只有通过创建多个子进程来充分利用多核 CPU。

相比于多线程，虽然线程更加轻量，但是一个进程崩溃并不会影响另一个，而一个线程崩溃则整个进程都会崩溃，这对于服务器来说是不可接受的，所以一般都会使用 pm2 等工具部署，因为提供了守护进程用于守护 Node 进程。

**如果使用子进程，尽量使用 commonjs 模块而不是 ES 模块，具体的看 [issue](https://github.com/nodejs/node/issues/39140)**

## 创建子进程

`child_process` 提供了同步和异步两种方式创建子进程，一般都是使用异步的方式创建：

- `exec`：创建一个子进程（shell）执行命令，通过回调（子进程退出时调用）可以获取 shell 的输出
- `spawn`：创建一个子进程（shell）执行命令，但是没有回调去获取输出
- `execFile`：创建一个子进程执行可执行文件，如果是 js 文件则文件开头必须有 `#!/user/bin/env node` 
- `fork`：创建一个子进程执行 js 文件

```javascript
// exec
const child = exec('node -v',  (err, stdout, stderr) => console.log(stdout));

// spawn
const child = spawn('node', ['-v']);
child.on('spawn', () => child.stdout.pipe(process.stdout));

// execFile
const child = execFile('./worker.js');

// fork
const child = fork('./worker.js');
```

## 进程通信

对于父进程来说，创建子进程是用来干活的，很重要的一点就是进程间通信（IPC）了。

实现进程间通信的方式有很多，比如：管道、socket、信号量、共享内存、消息队列、Domain Socket等。

Node 实现 IPC 采用的管道（这是一个抽象层面的称呼），具体的细节由 libuv 实现：在 windows 下采用命名管道实现，而*nix系统则采用 Unix Domain Socket 实现。

对于上层的暴露的接口十分简单，通过 `send` 方法和 `message` 事件即可实现 Node 进程间的通信：

```javascript
/* master.js */
const worker = fork(join(__dirname, './worker.js'));
// 子进程创建成功触发此事件
worker.on('spawn', () => worker.send('hello'));

/* worker.js */
console.log('子进程启动成功, processID:', process.pid);
// 子进程收到消息则会触发
process.on('message', msg =>  console.log('子进程收到消息:', msg));
```

**实现通信过程：**

1. 父进程在实际创建子进程之前，会先创建IPC通道并监听它，然后再真正的创建子进程。
2. 通过环境变量 `NODE_CHANNEL_FD` 告知子进程 IPC 通道的文件描述符
3. 子进程在启动过程中，根据文件描述符去连接该 IPC 通道

![](http://oss.xiefeng.tech/img/20210626184654.png)

## 传递句柄

`send` 方法除了可以发送一般的数据，还可以传递句柄（文件描述符），支持 TCP 和 UDP 套接字。

利用 `send` 发送套接字即可实现多个子进程监听同一个端口：

```javascript
/* master.js */
const server = require('net').createServer(socket => socket.end('父进程处理请求\n'));

const workers = new Map();

for (let i = 0; i < cpus().length; i++) {
    const worker = fork('./worker.js');
    workers.set(worker.pid, worker);
}

server.listen(8080, () => workers.forEach(w => w.send('server', server)));

/* worker.js */
process.on('message', (msg, server) => {
    if (msg === 'server') {
        server.on('connection', socket => socket.end(`子进程 ${process.pid} 处理请求\n`));
    }
});
```

正常的让多个进程都创建服务器监听同一个端口是一定会被报错的，但是通过传递套接字的文件描述符的方式可以实现多个进程监听同一个端口。

### 消息传递过程

当通过 IPC 发送消息时，消息会先被封装成一个对象，而所谓的文件描述符（句柄）本质上就是一个数字。

消息对象会被 `JSON.stringify` 进行序列化之后再传入 IPC 通道，最终发入 IPC 通道的都是字符串消息。

```json
{
    cmd: "NODE_HANDLE",
    type: "net.Server",
    msg: message
}
```

当子进程接收到父进程发来的消息，会先通过 `JSON.parse` 解析消息，然后触发 `message` 事件将消息传递上去。

![](http://oss.xiefeng.tech/img/20210626192703.png)

### 句柄的传递

在传递消息过程中，如果消息对象的 `message.cmd` 以 `NODE_` 为前缀则会响应一个内部事件 `internalMessage`。

如果 `message.cmd` 的值为 `NODE_HANDLE`，则会依据 `message.type` 的值和文件描述符一起还原出一个对象。

还原对象具体过程：

例如`message.type` 值为 `net.Socket`，则会通过 `new net.Socket` 创建一个套接字对象，并让该对象监听文件描述符。

`net.Socket` 的 `listen` 方法不仅可以监听端口，也可以监听某个套接字。

而我们在 `message` 事件处理程序中得到的 `handle` 就是这个新创建的 `net.Server` 对象。

```javascript
// 伪代码
const server = new net.Server();
server.listen(fd);
```

句柄的传递和还原造成了我们能够收到原始套接字的假象，IPC 通信能够传递的仅仅只是字符串数据。

### 抢占式

当多个应用监听相同的端口时，文件描述符同一时间只能被一个进程所使用，所以当来请求时只有一个进程能够幸运的抢到连接，这也是 Node 默认提供的方式：操作系统的抢占式策略。

![](http://oss.xiefeng.tech/img/20210626203643.png)

## 多进程处理HTTP

通过利用 ICP 传递 TCP 套接字属性描述符，再利用 http 服务器的 `connection` 事件复用套接字实现多进程处理http请求。

```javascript
/* master.js */
const { fork } = require('child_process');

const server = require('net').createServer();

const workers = new Map();

for (let i = 0; i < 4; i++) {
    const worker = fork('./worker.js');
    workers.set(worker.pid, worker);
}

server.listen(8080, () => {
    console.log('8080');
    workers.forEach(w => w.send('server', server);
	server.close(); // 甚至可以让主进程取消监听
}));

/* master.js */
const server = require('http').createServer((req,res) => {
    res.end(`子进程 ${process.pid} 处理请求\n`);
});

process.on('message', (msg, tcp) => {
    if (msg === 'server') {
        tcp.on('connection', socket => {
            console.log('connection');
            server.emit('connection', socket);
        });
    }
});
```

![](http://oss.xiefeng.tech/img/20210626203120.png)

## 守护进程

一般主进程都是不需要执行子进程执行的那些任务而是对子进程进行管理。

例如：创建数量合适的子进程充分利用多核 CPU 资源，当有一个子进程意外退出时及时重启子进程。

```javascript
/* master.js */
worker.on('exit', () => fork('./worker.js'));
```

# 集群

实现了多个进程监听同一个端口，则可以尝试构建集群充分利用多核 CPU 资源迎接客户端的大量请求了。

## 简化

构建集群需要考虑很多的问题：

- 端口占用问题
- 多个进程的存活状态
- 工作进程的重启
- 负载均衡
- ..............

使用 `child_process` 可以非常灵活的构建集群，但是需要考虑非常多的细节。

Node 提供的 `cluster` 模块可以比较方便的构建集群，最重要的就是不用考虑端口占用问题。

```javascript
const cluster = require('cluster');
const http = require('http');
const count = require('os').cpus().length;

if (cluster.isMaster) {
    // 衍生工作进程。
    for (let i = 0; i < count; i++) {
        cluster.fork();
    }
} else {
    console.log(`工作进程 ${process.pid} 已启动`);
    // 工作进程可以共享任何 TCP 连接,共享的是 HTTP 服务器也行
    http.createServer((_, res) => res.end(`工作进程 ${process.pid} 处理请求`)).listen(8000);
}
```

其他的像子进程的调度策略、子进程的状态监听等都可以比较方便的实现。

## 工作原理

`cluster` 模块就是 `child_process` 和 `net` 的组合应用，只不过内部帮我们实现好了，这部分对我们是透明的。

当 `culster` 启动时会在内部启动 TCP 服务器，父进程会将 TCP 的套接字发送给子进程。

通过 `culster.fork` 出来的子进程存在环境变量 `NODE_UNIQUE_ID`，只要子进程存在该环境变量并且子进程中创建了服务器使用了 `listen` 进行端口的监听，就会自动的通过监听文件描述符，以达到多个进程监听相同端口的目的。

具体的原理：[cluster 实现原理](https://cnodejs.org/topic/56e84480833b7c8a0492e20c)









