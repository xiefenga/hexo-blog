---
title: redux原理
date: 2021-02-06 11:59:29
tags: React
categories: [前端, React]
cover: https://redux.js.org/img/redux-logo-landscape.png
---

# redux 总结

redux 是前端的一种数据解决方案。redux 由三部分组成，`action`、`reducer` 和 `store`。

其中 `store` 用于保存数据，`action` 用来描述如何改变数据，`reducer` 是用于改变数据的处理函数。

三者间的关系：

![](http://oss.xiefeng.tech/img/20210324171430.jpg)

## action

1. 必须是一个 plain-object
2. 通常，使用 `payload` 属性表示附加数据
3. `action` 中必须有 `type` 属性，描述操作的类型，该属性可以是任何类型
5. `action` 创建函数
	- 为了方便传递 `action`，通常会使用 `action` 创建函数来创建 `action`
	- `action` 创建函数应为纯函数
6. `bindActionCreators`
	- 为了方便利用 `action` 创建函数来分发 `action`
	  - 参数1：`action` 创建函数 / `action` 创建函数集合（对象）
	  - 参数2：`store.dispatch`
	  - 返回值：增强的 `action` 创建函数，创建后自动分发
## reducer

1. `reducer` 是一个接收两个参数：`state` 和 `action` 的函数

2. `reducer` 被调用的时机：
      1. 通过 `store.dispatch`，分发了一个 `action`
      2. 当创建一个 `store` 的时候，可以利用这一点，用 `reducer` 初始化状态：
            1. 创建仓库时，不传递任何默认状态
            2. 给 `reducer` 的参数 `state` 设置一个默认值

4. `reducer` 内部通常使用 `switch` 来判断 `type` 值

5. `reducer` 必须是一个没有副作用的纯函数

6. 大中型项目中需要对 `reducer` 进行细分，`redux` 提供了方法 `combineReducers` 帮助我们方便的合并 `reducer` 

## store

- `dispatch`：分发一个 `action`
- `getState`：得到仓库中当前的状态
- `replaceReducer`：替换掉当前的 `reducer`
- `subscribe`：注册一个监听器（无参），分发一个 `action` 之后会运行，该函数会返回一个函数，用于取消监听

## createStore

根据 redux 的基本使用方法和要求我们可以实现一个不包括中间件的 `createStore` 

```javascript
function createStore(reducer, defaultState) {

    let currentReducer = reducer,
        currentState = defaultState;

    const listeners = [];

    const dispatch = (action) => {
        checkAction(action); // 用于检测action是否是plain-object并且存在type 否则报错
        currentState = currentReducer(currentState, action);
        listeners.forEach(listener => listener());
    }

    const subscribe = (listener) => {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index === -1) {
                return;
            }
            listeners.splice(index, 1);
        }
    }

    const getState = () => currentState;

    dispatch({ type: '@@redux/INIT' + Math.random().toString(36).slice(2, 6).split('').join('.') });

    return {
        dispatch,
        getState,
        subscribe
    }
}
```

## combineReducer

`combineReducer` 所做的事就是将我们小的 `reducer` 合并成一个大的，并且会在初始就触发两次 `reducer` 来验证我们的 `reducer` 是否存在问题，不能返回 `undefined`。

```javascript
function combineReducers(reducers) {
    assertReducerShape(reducers);
    return combine(reducers);
}

const randomString = () => Math.random().toString(36).slice(2, 6).split('').join('.');

function assertReducerShape(reducers) {
    for (const r in reducers) {
        const reducer = reducers[r];
        if (
            reducer( undefined,  { type: '@@redux/INIT' + randomString() } ) === undefined
            ||
            reducer( undefined,  { type: '@@redux/PROBE_UNKNOWN_ACTION' + randomString() } ) === undefined
        ) {
            throw new TypeError("reducers must not return undefined");
        }
    }
}
function combine(reducers) {
    return (state = {}, action) => {
        const newState = {};
        for (const r in reducers) {
            newState[r] = reducers[r](state[r], action);
        }
        return newState;
    }
}
```

## bindActionCreator

`bindActionCreator` 既可以接收创建函数也可以接收多个创建函数，所以需要分情况。

```javascript
function bindActionCreates(actionCreators, dispatch) {
    if (typeof actionCreators === 'function') {
        return bindActionCreator(actionCreators, dispatch);
    }
    const newActionCreators = {};
    for (const creator in actionCreators) {
        const actionCreator = actionCreators[creator];
        if (typeof actionCreator === 'function') {
            newActionCreators[creator] = bindActionCreator(actionCreator, dispatch);
        }
    }
    return newActionCreators;
}

function bindActionCreator(actionCreator, dispatch) {
    return function (...args) {
        return dispatch(actionCreator.apply(this, args));
    }
}
```

# 中间件

redux 中间件主要用于增强 `dispatch` 函数，通过原本的dispatch函数我们只能够更改数据无法做更多的事情。

redux 中间件的基本原理，是更改仓库中的 `dispatch` 函数。

中间件本身是一个函数，该函数接收一个仅包含 `getState`，`dispatch` 的简易 `store` 对象，该函数返回一个 `dispatch` 创建函数，`dispatch` 创建函数返回一个 `dispatch` 函数。

简单来说写一个中间件就是这样写：

```javascript
const middleware = store => next => action => {
    // handle
}
```

使用中间件的方式：

- `createStore(reducer, [defaultState, applyMiddleware(middleware1, ....)])`
- `applyMiddleware(middleware1, ....)(createStore)(reducer, defaultState)`

## 洋葱模型

![中间件洋葱模型](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210206124515.svg)

中间件本身是一个函数，该函数接收一个简易版 `store` 参数，并返回一个 `dispatch` 创建函数。

- `dispatch` 创建函数接收一个参数 `next` (下一个中间件经过 `dispatch` 创建函数返回的 `dispatch` 函数)
- 返回的 `dispatch` 函数只接收一个 `action` 参数
- 中间件函数参数中的 `dispatch` 函数是仓库中最终的 `dispatch` 函数
- 第一个中间件返回的 `dispatch` 最后会成为 `store` 最终的 `dispatch`函数，`(...args) => dispatch(..args)`

也就是这样一张图：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/redux%20%E4%B8%AD%E9%97%B4%E4%BB%B6.svg)

## applyMiddleware

无论是使用哪种方式使用中间件，实际依赖的都是 `applyMiddleware` 这个函数。

### compose

函数组合，将一个数组中的函数进行组合，形成一个新的函数，该函数调用时，实际上是反向调用之前组合的函数。这是一个函数式编程中的思想。

实现一个`compose`函数：

```javascript
function compose(...funcs) {
    if (funcs.length === 0) {
        return args => args; //如果没有要组合的函数，则返回的函数原封不动的返回参数
    } else if (funcs.length === 1) {
        return funcs[0]; //要组合的函数只有一个，直接返回原本的函数
    }
    return function (...args) {
        let lastReturn = null; //记录上一个函数返回的值，它将作为下一个函数的参数
        for (let i = funcs.length - 1; i >= 0; i--) {
            const func = funcs[i];
            if (i === funcs.length - 1) {//数组最后一项
                lastReturn = func(...args);
            }
            else {
                lastReturn = func(lastReturn);
            }
        }
        return lastReturn;
    }
}
```

可以看到核心的逻辑就是在函数数量大于1的时候，利用js的数组中的方法，可以更加简洁的实现该功能：

```javascript
funcs.reduce((a, b) => (...args) => a(b(...args)));
```

### 实现

```javascript
function applyMiddleware(...middlewares) {
    return createStore => (reducer, defaultState) => {
        const store = createStore(reducer, defaultState);
        let dispatch = () => { throw new Error('目前还不能使用 dispatch') }
        const middlewareAPI = {
            getState: store.getState,
            dispatch: (...args) => dispatch(...args)
        }
        const chain = middlewares.map(middleware => middleware(middlewareAPI))
        dispatch = compose(...chain)(store.dispatch)
        return {
            ...store,
            dispatch
        }
    }
}
```

可以发现一个很巧妙的点就是 `middlewareAPI` 这里，利用闭包巧妙地实现了 `dispatch` 的替换。

