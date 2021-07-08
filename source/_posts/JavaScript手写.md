---
title: JavaScript手写
date: 2021-03-16 15:41:35
tags: JavaScript
categories: [编程语言, JavaScript]
cover: http://oss.xiefeng.tech/img/20210208221017.jpg
---

# new

## 原理

1. 创建一个新对象（`this`）
2. 对这个新对象执行 `[[prototype]]` 连接
3. 这个新对象会绑定到函数调用的 `this`
4. 如果函数没有返回其他对象，那么 `new` 表达式中的函数调用会自动返回这个新对象

## 实现

```javascript
function create(constructor, ...args) {
    const ctx = Object.create(constructor.prototype);
    const res = constructor.apply(ctx, args);
    return res instanceof Object ? res : ctx;
}
```

# call

## 使用细节

1. `call` 将调用函数的该次调用 `this` 指向第一个参数
2. `call` 将后序参数作为形参传入调用函数
3. `call` 会立即执行调用函数并返回结果
4. 直接调用 `call` 返回 `undefined`
5. `call` 不能作为构造函数
6. 第一个参数 `== null`，`this` 指向全局对象

## 实现

```javascript
Function.prototype.myCall = function (ctx, ...args) {
    if (new.target === Function.prototype.myCall) {
        throw new TypeError('Function.prototype.myCall is not a constructor');
    } else if (this === Function.prototype) {
        return;
    }
    ctx = ctx || globalThis;
    const fn = Symbol(this.name);
    ctx[fn] = this;
    const res = ctx[fn](...args);
    delete ctx[fn];
    return res;
}
```

# apply

## 使用细节

`apply` 所做的事和 `call` 一样，都是改变函数的 `this` 指向并执行函数。

1. 第二个参数以类数组接收函数形参，传入 `null`、引用类型以及不传递都不会报错
2. 直接调用 `apply` 返回 `undefined`
3. `apply` 不能作为构造函数
4. 第一个参数 `== null`，`this` 默认指向全局对象

## 实现

```javascript
Function.prototype.myApply = function (ctx, args) {
    if (new.target === Function.prototype.myApply) {
        throw new TypeError('Function.prototype.myApply is not a constructor');
    } else if (this === Function.prototype) {
        return;
    }
    if (!(args instanceof Object)) {
        throw TypeError('CreateListFromArrayLike called on non-object');
    }
    args = args == null ? [args] : Array.from(args);
    ctx = ctx || globalThis;
    const fn = Symbol(this.name);
    ctx[fn] = this;
    const res = ctx[fn](...args);
    delete ctx[fn];
    return res;
}
```

# bind

## 使用细节

1. `bind` 返回一个函数，该函数的 `this` 被绑定为 `bind` 第一个参数
2. 使用 `bind` 可以传递后序参数（可传递部分）
3. `bind` 返回的函数可以被用作构造函数，其 `this` 取消绑定
4. `bind` 不能作为构造函数

## 实现

```javascript
Function.prototype.myBind = function (ctx, ...args1) {
    if (new.target === Function.prototype.myBind) {
        throw new TypeError('Function.prototype.myBind is not a constructor');
    }
    const self = this;
    return function func(...args2) {
        if (new.target === func) {
            return new self(...args1, ...args2);
        }
        return self.call(ctx, ...args1, ...args2);
    }
}
```

# instanceof

`instanceof` 用于判断一个对象是不是一个类的实例，本质上就是判断一个对象的原型是不是在一个对象的原型链上。

```javascript
function myInstanceof(sub, superType) {
    const proto = Object.getPrototypeOf(sub);
    if (proto) {
        if (superType.prototype === proto) {
            return true;
        } else {
            return myInstanceof(proto, superType);
        }
    }
    return false;
}
```

# 深度克隆

利用 `JSON.stringfy` + `JSON.parse` 也能实现对象的深拷贝，但是存在一些问题：

- 如果对象里面有 `Date` 对象，则拷贝之后时间将只是字符串的形式
- 如果对象里有 `RegExp`、`Error` 对象，则序列化的结果将只得到空对象
- 如果对象里有 `function`、`Symbol`、`undefined`，则序列化的结果会忽略它们
- 如果对象里有 `NaN`、`Infinity` 和 `-Infinity`，则序列化的结果会变成 `null`
- 存在循环引用会报错

## 简单实现

```javascript
function deepClone(origin) {
    // 用于处理循环引用
    const origins = [];
    const targets = [];

    const clone = origin => {
        if (origin === null || typeof origin !== "object") {
            return origin;
        }
        const index = origins.indexOf(origin);
        if (index != -1) {
            return targets[index];
        }
        origins.push(origin);
        let target;
        if (origin instanceof RegExp) {
            target = new RegExp(origin.source, origin.flags);
            target.lastIndex = origin.lastIndex;
        } else if (origin instanceof Date) {
            target = new Date(origin);
        } else {
            target = Array.isArray(origin) ? [] : {};
            for (const prop in origin) {
                if (Object.hasOwnProperty.call(origin, prop)) {
                    target[prop] = clone(origin[prop]);
                }
            }
        }
        targets.push(target);
        return target;
    }
    return clone(origin);
}
```

# 防抖和节流

## 函数防抖

不管函数运行被运行的频率多高，该函数一定在n秒后才真正执行。如果在n秒内又被调用，则重新计时。

```javascript
function debounce(callback, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => callback.apply(this, args), delay);
    }
}
```

## 函数节流

不管函数运行被运行的频率多高，单位时间内函数只真正执行一次。

### 时间戳

```javascript
function throttle(callback, duration) {
    let lastTime = 0;
    return function (...args) {
        const nowTime = new Date().getTime();
        if (nowTime - lastTime >= duration) {
            callback.apply(this, args);
            lastTime = nowTime;
        }
    }
}
```

### 定时器

```javascript
function throttle(callback, duration) {
    let timer = null;
    return function (...args) {
        if (!timer) {
            timer = setTimeout(() => {
                timer = null;
                callback.apply(this, args);
            }, duration);
        }
    }
}
```

### 结合

时间戳和定时器实现函数节流存在的问题：

- 时间戳实现，第一次事件肯定触发，最后一次不会触发
- 定时器实现，第一次事件不会触发，最后一次一定触发

```javascript
function throttle(callback, duration) {
    let lastTime = 0;
    let timer = null;
    return function (...args) {
        const curTime = Date.now();
        if (curTime - lastTime > duration) {
            clearTimeout(timer);
            timer = null;
            lastTime = curTime;
            callback.apply(this, args);
        } else if (!timer) {
            timer = setTimeout(() => {
                callback.apply(this, args);
            }, duration);
        }
    }
}
```

## 应用场景

**函数防抖**

- 搜索联想，输入完毕之后再发送请求，节约资源
- 像 `window` 的 `resize` 这类事件，用防抖来让其只触发一次
- 表单的验证，输入完毕再触发

**函数节流**

- 高频点击提交，表单重复提交
- 滚动加载，加载更多或滚到底部监听
- 鼠标不断点击触发

# 柯里化

柯里化是一种将使用多个参数的一个函数转换成一系列使用一个参数的函数的技术。

```javascript
function curry(func, ...args) {
    return (...restArgs) => {
        const allArgs = [...args, ...restArgs];
        if (args.length >= func.length) {
            return func(...allArgs);
        } else {
            return curry(func, allArgs);
        }
    }
}
```

# 函数组合

函数式编程中的思想，将一个数组中的函数进行组合，形成一个新的函数，该函数调用时，实际上是反向调用之前组合的函数。

```javascript
function compose(...funcs) {
    if (funcs.length === 0) {
        return args => args; //如果没有要组合的函数，则返回的函数原封不动的返回参数
    } else if (funcs.length === 1) {
        return funcs[0]; //要组合的函数只有一个，直接返回原本的函数
    }
    return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
```



