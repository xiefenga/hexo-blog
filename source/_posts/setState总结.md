---
title: setState总结
date: 2020-11-13 17:17:57
tags: React
categories: [前端, React]
keywords: react, setState
description: react中的setState同步和异步
cover: http://oss.xiefeng.tech/img/20210315215734.jpg
---

# State

React 组件中的数据可以来源于使用者，也可以组件自身维护。使用者传递的数据就是组件的属性 （props），而组件自身维护的数据就是组件的状态（state）。

**React 中的哲学：数据属于谁，谁才有权力更改。**

对于使用者传递过来的 `props`，组件自然是没有权利更改的；对于 `state`，组件自己自行维护，所以组件自然是有权利更改的。

在表现上，`state` 和 `props` 一样都是一个对象，但是 `state` 仅在类组件中有效。

# setState

由于 React 无法监测到组件状态的变化，不像 Vue 实现了数据响应式，这也意味着我们无法直接修改 `state` 的某个属性值来达到触发组件重新渲染的目的。

```jsx
class Demo extends React.Component {
    state = {
        a: 1
    }
    render() {
        return (
            <div>
                <p> {this.state.a}</p>
                <button onClick={() => { this.state.a-- }}>+1</button>
            </div>
        )
    }
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201113182346496.png)

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201113182420598.png)

可以看到，React 不允许我们直接在状态上修改，而且这样做无法实现我们想要的效果（组件没有重新渲染）。

要想修改 `state` 的值，必须通过 `this.setState` 改变状态，传入的参数为一个对象，React 会将该对象和原本的 `state` 进行混合，然后会导致当前的组件重新渲染，也就是调用 `render` 函数（手动调用无效）。

对于前面的例子我们需要将事件处理函数进行修改：

```jsx
<button onClick={() => { this.setState({a: this.state.a + 1}) }}>+1</button>
```

# 深入理解setState

一个灵魂拷问：`setState` 是异步还是同步？

我们先更改一下 `render` 函数：

```jsx
render() {
    console.log(this.state.a === 1 ? 'first render' : 'redner');
    return (
        <div>
            <p> {this.state.a}</p>
            <button onClick={() => { 
                    this.setState({ a: this.state.a + 1 });
                    console.log(this.state.a);
                }}>+1</button>
        </div>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/setState.gif)

调用 `setState` 会导致调用 `render`，触发组件的重新渲染，但是调用了 `setState` 之后，`a` 的值并未立刻改变，而是事件处理函数运行之后才触发，由此可以看出这里的 `setState` 函数是异步的。

**真的是这样吗？**

我们来添加一个生命周期函数：

```jsx
componentDidMount() {
    this.timer = setInterval(() => {
        this.setState({ a: this.state.a + 1 });
        console.log(this.state.a);
        if (this.state.a === 3) {
            clearInterval(this.timer);
        }
    }, 1000);
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/setState1.gif)

这好像和我们的预期不符，怎么 `setState` 又变成同步的了？

这意味着，React 中 `setState` 可能是同步也可能是异步的。

那么什么时候是同步什么时候是异步？

先说结论：

- 合成事件中是异步
- 生命周期函数中的是异步
- 原生事件中是同步
- `setTimeout `等异步执行的代码中是同步

**合成事件：**我们在 JSX 中书写的事件都是合成事件（`SyntheticEvent`），它将浏览器的原生事件进行了跨浏览器的包装。

上面的例子可以很好的印证，当 `setState` 出现在合成事件处理函数中是异步的，在 `setInterval` 中时同步的。

生命周期函数中也很好验证：

```jsx
componentDidMount() {
    this.setState({
        a: this.state.a + 1
    })
    console.log(this.state.a);
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201205223151984.png)

如果我们需要使用 `setState` 改变状态后的数据怎么办？

`setState` 还有第二个参数，是一个回调函数，会在页面重新渲染之后调用，这时就可以获取到正确的数据。（和 Vue 中的 `nextTick` 类似）

```jsx
<button onClick={() => {
        this.setState({ a: this.state.a + 1 }, () => {
            console.log(this.state.a);
        });
    }}>+1</button>
```

如果我们需要对 `state` 进行多次改变，每次改变需要前一次改变的状态，就可以将 `setState` 的第一个参数改为 一个函数：

函数的参数是当前的状态（state），函数的返回值就是需要修改的 `state`。

这样写并不会改变 `setState` 同步或是异步的场景，该同步的时候还是同步执行，该异步还是异步。

```jsx
componentDidMount() {
    this.setState(state => ({
        a: state.a + 1
    }), () => console.log(this.state.a))
    console.log(this.state.a);
    this.setState(state => ({
        a: state.a + 1
    }))
    console.log(this.state.a);
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/setState2.gif)

为了效率 React 会对异步的 `setState` 进行优化，将多次 `setState` 进行合并，会将连续的异步执行完毕之后再运行 `render`，而 `setState` 的第二个参数也会等待 `render` 之后才会执行，这也是上面只输出了一次 render 的原因。

**最佳实践：**

1. 把所有的 `setState` 当作是异步的
2. 永远不要信任 `setState` 调用之后的状态
3.  如果要使用改变之后的状态，需要使用回调函数（`setState` 的第二个参数）
4.  如果新的状态要依赖之前的状态，使用函数的方式改变状态（`setState` 的第一个参数）

