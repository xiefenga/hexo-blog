---
title: React中的ref
date: 2020-11-19 22:21:14
tags: React
categories: [前端, React]
keywords: React,ref,ref forward, ref 转发
description: React中的ref用处，ref 转发怎么使用
cover: http://oss.xiefeng.tech/img/20210224093934.jpg
---

# 什么是ref

ref 就是 reference（引用），当我们希望直接使用 DOM 元素中的某个方法（例如许多 H5 的 API）或者希望直接使用自定义组件中的某个方法。

先来看看 `ref` 大致怎么使用，可以很明了的看出 `ref` 就是组件的一个属性：

```jsx
class App extends React.Component {

    componentDidMount() {
        console.log(this);
    }

    render() {
        return (
            <div>
                <h1 ref="text">hello world</h1>
            </div>
        )
    }
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201119223614022.png)

`ref` 的使用组件要求：

1. `ref` 作用于内置的 html 组件，得到的将是真实的 DOM 对象

2. `ref` 作用于类组件，得到的将是类的实例

3. `ref` 不能作用于函数组件

# ref 的用法

就像上面的例子，可以直接给一个 字符串，则 `ref` 则会成为类组件的 `refs` 属性的属性，传入的字符串则为 key，但是不推荐这种用法，即将被官方淘汰。而且，函数组件无法拥有这种类型的 `ref`。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201119224910448.png)

## 对象

通过 `React.createRef` 函数创建，该函数返回一个对象，然后将该对象传给给组件的 `ref` 属性。

```jsx
const ref = React.createRef();

function App() {

    setTimeout(() => {
        console.log(ref);
    }, 0);

    return (
        <div>
            <h1 ref={ref}>hello world</h1>
        </div>
    )
}
```

其实  `React.createRef` 函数做的事很简单，就是创建了一个 `{ current: null }` 样子的对象，最后 `current` 属性值会变成我们需要的值。

其实我们不使用该函数，直接给 `ref` 变量赋值为一个这样的字面量也可以。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201119225243795.png)

## 函数

给 `ref` 属性传入一个函数，该函数接收一个参数，该参数即为我们需要的值（DOM对象 / 组件实例）

```jsx
class CmpA extends React.Component {
    render() {
        return (
            <div>
                CmpA
            </div>
        )
    }
}

function App() {

    let refA = null;

    setTimeout(() => {
        console.log(refA);
    }, 0);

    return (
        <div>
            <CmpA ref={ el => refA = el}/>
        </div>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201119225958281.png)

### 函数调用的时间

> 在类组件的生命周期中调用时间

1. `componentDidMount` 的之前会调用该函数

	在 `componentDidMount` 事件中可以使用 `ref`

2. 如果 `ref` 的值发生了变动（旧的函数被新的函数替代），分别调用旧的函数以及新的函数，时间点出现在`componentDidUpdate`之前

	1. 旧的函数被调用时，传递 `null`

	1. 新的函数被调用时，传递对象

3. 如果 `ref` 所在的组件被卸载，会调用函数

```jsx
class App extends React.Component {

    state = {
        show: true
    }

    componentDidMount() {
        console.log('componentDidMount', this.text);
    }

    render() {
        const { show } = this.state;
        const showContent = show ? <h1 ref={el => {
            console.log('ref', el);
            this.text = el;
        }}>hello world</h1> : null;
        return (
            <div>
                {showContent}
                <button onClick={() => this.setState({})}>改变函数</button>
                <button onClick={() => this.setState({
                    show: !show
                })}>显示/隐藏</button>
            </div>
        )
    }
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/ref%E5%87%BD%E6%95%B0.gif)

# ref 转发

有些时候我们并不需要直接使用 `ref`，而是想传递给子组件，特别是使用了 HOC 的情况下，HOC 不能污染子组件，这个时候直接传递 `ref`，就不能达到我们的要求，就需要 `ref` 转发（ref forward）

使用 `ref` 转发需要使用 `React.forwardRef` 函数，该函数接收一个函数组件，函数组件有两个参数（props，ref），在函数组件中我们可以控制 `ref` 转发给是谁。

```jsx
const Cmp = React.forwardRef((props, ref) => (
    <h1 ref={ref}>hello world</h1>
));

class App extends Component {

    ref = React.createRef();

    componentDidMount() {
        console.log(this.ref);
    }

    render() {
        return (
            <div>
                <Cmp ref={this.ref} />
            </div>
        )
    }
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201119233842527.png)

**在 HOC 中使用的例子：**

```jsx
function withLog(Comp) {
    class LogWrapper extends React.Component {
        componentDidMount() {
            console.log(`日志：组件${Comp.name}被创建了！${Date.now()}`);
        }
        componentWillUnmount() {
            console.log(`日志：组件${Comp.name}被销毁了！${Date.now()}`);
        }
        render() {
            const { forwardRef, ...rest } = this.props;
            return (
                <>
                	<Comp ref={forwardRef} {...rest} />
                </>
            )
        }
    }

    return React.forwardRef((props, ref) => {
        return <LogWrapper {...props} forwardRef={ref} />
    })
}
```

