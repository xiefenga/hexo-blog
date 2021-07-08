---
title: React中的上下文
date: 2020-11-21 18:52:45
tags: React
categories: [前端, React]
keywords: React, 上下文, Context
description: React中Context的用法
cover: http://oss.xiefeng.tech/img/20210315220417.jpg
---

# Context

**上下文：**  表示做某一些事情的环境。类似于语言环境中的上下文，上下文这个东西不是一个具体的东西，在不同的地方表示不同的含义，理解为环境比较好。

知乎上一个关于上下文的问题：[编程中什么是「Context(上下文)」？](https://www.zhihu.com/question/26387327)

**React 中的 Context：** 组件可以创建一个上下文，上下文中的数据可以被所有的后代组件共享，而不需要层层传递

例如这样的一个组件结构：

```jsx
function App() {
    return (
        <>
            <Cmp1 />
            <Cmp2 />
        </>
    )
}

function Cmp1() {
    return (
        <>
            <p>Cmp1</p>
            <Cmp3 />
        </>
    )
}

function Cmp2() {
    return (
        <p>Cmp2</p>
    )
}

function Cmp3() {
    return (
        <p>Cmp3</p>
    )
}
```

如果 `<Cmp1 />` 创建了一个上下文，那么情况就是这样的：

`Cmp1` 组件的子组件可以直接使用上下文中的数据，而无需通过 `props` 层层传递。

![Cmp1创建的上下文](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/Cmp1%E5%88%9B%E5%BB%BA%E7%9A%84%E4%B8%8A%E4%B8%8B%E6%96%87.png)

**React 中上下文的特点：**

1. 当某个组件创建了上下文后，上下文中的数据，会被所有后代组件共享
2. 如果某个组件依赖了上下文，会导致该组件不再纯粹

# 旧Context API

旧版的 API 不建议使用，React 版本 < 16

## 创建上下文

> 对于旧的 API 只有类组件才可以创建上下文

1. 给类组件书写静态属性 `childContextTypes`，使用该属性对上下文中的数据类型进行约束

2. 添加实例方法 `getChildContext`，该方法返回的对象即为上下文中的数据，该数据必须满足类型约束，该方法会在每次 `render` 之后运行

```jsx
class App extends React.Component {

    static childContextTypes = {
        a: PropTypes.number,
        b: PropTypes.string
    }

   getChildContext() {
        console.log('getChildContext');
        return {
            a: 789,
            b: "hello"
        }
    }
    render() {
        console.log('render');
        return (
            <div>
                <Cmp1 />
            </div>
        )
    }
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121205048460.png)

## 使用数据

要求：如果要使用上下文中的数据，组件必须有一个静态属性 `contextTypes`，该属性描述了需要获取的上下文中的数据类型

### 类组件

1. 构造函数实际会传入第二个参数 `context`，执行 `super(props, ctx)`
2. 通过 `this.context` 获取上下文中的数据

```jsx
import PropTypes from "prop-types"

const types = {
    a: PropTypes.number.isRequired,
    b: PropTypes.string.isRequired,
}

class Cmp extends React.Component {
    static contextTypes = types;

    render() {
        return (<div>
            a:{this.context.a}，b:{this.context.b}
        </div>)
    }
}
```

### 函数组件

通过第二个参数，获取上下文数据：

```jsx
function Cmp(props, ctx) {
    return (<div>
            a:{ctx.a}，b:{ctx.b}
        </div>)
}

ChildA.contextTypes = types;
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121204733043.png)

# 新Context API

## 创建上下文

上下文是一个独立于组件的对象，该对象通过 `React.createContext(defaultValue)` 创建

```jsx
const ctx = React.createContext({ a: 1, b: 2 });

console.log(ctx);
```

![ctx](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121200214286.png)

该对象有两个对象属性（都是组件）：

1. `Provider`：该组件会创建一个上下文，该组件有一个 `value ` 属性，通过该属性传入上下文中的值
2. `Consumer`：该组件用于接收上下文中的数据，需要给该组件传入一个 `children`，且必须是一个函数，函数的参数为上下文 `value`

## 使用数据

通过 `Consumer` 组件使用上下文中的数据

```jsx
const ctx = React.createContext();

const { Provider, Consumer } = ctx;

function Cmp1() {
    return (
        <Provider value={{ a: 1, b: 2 }}>
            <p>Cmp1</p>
            <Cmp3 />
        </Provider>
    )
}

function Cmp3() {
    return (
        <p>
            Cmp3
            <Consumer>
                {value => (<p>{value.a},{value.b}</p>)}
            </Consumer>
        </p>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201121201637694.png)

### 类组件

对于类组件，除此之外依旧可以使用 `this.contex` 来获取上下文中的数据，但是需要提供一个静态属性 `contextType` 存储上下文对象。

```jsx
class Cmp3 extends React.Component{

    static contextType = ctx;

    render() {
        return (
            <p>
                Cmp3
                <p>{this.context.a},{this.context.b}</p>
            </p>
        )
    }
}
```

### 函数组件

对于函数组件，可以使用 context hook 来使用上下文中的数据。

```jsx
function Child() {
    const value = useContext(ctx);
    return (
        <p>
            {JSON.stringify(value)}
        </p>
    )
}
```

**细节：**

如果 `Context.Provider` 的 `value` 属性发生变化 (使用 `Object.is` 比较)，会导致该上下文提供的所有后代元素全部重新渲染，无论该子元素是否有优化（无论 `shouldComponentUpdate` 函数返回什么结果）。