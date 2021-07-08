---
title: React渲染原理
date: 2020-11-22 13:27:05
tags: React
categories: [前端, React]
keywords: React,ReactDOM,ReactDOM.render,React渲染原理
description: React和ReactDOM将内容渲染到页面上的过程
---

# 一些概念

**React 元素：**React Element，通过 `React.createElement` 创建，平常我们写的 jsx是语法糖，最终还是会被 Babel 编译成 `React.createElement`。

例如：

```jsx
function App() {
  return (
      <div>
        <h1>hello world</h1>
      </div>
   );
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
```

经过 Babel 编译之后的代码为：

```js
function App() {
  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "hello world")
  );
}

ReactDOM.render(
  React.createElement(App, null),
  document.getElementById("root")
);
```

我们可以打印一下 React 元素：

```jsx
console.log(<div><h1>hello world</h1></div>);
```

![React Element](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201122151206309.png)

**React 节点：**React 节点是专门用于渲染到 UI 界面的对象，并且是由 `ReactDOM` 负责创建并渲染，该对象可以通过 React 元素/字符串数字等创建。平常所说的 jsx 创建的对象是虚拟 DOM，其实并不严谨，这玩意才是真正的虚拟 DOM。

> 实际上在 ReactDOM 中React节点的源码表示应该是 `ReactComponent`，但是翻译成组件会造成误解，就约定称之为React节点吧。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201122155429376.png)

节点类型：

- React DOM 节点：该节点由 `type` 为字符串的React元素创建，例如前面的 `div`
- React 组件节点：该节点由 `type` 为函数 / 类的React元素创建，例如前面的 `App`
- React 文本节点：由字符串、数字所创建。
- React 空节点：由 `null`、`undefined`、`false`、`true` 所创建，但是页面没有显示。
- React 数组节点：由一个数组创建。

> React DOM 节点的源码级表示：`ReactDOMComponent`
> React 组件节点的源码级表示：`ReactCompositeComponent`
> React 文本节点的源码级表示：`ReactDOMTextComponent`
> React 空节点的源码级表示：`ReactEmptyComponent`

**需要注意的是：**在 ReactDOM 16版本以上有些找不到了，应该是有些东西做了调整，这些类型仅在 15 版本可找得到，但是渲染的核心应该没有变。

如何验证说的对不对呢，将这些东西直接扔到 `ReactDOM.render` 函数中，能渲染就可行。

```jsx
ReactDOM.render('hello world', document.getElementById('root'));

ReactDOM.render(true, document.getElementById('root'));

ReactDOM.render(
    [<App />, 'hello world', null, <div><h1>标题</h1></div>], 
    document.getElementById('root')
);
```

如果扔进去一个普通对象会直接报错：

```jsx
ReactDOM.render(
  {a: 1},
  document.getElementById('root')
);
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201122161041266.png)

# 首次渲染

我们先来看看首次渲染，也就是从零到一渲染页面的过程。

大致过程简单来说就是：

1. 根据参数创建节点（`ReactDOM.render` 函数）
2. 根据不同的节点做不同的操作
3. 生成虚拟 DOM 树，并保存该虚拟 DOM 树
4. 将之前生成的真实的DOM对象（在过程2）加入到容器中（`getElemetById('root')`），也就是实际渲染到页面中。

可以看到实际上核心就是步骤2，我们也详细看看步骤2的操作。

**步骤2的大致过程：**

1. 文本节点：通过 `document.createTextNode` 创建真实的文本节点
2. 空节点：什么都不做
3. 数组节点：遍历数组，对于数组每一项进行递归操作（回到第1步，直到遍历结束）
4. DOM 节点：通过 `document.createElement` 创建真实的DOM对象，并设置相应的一些属性，然后遍历对应 React元素的 `children` 属性，递归操作
5. 组件节点
	- 函数组件：调用函数，将该函数的返回结果进行递归操作
	- 类组件：
		1. 创建该类的实例
		2. 调用对象的生命周期方法：`static getDerivedStateFromProps`
		3. 调用 `render` 方法，将函数的返回结果进行递归操作
		4. 将该组件的 `componentDidMount` 加入一个执行队列，当页面渲染完毕执行该队列中的函数

这其中生成的那些真实 DOM 对象会在这过程中形成DOM树，最后统一将根节点加入到 `getElementById('root')` 中。

来看一个例子吧：

**App.jsx**

```jsx
import React, { Component } from 'react'

function Cmp() {
    return (
        <div>
            <h2>Cmp Component</h2>
            {[["abc", null, <p key={1}>段落</p>]]}
        </div>
    )
}

export default class App extends Component {
    render() {
        return (
            <div>
                <h1>App Component</h1>
                <Cmp />
            </div>
        )
    }
}
```

**index.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
    <App />,
    document.getElementById('root')
);
```

生成的虚拟DOM树大致是这样：

<img src="https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/%E8%99%9A%E6%8B%9FDOm%E6%A0%91.png" style="zoom: 50%;" />

