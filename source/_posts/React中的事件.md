---
title: React 中的事件
date: 2020-12-13 15:26:08
tags: React
categories: [前端, React]
keywords: React, 合成事件
description: React中的事件, React 17中事件的变化
cover: http://oss.xiefeng.tech/img/20210315214007.png
---

# React中的事件

在 React 中书写事件的时候和 DOM 中注册事件很类似语法区别不大：

1. 事件名采用小驼峰命名方式
2. 传入的函数是函数引用而不是函数名

但是 React 中的事件注册和 DOM 中的事件注册是有很大区别的。

# 事件的特点

1. 对于大部分的事件（除了不会冒泡 / `document` 没有的）通过事件委托最终都会被注册到 `document` 上

	```jsx
	function App() {
	    return (
	        <div>
	            <button onClick={() => console.log('click')}>click</button>
	        </div>
	    )
	}
	ReactDOM.render(<App />, document.getElementById('root'));
	
	document.getElementById('root').onclick = e => console.log('root  click');
	```
	
   ![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201213155230373.png)
	
	可以很明显的看出事件都是注册在 `document` 上的，可以再进一步测试：
	
	```jsx
	document.getElementById('root').onclick = e => {
	  e.stopPropagation();
    console.log('root  click');
	}
	```
	
	![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201213155435634.png)

2. 在 `document` 的事件处理，React 会根据虚拟 DOM 树完成事件函数的调用。

	```jsx
	function  App() {
	    return (
	        <div onClick={() => console.log('点击了 div')}>
	            <h1 onClick={() => console.log('点击了 h1')}>点击我</h1>
	        </div>
	    )
	}
	```

	对于普通的 DOM 这肯定是存在事件冒泡的，那 React 也不能和 DOM 执行逻辑不同吧，所以在执行 `document` 的事件的时候会按照虚拟 DOM 树的结构来完成函数的调用，可以猜测相同的事件会被放置到一个队列中依次执行（毕竟还没看过源码）。
	
	而我们在事件处理函数中的 `e.stopPropagation()` 这些操作是指的阻止在虚拟 DOM 树中的事件冒泡。
	
	![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201213160746339.png)

3. 事件参数并非真实的DOM事件参数，是 React 合成的一个对象，该对象类似于真实DOM的事件参数

	这也就是官方所说的合成事件，e 就是合成事件（`SyntheticEvent` ）的实例

	```jsx
	function App() {
	    return (
	        <div>
	            <h1 onClick={e => console.log(e)}>点击我</h1>
	        </div>
	    )
	}
	```

	这个对象和原生的事件对象很类似，通过 `nativeEvent` 可以获得原生的事件对象。

4. React 使用事件池管理事件对象，事件对象（对于相同的事件）是会被复用的

	```jsx
	let prev;
	function App() {
	    const onClick = e => {
	        console.log(e === prev);
	        prev = e;
	    }
	    return (
	        <div>
	            <h1 onClick={onClick}>点击我</h1>
	            <button onClick={onClick}>click</button>
	        </div>
	    )
	}
	```
	
	![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/e.gif)

当事件函数调用结束后事件对象的属性会被置空，这也就意味着不能在事件处理中异步的使用事件对象，如果一定要使用则需要先调用 `e.persist()`

# v17的变化

1. 更改事件委托

	原本大部分事件都会被注册到 `document` 上，但是 React 17会将事件处理器附加到渲染 React 树的根 DOM 容器中

	![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/react_17_delegation.png)

2. 去除事件池

	在 React 16及之前的版本， React 重用了不同事件的事件对象以提高性能，并将所有事件字段在它们之前设置为 `null`，但是 React 17 不再使用事件池，虽然不会提高性能但是可以不再使用 `e.persist()`，可以异步的使用事件对象。

[官方链接](https://zh-hans.reactjs.org/blog/2020/08/10/react-v17-rc.html#changes-to-event-delegation)