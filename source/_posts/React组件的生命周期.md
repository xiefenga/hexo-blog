---
title: React组件的生命周期
date: 2020-11-21 13:57:06
tags: React
categories: [前端, React]
keywords: React,生命周期
description: React中类组件的生命周期
cover: http://oss.xiefeng.tech/img/20210315214007.png
---

# 生命周期

**生命周期：** 组件从诞生到销毁会经历一系列的过程，该过程就叫做生命周期。

React 在组件的生命周期中提供了一系列的钩子函数，可以让我们在其中注入代码，在适当的时候运行。

**注意：** 生命周期仅存在于类组件中，函数组件每次调用都是重新运行函数，旧的组件即刻被销毁。

# 旧版生命周期

旧版生命周期指的是 React 版本 < 16 所使用的生命周期：

![旧版生命周期](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/%E6%97%A7%E7%89%88%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F.png)

可以将整个生命周期分为四个阶段，初始化阶段，挂载阶段，更新阶段，卸载阶段。（也可以将初始化阶段和挂载阶段合并）

- **初始化阶段**：主要是初始化类组件的实例
- **挂载阶段**：主要是将组件挂载到页面
- **更新阶段**：主要是当属性/状态发送变化时重新渲染的过程
- **卸载阶段**：主要是当我们不需要某个组件卸载的阶段

1. `constructor`

	- 同一个组件只会运行一次，因为一个组件只需要创建一个对象
	- 在运行构造函数的时候组件还未挂载，为了避免问题，不要在构造函数中使用 `setState`

	使用会报错：

	![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121154950176.png)

2. `componentWillMount`

  - 正常情况下，只会运行一次
  - 服务端渲染情况下会被调用两次
  - 可以正常使用 `setState`，但是为了避免多次调用，不建议使用

3. `render`

	- 该函数返回组件的 React 元素
	- 只要需要渲染的时候都需要运行该函数，是类组件中必须实现的方法
	- 禁止使用 `setState`，因为会导致无限递归的渲染

4. `componentDidMount`

	- 该函数只会执行一次
	  - 可以正常使用 `setState`
	  - 常用于发送网络请求，启动计时器等操作
	  - 组件首次渲染完成（页面还未发生变动）

5. `componentWillReceiveProps(nextProps)`

	- 组件的属性值未发生变化，函数的参数为新的属性对象
	- 该函数可能会导致 bug，不建议使用

6. `shouldComponentUpdate(nextProps, nextState)` 

	- 指示 React 是否要重新渲染该组件，通过返回 `true` / `false` 来指示
	- 默认情况始终返回 `true`，除非使用了 `PureComponent`
	- 该函数是一个性能优化点，例如 `PureComponent` 的实现
	
7. `componentWillUpdate`

	- 组件即将被重新渲染

8. `componentDidUpdate`

	- 组件重新渲染完成（页面还未发生变动）
	
9. `componentWillUnmount`

	- 组件即将被卸载
	- 通常在该函数中销毁一些组件依赖的资源，比如计时器

# 新版生命周期

新版生命周期指的是 React 版本 > 16 所使用的生命周期函数，但是以前旧版的生命周期依旧可以使用没有删除，但是不建议使用。

新版生命周期总体上没有什么大变化。[官方链接](https://projects.wojtekmaj.pl/react-lifecycle-methods-diagram/)

![新版生命周期](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121160819551.png)

新版生命周期取消了可能会导致问题的 `componentWillMount`，还有可能会产生反模式代码的 `componentWillReceiveProps`，以及 `componentWillUpdate` 钩子函数。

与之替代的新增了 `getDerivedStateFromProps` 和 `getSnapshotBeforeUpdate`。

1. `static getDerivedStateFromProps(props, state)`
	- 该函数是静态的，也就是说在函数中使用 `this` 无法获取到类的实例
	- 该函数的返回值会覆盖掉组件状态
	- 通过参数可以获取新的属性和状态
	- 该函数是用来替代  `componentWillReceiveProps`
	- 该函数没什么用
2. `getSnapshotBeforeUpdate(prevProps, prevState)`
	- 真实的DOM构建完成，但还未实际渲染到页面中
	- 在该函数中，通常用于实现一些附加的dom操作
	- 该函数的返回值，会作为 `componentDidUpdate` 的第三个参数
	- 该函数的参数为更新之前的 `props` 和 `state` 

常用的生命周期函数就那几个：`render`、`componentDidMount`、`shouldComponentUpdate`、`componentWillUnmount` 

精简过的生命周期：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121163052930.png)
