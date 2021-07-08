---
title: react-router核心原理
date: 2021-04-11 09:41:06
tags: React
categories: [前端, React]
cover: http://oss.xiefeng.tech/img/20210411094558.png
sticky: 3
---

# history

history 是一个用于提供类似浏览器 history 对象实现页面的无刷新跳转的库，该库是 react-router 的核心依赖。

history 库提供的功能：

- 三种 history：browserHistory、hashHistory、memoryHistory，提供相应的 create 函数并保持统一的 api
- 支持发布/订阅，当 URL 发生改变的时候，会发布订阅
- 提供跳转拦截、跳转确认和 `basename` 等功能

一个 `history` 对象所具有的属性：

```javascript
const history = {
    length,
    action,
    location:,
    createHref,
    push,
    replace,
    go,
    goBack,
    goForward,
    block,
    listen
}
```

- `length`：历史记录堆栈的长度，实现也非常简单就是 `(globalHistory = window.history).length`
- `action`：表示当前页面是通过什么行为进入的，取值为 `'POP'`、`'PUSH'`、`'REPLACE'`，默认值为 `'POP'`
- `location`：和 `window.location` 类似，react-router 上下文中的 `location` 对象就是该对象
- `createHref`：根据 `location` 对象以及 `basename` 创建一个 `path` 字符串
- `block`：向页面添加一个阻塞，创建 `history` 的时候可以传递一个 `getUserConfirmation` 函数用于判断是否拦截跳转
- `listen`： 添加一个订阅，当 URL 发送改变会自动发布订阅

> 主要看 browserHistory 的实现

## location

location 对象的格式：

```json
{
    key: "xxx",
    pathname: '/xxx', 
    search: '?xxx', 
    hash: '#xxx',
    state: xxx
}
```

`location` 具有的特点：

- 每个 `location` 对象都具有一个唯一的 `key` 值
- 每个 `location` 对象都具有 `state` 属性，该值是通过 `history.push` 所传递的值
- 如果 URL 存在 query 和 hash，`search` 属性必定以 `?` 开头，`hash` 必定以 `#` 开头，否则举是空串

### 创建

该对象是通过 LocationUtil 模块下的 `createLocation` 所创建，当跳转到一个新地址时都会先创建一个新的 `location` 对象。

通过 `history.push` 可以传递几种格式的路径，都是该函数帮忙处理的：

- 可以传递对象格式的路径，`{pathname: xxx, hash: xxx, search: 'xxx'}`
- 可以传递完整的字符串路径
- 可以传递不完整的路径，会根据当前的路径进行补全

```javascript
function createLocation(path, state, key, currentLocation) {
    let location;
    // path 可以是location格式对象，可以直接是路径字符串
    if (typeof path === 'string') {
        // Two-arg form: push(path, state)
        // parsePath 将 path 字符串解析为 { pathname: '/xxx', search: '?xxx', hash: '#xxx' } 格式
        location = parsePath(path);
        location.state = state;
    } else {
        // One-arg form: push(location)
        location = { ...path };
        // 处理 search hash state
    }

    if (key) location.key = key;

    // path 可以传递的是不完整的路径，因为会根据 currentLocation 进行补全
    if (currentLocation) {
        // Resolve incomplete/relative pathname relative to current location
    } else {
        // When there is no prior location and pathname is empty, set it to /
    }

    return location;
}
```

### 初始值

一个比较有意思的是 `location` 的初始值的实现：

初始的 `location` 是通过 `window.location` 和 `window.history.state` 创建，因为该函数可能是刚进入页面运行，也可能是通过刷新页面导致运行，但是刷新并不会清空 `window.history.state` 的值。

```javascript
// 初始的 location 值，通过 window.location 和 window.history.state 创建
// 因为刷新并不会 清空 window.history.state 的值
const initialLocation = getDOMLocation(getHistoryState());

// 通过 window.location 和 window.history.state 创建 location
function getDOMLocation(historyState) {
    const { key, state } = historyState || {};
    const { pathname, search, hash } = window.location;

    let path = pathname + search + hash;

    if (basename) path = stripBasename(path, basename);

    return createLocation(path, state, key);
}

function getHistoryState() {
    return window.history.state || {};
}
```

### key值

比较好奇的是 `location` 对象的 `key` 属性的作用，create 函数内部维护了一个 `allkeys` 队列，和浏览器的历史记录堆栈类似，该队列也按照历史记录堆栈的顺序存放着相对一个的 `location` 的 `key` 值。

有什么用？不知道😂😂😂，应该是为了后序新增的功能铺垫。在 `revertPop` 方法中写了 TODO：

```javascript
// TODO: We could probably make this more reliable by
// keeping a list of keys we've seen in sessionStorage.
// Instead, we just default to 0 for keys we don't know.
```

> 该函数没看出来对现有的功能有啥影响，感觉可以忽略该方法

## transitionManager

因为 history 提供了跳转拦截，发布/订阅等功能，这也是在每次跳转时需要处理的一些事情。

history 通过 transitionManager 对象来实现这些功能，通过名字就能看出来，过渡管理，一看就是处理跟页面的过度有关功能。

该对象通过 `createTransitionManager` 创建，具有 `setPrompt`、`confirmTransitionTo`、`appendListener`、`notifyListeners` 几个方法，这些方法是 `history` 一些方法实现的核心。

每个 history 对象都对应一个 transitionManager 对象，在合适的时候只需调用对应的方法即可。

### 跳转拦截

先来回顾跳转拦截怎么使用，首先我们使用 `history.block` 设置一个阻塞，接着我们在 `getUserConfirmation` 中判断处理是否允许跳转，`getUserConfirmation` 接收两个参数：

1. 参数1：阻塞传递的消息，我们通过 `block` 传递
2. 参数2：一个跳转的回调函数，向其传递 `true` 允许跳转，传递 `false` 阻塞

#### setPrompt

`history.block` 本质上就是调用 `setPrompt`，该方法的的目的就是设置一个阻塞，是否跳转都是其他方法来处理，所以只需要用一个共享的变量来标识已经设置了拦截就可以了。

该方法的实现很简单，因为 transitionManager 是通过函数所创建，通过一个变量 `prompt` 利用闭包实现标识拦截与否。

```javascript
let prompt = null;

// 设置阻塞消息，prompt 可以是返回字符串的函数，也可以是字符串，block 时传入
// prompt 起到了双重作用，一是标识是否设置了拦截，一是存储着阻塞消息
function setPrompt(nextPrompt) {
    prompt = nextPrompt;
    return () => {
        if (prompt === nextPrompt) prompt = null;
    };
}
```

#### confirmTransitionTo

通过函数名就能看出来，是否跳转由我来处理，而且该方法是一个通用的方法，当需要跳转时你调用我就行。

跳不跳转的事我来处理，你把 `location` 和实现跳转的方法作为 callback 传递给我，毕竟我不知道怎么跳转而且跳转的实现多种多样，而且跳转有时候需要 `getUserConfirmation` 来决定。

> callback 的格式：给你传 `true` 你就跳转，个人觉得跳转函数应该不接受参数，应该让此函数决定是否调用 callback 这样更加好。

```javascript
function confirmTransitionTo(location,  action, getUserConfirmation, callback) {
    if (prompt != null) {
        // prompt 可以是返回字符串的函数，也可以是字符串
        const result = typeof prompt === 'function' ? prompt(location, action) : prompt;
        if (typeof result === 'string') {
            getUserConfirmation(result, callback);
        } else {
            // Return false from a transition hook to cancel the transition.
            // 如果传递的的阻塞消息/函数返回的阻塞消息不是字符串，
            // 当该消息 === false 时不跳转，其他都跳转
            callback(result !== false);
        }
    } else { // 如果没有阻塞，直接跳转
        callback(true);
    }
}
```

### 发布订阅

一个典型的发布订阅模式，要实现该功能必定有一个队列存放着监听函数，在 `appendListener` 时添加，在 `notifyListeners` 调用。

比较巧妙的是 `appendListener` 的实现，因为监听是可以取消的，所以必定要从队列中移除相对应的 `listener`，利用闭包非常的巧妙实现了这一点。

```javascript
let listeners = [];

// 添加 监听者，返回取消监听函数
function appendListener(fn) {
    // 通过 isActive 来进行监听函数的过滤
    let isActive = true;

    function listener(...args) {
        if (isActive) fn(...args);
    }

    listeners.push(listener);

    return () => {
        isActive = false;
        listeners = listeners.filter(item => item !== listener);
    };
}

// notify 分发监听
function notifyListeners(...args) {
    listeners.forEach(listener => listener(...args));
}

```

## push

push 是整个 history 对象中最重要的方法，也是用的最多的方法。该方法的作用是改变 URL 地址顺便和可以给新的页面传递数据。

一旦进行了页面的跳转，history 对象就需要进行更新，`action` 和 `location` 肯定是需要改变的，这一点还是很好实现的。

而URL 的改变直接使用 `window.history.pushState` 就可以很简单的实现。

由于可能会存在跳转拦截，所以必定需要调用 `confirmTransitionTo` 方法，然后将跳转的操作作为 callback 传递。

```javascript
function push(path, state) {
    const action = 'PUSH';
    // 将新的路径对应的 location 对象创建出来
    const location = createLocation(path, state, createKey(), history.location);

    // 每次跳转都要进行 跳转确认
    transitionManager.confirmTransitionTo(
        location,
        action,
        getUserConfirmation,
        ok => {	// 向 callback 传递 true 允许跳转，否则不跳转
            if (!ok) return;
            // 根据新的 location 对象创建新的 path 路径
            const href = createHref(location);
            const { key, state } = location;
            // 通过 h5 的 history api 改变 url 地址
            // 生成的 key 和传递的 state会被保存到 window.history.state 中
            globalHistory.pushState({ key, state }, null, href);
            // 更新 history 对象
            setState({ action, location });
        }
    );
}
```

`setState` 做的事很简单，就是更新 history 对象，并顺便分发一下订阅：

```javascript
// 用于更新 history ，以及分发 listener
function setState(nextState) {
    // 更新 action 和 location
    Object.assign(history, nextState);
    // 更新 length
    history.length = globalHistory.length;
    // notify 所有 listener
    transitionManager.notifyListeners(history.location, history.action);
}
```

我们传递的 `state` 会被保存在两个地方，一个是 `history.location.state`，另一个是 `window.history.state`

`replace` 的实现很简单和 `push` 一样，不一样的仅仅是 `aciton` 的值为 `'REPLACE'`，跳转调用的是 `window.history.replaceState`

## block

由于 transitionManager 对象实现了 `setPrompt` 方法，所以 `block` 方法实现阻塞只需要调用该方法就可以，但是需要注册 `popState` 事件因为当使用浏览器前进后退时也需要进行跳转拦截的确认。

`listen` 的实现和 `block` 的实现类似，因为一旦设置了监听，跳转时需要分发订阅。

```javascript
let isBlocked = false;

// 添加一个阻塞
function block(prompt = false) {
    const unblock = transitionManager.setPrompt(prompt);

    // 防止重复注册事件
    if (!isBlocked) {
        checkDOMListeners(1);
        isBlocked = true;
    }

    // 防止重复调用
    return () => {
        if (isBlocked) {
            isBlocked = false;
            checkDOMListeners(-1);
        }

        return unblock();
    };
}
```

### 事件处理

当设置了 block / listen 时，当通过浏览器进行前进后退时，也需要跳转检测。

`checkDOMListeners` 方法实现了事件的添加和取消。

```javascript
// 添加 popState 事件处理，当使用 前进后退 时，也需要跳转检测，以及用于取消该事件处理
// 该方法只有当设置了 block / listen 时才有必要
function checkDOMListeners(delta) {
    listenerCount += delta;
    if (listenerCount === 1 && delta === 1) {
        window.addEventListener(PopStateEvent, handlePopState);
    } else if (listenerCount === 0) {
        window.removeEventListener(PopStateEvent, handlePopState);
    }
}

// 处理 popstate 事件
function handlePopState(event) {
    handlePop(getDOMLocation(event.state));
}

function handlePop(location) {
    const action = 'POP';
    // 根据阻塞更新 history 
    transitionManager.confirmTransitionTo(
        location,
        action,
        getUserConfirmation,
        ok => {
            if (ok) {
                setState({ action, location });
            } else {
                revertPop(location);
            }
        }
    );
}
```

# 其他

## basename

history 提供了 `basename` 功能，也就是说我们的项目可能不是部署在网站的根目录，在创建 history 的时候我们可以指定 basename，然后写项目时可以当作项目就是部署在根目录一样来写，history 帮我们处理的这个问题。

处理方式就是通过 `createHref` 的实现，该函数是创建一个 `path` 字符串，一般用于内部的实现。它的实现很简单：

```javascript
// 创建一个 path 字符串
function createHref(location) {
    return basename + createPath(location);
}

// 通过 location 对象创建 path，path格式为 /path?query#hash
function createPath(location) {
    const { pathname, search, hash } = location;

    let path = pathname || '/';

    if (search && search !== '?')
        path += search.charAt(0) === '?' ? search : `?${search}`;

    if (hash && hash !== '#') path += hash.charAt(0) === '#' ? hash : `#${hash}`;

    return path;
}
```

## getUserConfirmation

在我们使用 react-router 的过程中，发现没有传递 `getUserConfirmation`，有默认的处理方式，history 提供了该方法的默认实现：

```javascript
// 默认 gerUserConfirmation 实现
function getConfirmation(message, callback) {
    callback(window.confirm(message)); // eslint-disable-line no-alert
}
```

# react-router

react-router 本身的实现是比较简单的，核心的功能都被 history 实现了。

只需要根据 path 的匹配与否来渲染对应的组件，以及提供上下文数据。主要就是实现一些用于路由的组件。

## 上下文

react-router 中定义了两个上下文，一个是 `RouterContext`，另一个是 `HistoryContext`。

react-router 中的上下文设计我不是很能理解，`RouterContext.Provider` 使用了两次，上下文中都是 `history`、`location`、`match`

但是第一个 `RouterContext` 中数据不是给我们使用的，而且其中的 `match` 和我们真正使用的 `match` 不一样，`Route` 组件又使用了一次该上下文，这次传递的 `value` 才是我们组件中真正使用到的数据。

`HistoryContext` 中的数据只有一个 `history` 对象，用于给 `useHistory` hook 提供 `history`，明明使用 `RouterContext` 就能够拿到需要的 `history`。

## matchPath

该方法用于进行路径匹配，用于将当前的路径和配置的路径规则进行匹配，匹配成功返回 `match` 对象，否则返回 `null`。

核心是利用 path-to-regexp 库进行匹配，`match` 对象的格式：

```json
{
    isExact: true, // 当前的路径和路由配置的路径是否是精确匹配的,跟 exat 配置没关系
    params: {}, // 路径规则中对应的参数, /:id 这种
    path: "/",  // 路径规则
    url: "/"  // 真实路径中匹配到路径规则的那部分
}
```

每当需要进行路径匹配的时候都会调用该方法进行判断，我们给一个组件配置的路径规则和选项例如 `exact`，都会传递过来进行判断。

```javascript
function matchPath(pathname, options = {}) {
    if (typeof options === "string" || Array.isArray(options)) {
        options = { path: options };
    }

    const { path, exact = false, strict = false, sensitive = false } = options;

    // path（路径规则） 可以是 string,也可以是 []，如果 参数不是 [], concat 也能拼接
    const paths = [].concat(path);

    // 只要 path 中有一个能匹配就可以
    return paths.reduce((matched, path) => {
        if (!path && path !== "") return null;
        
		// ...大段处理过程

        return { /* ...  */};
    }, null);
}
```

## Router

因为存在三种不同的路由组件，但是核心逻辑是相同的，`Router` 组件就是所有路由组件都使用的核心组件，只需要传递不同类型的 `history` 即可。

`Router` 组件做的事很简单，就是提供上下文数据，主要是给内部组件提供的，间接的给我们的组件提供。

其中进行了一些必要的处理，存在子组件在 `Router` 组件没有 mount 完毕就改变 URL 的情况。

![](http://oss.xiefeng.tech/img/20210411155549.png)

## Route

`Route` 组件的作用：

1. 根据路径规则配置来配渲染我们的组件
2. 为我们的组件提供上下文数据，以及将上下文中的数据作为 `props` 传入

`Route` 组件可以传入 `component`、`render`、`children`，但是渲染的优先级是不同的，这里才是 `Route` 组件的核心。

优先级：`children`（函数）> `children`（node）> `component`（node） > `render`（函数）

当 `children` 为函数时，即使该路由没有匹配也会渲染。

当我们直接使用 Route 组件时，每个 Route 组件是一定会被渲染的，只不过会根据我们递的路径规则进行 mathPath 进行判断是否把我们的组件渲染出来。

而当我们使用了 `Switch` 组件时，只有匹配到的第一个才会被渲染，为了提高优先级 `Switch` 会传递 `computedMatch` 属性，其实就是一个 `match` 对象，只不过名称不同而已，我们也可以传递不过没必要。

![](http://oss.xiefeng.tech/img/20210411155338.png)

## Switch

Switch 组件用于渲染第一个匹配的 Route 组件 / Redirect 组件。

其实没必要一定是 Route / Redirect，只要一个组件传递了 path / from 属性，Switch 都会渲染。

![](http://oss.xiefeng.tech/img/20210411154250.png)

## Lifecycle

正如名字那样，这个组件不是用来渲染的，是用来在生命周期处理各种事情的，是一个工具组件。

```jsx
class Lifecycle extends React.Component {
    componentDidMount() {
        if (this.props.onMount) this.props.onMount.call(this, this);
    }

    componentDidUpdate(prevProps) {
        if (this.props.onUpdate) this.props.onUpdate.call(this, this, prevProps);
    }

    componentWillUnmount() {
        if (this.props.onUnmount) this.props.onUnmount.call(this, this);
    }

    render() {
        return null;
    }
}
```

## Redirect

`Redirect` 组件用于实现跳转，但是不能在 render 的时候就跳转，这就相当于在 render 时触发 rerender，不合理。所以需要在 cdm 中进行，利用写好的 `Lifecycle` 组件只需要传递回调就可以。

而且单独使用 `Redirect` 是没办法使用 `from` 属性进行匹配的，只有使用 `Switch` 时才可以使用，因为 `from` 的匹配在 `Switch` 组件完成。

![](http://oss.xiefeng.tech/img/20210411155107.png)