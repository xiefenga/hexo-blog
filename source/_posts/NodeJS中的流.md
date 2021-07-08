---
title: NodeJS中的流
date: 2021-06-25 21:10:03
tags: [JavaScript, NodeJS]
categories: 
- [编程语言, JavaScript]
- [后端, NodeJS]
cover: http://oss.xiefeng.tech/img/20210625211616.jpg
---

# 流的意义

流的意义是我们可以不用将资源全部读入内存而是读一点消费一点，具有非常多的优点和用处。

Node 的 `stream` 模块提供了用于构建流接口的对象，但不提供某种流的具体实现。

`stream` api 的目的是为了限制数据的缓冲到**可接受**的程度，也就是读写速度不一致的源头与目的地不会压垮内存，而具体数据的处理（生产和消费）则需要自己实现。

也就是流在数据的生产和消费做了一层缓存，当读取流的时候读取的太慢则告知我们生成数据的速度就要降低，当将流从内存中写出时写的太快就要我们降低写的速度。

# 流的类型

Node 中共有四种类型的流：

- 可读流：对应的是 `stream.Readable` 类型
- 可写流：对应的是 `stream.Writable` 类型
- 双工流：对应的是 `stream.Duplex` 类型
- 转换流：对应的是 `stream.Transform` 类型

其中最重要的就是可读流和可写流；双工流存无非就是一个流既可读也可写，存在的原因是JavaScript中没有多继承；转换流本质就是一个双工流只不过在可读流和可写流进行数据转移时进行了数据的转换。

# 缓冲

既然流的目的是为了解决数据的两端（源头和目的地）速度不一致的问题，必然就需要用到缓存。

可写流和可读流都会在内部的缓冲器中存储数据，可以使用 `writableBuffer`、`readableBuffer` 属性获取。

流中有一个很重要的属性：`highWaterMark`

这个属性的意义在于表明这个流最多应该缓存多少的数据，超过应当停止向缓存队列中添加数据。

这个属性并不是 `writableBuffer`、`readableBuffer` 的大小，而是起到一个**阈值**的作用。

把数据看作水，把缓存队列看作水池，`highWaterMark` 就是水位警戒线，而当水位到达这个高度则应当暂停从源头添加数据，否则就会产生**背压**，流应当通过某种方式告知我们合适应当暂停写入数据。

当然了继续添加数据也可以，但是使用流的意义就不大了。

**对于可读流**

- 当调用 `stream.push` 时，数据会被缓冲在可读流中直到被消费

- 内部缓冲大于 `highWaterMark` 时，流应当暂时停止从底层资源读取数据，直到当前缓冲的数据被消费

**对于可写流**

- 当调用 `writable.write` 时，数据会被缓冲在可写流中
- 内部缓冲大于 `highWaterMark` 时，此时应暂时停止向流写数入据，直到缓冲的数据被写入底层

# 可写流

![](https://gw.alicdn.com/tfs/TB17EDKaMMPMeJjy1XcXXXpppXa-726-407.png#alt=node-stream-writable)

## 核心

- `'drain'` 事件：当缓冲达到 `highWaterMark` 后，当队列可继续写入时触发

- `write`方法：写入数据到流，接收数据后内部缓冲超过 `highWaterMark` 返回 `false`

可写流通过 `write` 方法的返回值告知我们是否需要暂停写入数据，通过 `drain` 事件通知我们何时恢复写入。

## 实现

`stream.Writable` 类用于实现可读流，实现（自定义）可读流必须实例化该类并实现 `_write` 或 `_writev` 方法。

实现可读流有两种方式：

1. 传入配置对象，实例化 `stream.Writable`
2. 自定义可读流继承 `stream.Writable` 并实现 `_write` 或 `_writev` 方法

```javascript
import { Writable } from 'stream'

class Out extends Writable {
    _write(chunk, encoding, callback) {
        process.stdout.write(chunk, encoding, callback);
    }
}

const out = new Out();

out.write('aaaaaa');
```

### _write

所有可写流的实现必须提供 `_write` 或 `_writev` 方法将数据发送到底层资源。

该方法外部无法直接调用，只能被 `Writable` 类被内部的方法调用。

- 当数据块处理完毕之后，需要调用 `callback`，以表明写入成功完成或因错误而失败
- 在 `_write` 被调用之后且 `callback` 被调用之前，所有的 `write` 调用都会把要写入的数据缓冲起来
- 调用 `callback` 之后会继续处理缓冲中的数据，也就是继续调用 `_write` 或 `_writev`
- 如果缓冲大于 `highWaterMark`，调用 `callback` 之后会触发 `dragin` 事件
- `_writev` 方法可以一次处理多个数据块，当之前写入的数据被缓冲时则会调用该方法（前提是实现了该方法）

# 可读流

![](https://gw.alicdn.com/tfs/TB1JzPFaMoQMeJjy1XaXXcSsFXa-713-418.png#alt=node-stream-non-flowing)

## 读取

可读流运作于两种模式之一：流动模式（flowing）、暂停模式（paused）

- 在流动模式中，数据自动从底层系统读取，并通过 `EventEmitter` 接口的事件尽可能快地被提供给应用程序
- 在暂停模式中，需要显式调用 `read` 方法读取数据

只有提供了消费或忽略数据的机制后，可读流才会产生数据， 如果移除消费的机制，则可读流会停止产生数据。

可读流提供了多种方式来消费流：

1. `on('data')`
2. `on('readable')`
3. `pipe`
4. 异步迭代器

## 实现

`stream.Readable` 类可用于实现可读流，实现（自定义）可读流必须实例化该类并实现 `_read` 方法。

实现可读流有两种方式：

1. 传入配置对象，实例化 `stream.Readable`
2. 自定义可读流继承 `stream.Readable` 并实现 `_read` 方法

```javascript
import { Readable } from 'stream'

class In extends Readable {
    
	stdin = process.stdin;

    _read() {
        this.stdin.once('readable', () => {
            this.push(
                this.stdin.read()
            );
        });
    }
}

const reader = new In();

reader.pipe(process.stdout);
```

### _read

- `_read` 方法用于从底层资源获取数据，也就是通过该方式产生数据
- `_read` 方法需要持续通过 `push` 推送数据到缓存，`push` 方法返回 `false` 时应当暂时停止推送数据
- 当可读流提供了消费方式之后才会开始不断调用 `_read` 方法
- `push` 了非空数据之后会继续调用该方法生产数据

### push

- `push` 方法用于向可读流的缓冲区推送数据，缓冲区大小达到 `highWaterMark` 会返回 `false`
- `push` 一个 `null` 表示流的结束，会停止调用 `_read`
- 当可读流处在暂停模式，`push` 添加的数据可以在 `'readable'` 事件通过调用 `read` 读取
- 当可读流处于流动模式时，`push` 添加的数据可以通过 `data` 事件读取

# 双工流

因为 JavaScript 不支持多重继承，所以使用 `stream.Duplex` 类实现双工流，双工流同时实现了可读流和可写流。

具体就是 `stream.Duplex` 继承自 `stream.Readable` 并且寄生自 `stream.Writable`。

但是 `instanceof` 对这两个基础类都可用，因为重写了 `stream.Writable` 的 `Symbol.hasInstance`。

实现双工流需要调用 `stream.Duplex` 构造函数并实现 `readable._read()` 和 `writable._write()` 方法。

简单来说和可读可写流一样：

1. `new Duplex(options)`
2. 继承自 `stream.Duplex`，并实现 `_read`、`_write` 方法

# 转换流

转换流是一种双工流，它会对输入做些计算然后输出。

`stream.Transform` 类继承自 `stream.Duplex`，并且已经实现了 `_write` 和 `_read` 方法。

自定义转换流只要实现 `_transform` 方法即可。



