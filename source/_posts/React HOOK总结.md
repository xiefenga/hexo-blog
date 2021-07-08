---
title: React Hooks总结
date: 2020-11-23 17:57:45
tags: React
categories: [前端, React]
keywords: React, Hooks
description: React Hooks使用总结
cover: http://oss.xiefeng.tech/img/20210224093934.jpg
---

# Hook

> Hook 是 React 16.8 的新增特性，它可以让你在不编写 class 的情况下使用 state 以及其他的 React 特性。

在 React 中组件分为函数组件和类组件。但是函数组件能做的事有限，没有生命周期，没有状态，意味着函数组件只能做展示。

虽然类组件可以做很多事，但是类组件也有一些缺点：

1. `this` 指向问题
2. 繁琐的生命周期
3. [其他问题](https://zh-hans.reactjs.org/docs/hooks-intro.html#motivation)

Hooks 本质上就是一个个函数（命名上总是以 `use` 开头，表示在函数组件中使用xxx），专门用于增强函数组件的功能（类组件不能使用），使之理论上可以成为类组件的替代品。

它们都在 react 库中，可以像这样导入：

```jsx
import React, { useState } from 'react'
```

# State Hook

> 该 Hook 就是让函数组件具有 state。

State Hook 所对应的函数是 `useState`，语义也很明确，就是在函数组件中使用 `state`。

- 有一个参数，这个参数的值表示状态的默认值
- 返回值是一个数组：
  0. 当前状态的值
  1. 改变该状态的函数

```jsx
function App() {
    const [num, setNum] = useState(0);
    return (
        <div>
            <button onClick={() => {
                setNum(num - 1);
            }}>decrease</button>
            <span style={{margin: '0 10px'}}>{num}</span>
            <button onClick={() => {
                setNum(num + 1);
            }}>increase</button>
        </div>
    )
}
```

![useSate](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/useSate.gif)

可以很明确的看出来，和在类组件中使用 `setSate` 差不多，`setNum` 就相当于 `setSate`，调用该函数就会导致组件的重新渲染。

但是我们都知道函数组件不存在什么生命周期，重新渲染不过就是再运行一次函数，怎么数据还不一样了呢。

Hook 会知道我们是否事第一次渲染该组件组件从而记住以前的值，也就是说后续的调用直接返回我们修改之后的状态值（默认值只在首次渲染有效），细节需要看 HOOK 源码。

**useState 的使用细节：**

1. `useState` 严禁出现在条件判断中，应该说 Hook 都不要出现在这些位置，这和 Hook 的原理有关。
2. `useState` 返回的函数（数组的第二项），引用不变（节约内存空间）。
3. 使用函数改变数据，若数据和之前的数据完全相等（使用 `Object.is` 比较），不会导致重新渲染，以达到优化效率的目的。
4. 使用函数改变数据，传入的值不会和原来的数据进行合并，而是直接替换，这和 `setState` 不同。
5. 一个函数组件中可以有多个状态，这种做法非常有利于**横向切分关注点**，这明显比 `setState` 更加优雅。
6.  和 `setState` 一样，改变状态可能是异步的也可能是同步的，对于异步的状态改变多个状态变化会合并以提高效率如果状态变化要使用到之前的状态，尽量传递函数。

**实现 forceUpdate**

```jsx
function App() {
    const [, forceUpdate] = useState({});
    return (
        <div>
            <button onClick={() => {
                forceUpdate({});
            }}>forceUpdate</button>
        </div>
    )
}
```

# Effect Hook

> 该 Hook 用于在函数组件中处理副作用。

**副作用：** 简单来说就是在函数中做的会影响函数外部数据的事，与之相反没有副作用的函数的就是纯函数。

副作用举例：
-  ajax请求
- 计时器
-  其他异步操作
-  更改真实DOM对象
-  本地存储

`useEffect` 接收一个函数作为参数，该函数就是需要进行副作用操作的函数。

该函数的功能类似于类组件的生命周期函数 `componentDidMount`、`componentDidUpdate` 和 `componentWillUnmount` 只不过被合并成了一个 API。

先来看一个例子：

```jsx
function App() {
    const [num, setNum] = useState(10);
    useEffect(() => {
        if (num === 0) {
            return;
        }
        setTimeout(() => {
            setNum(num - 1);
        }, 1000);
    }, [num]);
    return (
        <div>
            <p>倒计时：{num}</p>
        </div>
    )
}
```

![useEffect](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/useEffect.gif)

**useEffect 使用的细节：**

1. 副作用函数运行时间点：是在页面完成真实的UI渲染之后。这也是和 `componentDidMount` 以及 `componentDidUpdate` 的区别，DOM变更之后异步执行，不会有阻塞浏览器渲染的可能。该函数可以理解为每次组件渲染之后要做的事。
2. 每个函数组件中，可以多次使用 `useEffect`，但不要放入判断或循环等代码块中，和 `useState` 一样（跟 Hook 的原理有关）。
3. 副作用函数可以有返回值，是一个函数（如果有的话），该函数叫做清理函数，用于处理一些清理工作，例如清除计时器。
4. 清理函数的运行时间点：

	1. 在每次运行副作用函数之前（首次渲染除外，**副作用函数不执行清理函数也不会执行**）
	2. 组件被销毁时一定会运行
5. `useEffect` 可以传递第二个参数（正如例子中）：
	1. 该参数为一个数组，数组中记录该副作用函数的依赖数据
	2. 当组件重新渲染后，只有依赖数据与上一次不一样时，才会执行副作用函数
	3. 如果不传递，则每次都会运行；传递空数组，则只有首次渲染才会执行

为了验证第四点，我们将前面的倒计时组件重新改写（这样的代码不好，纯属为了测试）：

**CountDown**

```jsx
function CountDown() {
    const [num, setNum] = useState(10);
    useEffect(() => {
        let timer = null;
        console.log('副作用函数');
        if (num === 0) {
            return;
        }
        timer = setInterval(() => {
            setNum(num - 1);
        }, 1000);
        return () => {
            console.log('清理函数');
            clearInterval(timer);
        }
    }, [num]);
    return (
        <div>
            <p>倒计时：{num}</p>
        </div>
    )
}
```

**App**

```jsx
function App() {
    const [show, setShow] = useState(true);
    return (
        <>
            {show && <CountDown />}
            <button onClick={() => { setShow(!show) }}>show/hide</button>
        </>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/useEffect2.gif)

# Context Hook

> 该 Hook 用于获取上下文中的数据。[React中Context](http://xiefeng.tech/React%E4%B8%AD%E7%9A%84%E4%B8%8A%E4%B8%8B%E6%96%87.html)

通常情况下我们需要使用 `Consumer` 组件来获取 `Context` 中的数据。

```jsx
const ctx = React.createContext({ a: 1, b: 1 });

const { Provider, Consumer } = ctx;

function Child() {
    return (
        <>
            <Consumer>
                {value => (<p>{JSON.stringify(value)}</p>)}
            </Consumer>
        </>
    )
}

function App() {
    return (
        <div>
            <Provider value={{ a: 1, b: 1 }}>
                <Child />
            </Provider>
        </div>
    )
}
```

使用 `useContext` 可以更加简单的获取上下文中的数据，只要将上下文对象传入即可：

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

# Ref Hook

> 该 Hook 用于获取 ref。[React中的 ref](http://xiefeng.tech/React%E4%B8%AD%E7%9A%84ref.html)

`useRef` 函数接受 `ref` 的默认值，返回一个 `ref` 对象 `{current: 默认值}`。

和其他的 Hook 一样，该函数只会在组件首次渲染的时候返回新对象，所以每次返回的 `ref` 对象（引用）不会发生改变。

> 由于 `useRef` 函数的特点，可以返回一个不变的对象，也可以用作其他的用途，比如实现组件内部的计时器。

```jsx
let ref = null;
function App() {
    const [, forceUpdate] = useState({});
    const inpRef = useRef(null);
    console.log(ref === inpRef, inpRef);
    ref = inpRef;
    return (
        <div>
            <input type="text" ref={inpRef} />
            <button onClick={() => {
                forceUpdate({});
            }}>forceUpdate</button>
        </div>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/useRef.gif)

# Callback Hook

> 该 Hook 用于获得一个引用固定的函数。

`useCallback` 传入一个函数，只要依赖项没发生变化，每次返回的函数引用保持一致。

```jsx
let cb = null;
function App() {
    const [, forceUpdate] = useState({})
    const fn = useCallback(() => {
        console.log('固定引用的函数')
    }, []);
    console.log(cb === fn, fn);
    cb = fn;
    return (
        <button onClick={() => forceUpdate({})}>forceUpdate</button>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201127135141271.png)

那么这个Hook有什么用呢，好像也就是可能会节省一些内存空间。

实际上这个 Hook 可以用来进行一些**性能优化**，比如我们使用了一个 `PureComponent` 

```jsx
class Test extends React.PureComponent {
    render() {
        console.log("Test Render")
        return (<div>
            <h1>{this.props.text}</h1>
            <button onClick={this.props.onClick}>改变文本</button>
        </div>)
    }
}
```

```jsx
function App() {
    console.log("App Render")
    const [txt, setTxt] = useState(123);
    const [n, setN] = useState(0);
    return (
        <div>
            <Test text={txt} onClick={() => {
                setTxt(Math.random());
            }} />
            <div>{n}</div>
            <button onClick={() => setN(n + 1)}>+1</button>
        </div>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/useCallback.gif)

我们会发现，当我们点击 +1 的按钮时，`Test` 组件也会被重新渲染，但是这是不需要的啊，因为我们并没有改变 `Test` 组件所需要的属性，但是由于我们需要传入一个作用域链上有 `App` 内这些变量的函数，只能这么写，但是每次 `App` 组件重新渲染会导致该函数又是一个新的函数，但是这是没有必要的，所以这个 Hook 就有用了。

```jsx
function App() {
    console.log("App Render")
    const [txt, setTxt] = useState(123);
    const [n, setN] = useState(0);
    const handleClick = useCallback(() => {
        setTxt(txt + 1)
    }, [txt]);
    return (
        <div>
            <Test text={txt} onClick={handleClick} />
            <div>{n}</div>
            <button onClick={() => setN(n + 1)}>+1</button>
        </div>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/useCallback2.gif)

# Memo Hook

> 该 Hook 用于保持一些比较稳定的数据。

`useMemo` 函数类似于 `useCallback`，传入一个函数和依赖项，不同的是 `useMemo` 函数返回的是传入函数返回的值，依赖项不发生变化函数也不会再次执行（类似于 `useEffect`，不同的是该函数是同步的执行，会阻塞组件的渲染）。

当组件渲染之前需要进行一些复杂的操作但操作不常做的时候可以考虑使用该 Hook。

```jsx
function Item(props) {
    return <li>{props.value}</li>
}

function App() {
    const [range] = useState({ min: 1, max: 10000 })
    const [, forceUpdate] = useState({})
    const list = useMemo(() => {
        const list = [];
        for (let i = range.min; i <= range.max; i++) {
            list.push(<Item key={i} value={i} />)
        }
        return list;
    }, [range.min, range.max]);
    return (
        <div>
            <ul>{list}</ul>
            <button onClick={() => forceUpdate({})}>forceUpdate</button>
        </div>
    );
}
```

# 自定义 Hook

> 将一些常用的、跨越多个组件的 Hook 功能，抽离出去形成一个函数，该函数就是自定义 Hook。

自定义 Hook 名称以 `use` 开头，函数内部可以调用其他的 Hook。

例如我们自定义一个 Hook 用于强制刷新：

```jsx
function useForceUpdate() {
    const [, setUpdate] = useState({});
    return setUpdate;
}
```

```jsx
function App() {
    const forceUpate = useForceUpdate();
    return (
        <div>
            <h1>{Math.random()}</h1>
            <button onClick={forceUpate}>update</button>
        </div>
    )
}
```

# Reducer Hook

> useState 的替代方案，类似于 Redux

函数签名：

```js
const [state, dispatch] = useReducer(reducer, initialState[, init]);
```

如果传入第三个参数则默认的状态值为第三个参数返回值

# ImperativeHandle Hook

> 该 Hook 可以让你在使用 `ref` 时自定义暴露给父组件的实例值，需要配合 `forwardRef`。

该函数的签名为：`useImperativeHandle(ref, createHandle, [deps])`

第一个参数为 `ref`，第二个参数为函数，函数的返回值为 `ref.current`，第三个参数为依赖项，传递的函数参数会异步执行。

`ref.current = {method: xxxx}`

```jsx
function Test(props, ref) {
    useImperativeHandle(ref, () => ({
        method(){
            console.log("Test Component Called")
        }
    }), []);
    return (<h1>Test Component</h1>)
}

const TestWrapper = React.forwardRef(Test);

function App() {
    const testRef = useRef();
    return (
        <div>
            <TestWrapper ref={testRef} />
            <button onClick={() => testRef.current.method()}>点击调用Test组件的method方法</button>
        </div>
    )
}
```

# LayoutEffect Hook

> 该 Hook 和 Effect Hook 一样的作用，只不过调用时机不同。

`useEffect` 在浏览器渲染完成后（页面已经渲染完毕）之后调用副作用函数。

`useLayoutEffectHook` 仅在完成了DOM改动，但还没有渲染页面之前调用副作用函数（可以重新修改DOM）

简单来说就是在DOM变更之后一个异步执行，一个同步执行，该 Hook 的调用时机和类组件的 `componentDidMount`、`componentDidUpdate` 相同。

具体的过程是：

1. 在 commit 阶段的前期
	- 会**调用**类组件生命周期方法：`getSnapshotBeforeUpdate` 
	- 会**调度**函数式组件的 `useEffect` 的 cleanup 以及回调函数，具体是将它们放入 React 维护的调度队列中，给予一个普通的优先级异步执行
2. 在 commit 阶段将 DOM 的变化映射到真实的 DOM 之后，同步的执行生命周期函数 `componentDidMount`，`componentDidUpdate` 以及 `useLayoutEffect`，由于此时虽然改变了内存中的 DOM 的数据，但是主线程由于在执行js还没有开始执行渲染的任务，所以在这些函数中可以获取到变化之后的 DOM 数据，但是页面还未更新，此时更新 DOM 数据也不会造成页面闪烁。

3. 在 commit 阶段结束之后，浏览器渲染完毕之后会通知 react，react 开始执行自己调度队列中的任务，此时才开始执行 useEffect的产生的函数

应该尽量使用 `useEffect`，因为它不会导致渲染阻塞，如果有特别的需求，再考虑使用 `useLayoutEffectHook`。

# DebugValue Hook

> 该 Hook 用于将自定义 Hook 的关联数据显示到调试栏。

先看 React 调试工具对于一个组件 Hook 的显示：

```jsx
function App() {
    const forceUpate = useForceUpdate();
    useRef();
    useState(1);
    useEffect(() => { });
    return (
        <div>
            <h1>{Math.random()}</h1>
            <button onClick={forceUpate}>update</button>
        </div>
    )
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201128145942269.png)

对于我们自定义的 Hook，我们可以让他显示的时候显示别的内容：

```jsx
function useForceUpdate() {
    const [, setUpdate] = useState({});
    useDebugValue(setUpdate);
    return setUpdate;
}
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201128150102146.png)

