---
title: requestAnimationFrame
date: 2021-03-12 22:17:16
tags: 
- 浏览器
categories: 
- [前端, Web API]
- [前端, 浏览器]
cover: http://oss.xiefeng.tech/img/20210313170418.png
katex: true
---

# FPS

FPS( **f**rame **p**er **s**econd）是帧率的单位。FPS 一般表示的是每秒钟画面更新次数。

大多数浏览器会限制重绘频率，使其不超出屏幕的刷新率，这是因为超过刷新率，用户也感知不到。一般计算机显示器的屏幕刷新率都是 60Hz，基本上意味着每秒需要重绘 60 次。

因此，一般实现平滑动画最佳的重绘间隔为 1000 毫秒/60，大约 17 毫秒。以这个速度重绘可以实现最平滑的动画，因为这已经是浏览器的极限了。

# 计时器动画

> 创造平滑动画的关键：知道何时绘制下一帧。

浏览器知道 CSS 过渡和动画应该什么时候开始，并据此计算出正确的时间间隔，到时间就去刷新用户界面。

JavaScript 实现动画一般都是采用计时器 `setInterval` / `setTimeout` 来做。

计时器的缺点：

1. `setInterval` / `setTimeout` 只能保证何时会把代码添加到浏览器的任务队列，不能保证立即执行
2. 浏览器自身计时器存在精度问题：
	- IE8 及更早版本的计时器精度为 15.625 毫秒
	- IE9 及更晚版本的计时器精度为 4 毫秒
	- Firefox 和 Safari 的计时器精度为约 10 毫秒
	- Chrome 的计时器精度为 4 毫秒
3. 浏览器对切换到后台或不活跃标签页中的计时器执行限流，因此即使将时间间隔设定为最优，也免不了只能得到近似的结果
4. 采用计时器实现动画，浏览器不知道动画什么时候开始
	- 定时间隔必须足够短，这样才能让不同的动画类型都能平滑顺畅
	- 定时间隔又要足够长，以便产生浏览器可以渲染出来的变化

# requestAnimationFrame

使用这个 API 可以请求浏览器在下一个渲染帧执行某个回调（通知浏览器某些 JavaScript 代码要执行动画了），回调是一个要在重绘前调用的函数，在函数中修改 DOM 样式以反映下一次重绘有什么变化。

浏览器可以通过最优方式确定重绘的时序（基于当前页面是否可见、CPU的负荷情况、设备绘制间隔等来自行决定最佳的帧速率，不会存在过度绘制的问题（动画掉帧））。

`requestAnimationFrame` 解决了浏览器不知道 JavaScript 动画何时开始的问题， 以及最佳间隔是多少的问题。

`requestAnimationFrame` 会有一个队列，每次调用 `requestAnimationFrame` 都会在队列上推入一个回调函数，下次重绘时会执行这些函数。

```javascript
let num = 1;

const fn = () => console.log(num++, Date.now());

requestAnimationFrame(fn);

requestAnimationFrame(fn);

requestAnimationFrame(fn);

setTimeout(() => {
    console.log('---------------');
    let num = 1;

    const fn = () => {
        if (num < 4) {
            console.log(num++, Date.now());
            requestAnimationFrame(fn);
        }
    }
    requestAnimationFrame(fn);
});
```

![](http://oss.xiefeng.tech/img/20210313145143.png)

通过 `requestAnimationFrame` 递归地向队列中加入回调函数，可以保证每次重绘最多只调用一次回调函数，可以非常好的节流。

`requestAnimationFrame` 细节：

- `requestAnimationFrame` 会把每一帧中的所有DOM操作集中起来，在一次重绘或回流中就完成，并且重绘或回流的时间间隔紧紧跟随浏览器的刷新频率
- 在隐藏或不可见的元素中，`requestAnimationFrame` 将不会进行重绘或回流
- 传给 `requestAnimationFrame` 的函数实际上可以接收一个参数，此参数是一个 `DOMHighResTimeStamp` 的实例，表示下次重绘的时间

# requestIdleCallback

`requestIdleCallback` 的作用是在浏览器一帧的剩余空闲时间内执行优先度相对较低的任务。

回调接收一个参数 `deadline`：

- `timeRemaining()`: 当前帧还剩下多少时间
- `didTimeout`: 是否超时

`requestIdleCallback` 第二个参数 `{timeout: ...}` 表示超过这个时间后，如果任务还没执行，则强制执行，不必等待空闲。

```javascript
requestIdleCallback(deadline => {
    console.log(deadline);
    console.log(deadline.didTimeout);
    console.log(deadline.timeRemaining());
});
```

## 渲染帧

浏览器在每一帧所做的事包括：

1. 用户的交互
2. JS 解析执行
3. `requestAnimationFrame`
4. 布局
5. 绘制

![](http://oss.xiefeng.tech/img/20210313162916.png)

如果某一帧里面要执行的任务不多，在不到16ms 的时间内就完成了上述任务的话，那么这一帧就会有一定的空闲时间，这段时间就恰好可以用来执行 `requestIdleCallback` 的回调。

![](http://oss.xiefeng.tech/img/20210313162939.png)

## 特点

和 `requestAnimationFrame` 的区别：

- `requestAnimationFrame` 的回调会在每一帧确定执行，属于高优先级任务。

- `requestIdleCallback` 的回调在每一帧不一定会执行，属于低优先级任务。

**DOM操作：**

`requestIdleCallback` 回调的执行说明样式变更以及布局计算都已完成。如果执行DOM操作的话，之前所做的布局计算都会失效，而且DOM操作的时间是不可预测的，因此很容易超出当前帧空闲时间的阈值。

而且如果下一帧里有获取布局等操作的话，浏览器就不得不执行强制重排工作，这会极大的影响性能。

推荐的做法是在 `requestAnimationFrame` 里面做DOM修改。

`Promise` 的回调不建议在这里面进行，因为 `Promise` 的回调属于Event loop中优先级较高的一种微任务，会在 `requestIdleCallback` 结束时立即执行，不管此时是否还有富余的时间，这样有很大可能会让一帧超时。

推荐放在 `requestIdleCallback` 里面的应该是一些低优先级的、小块的并且可预测时间的 microTask。



