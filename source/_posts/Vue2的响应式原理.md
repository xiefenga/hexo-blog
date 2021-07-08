---
title: Vue2响应式原理
date: 2021-03-19 18:50:04
tags: Vue
categories: [前端, Vue]
cover: http://oss.xiefeng.tech/img/20210319191737.png
sticky: 5
---

# 响应式

数据响应式的目标：当响应式数据对象本身或属性发生变化时，会运行一些函数，比如 `render` 函数。

Vue 响应式的实现上，具体依赖几个模块：

1. Observer
2. Dep
3. Watcher
4. Scheduler

该几个模块的实现都在 Vue2 源码的 `./src/core/observer` 中。

# Observer

一个数据在 Vue 中想变成响应式数据，只需要调用一个函数 `observe` 即可，该函数会将数组和对象变成响应式。

但是具体功能的实现依赖 `Observer`，`Observer` 是一个类，它和每一个被观察的对象相关联，每一个响应式数据都对应着一个 `Observer` 实例，可以通过 `__ob__` 属性访问到该实例。

`observe` 的实现比较简单，对需要实现响应式的数据构造一个 `Observer` 实例即可：

```javascript
function observe (value: any): Observer | void {
    let ob: Observer | void;
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__;
    } else if (Array.isArray(value) || isPlainObject(value)) {
        ob = new Observer(value);
    }
    return ob;
}
```

Vue2 通过 `Object.defineProperty` 给对象添加 `getter` 和 `setter` 来实现响应式，所以 `new Observer` 之后即可实现这样的效果。

![](http://oss.xiefeng.tech/img/20210319192701.png)

Vue2 中数组的响应式和对象的响应式有一些区别的，如果数组中的某一项是原始值则该数据是没有响应式的，而一些原型方法是具有响应式的。

这些原型方法具有响应式，必然是被 Vue 重写了。

在 `array` 模块中，通过 `Object.create(Array.prototype)` 创建了一个对象 `arrayMethods`，将数组的一些方法重写到该对象身上并实现响应式，具体的做法就是先调用原始的方法，接着再分发依赖。

所以对数组需要进行两个操作，一是修改原型让被观察的数组继承自 `arrayMethods`，二是对数组的每一项再进行 `observe`。

第二步很好实现，比较恶心的是第一步，怎么让一个已经存在的对象继承自另一个对象。

Vue2 是基于 ES5 实现的，ES5 未提供可以直接修改隐式原型的方法，`Object.setPrototypeOf` 方法是 ES6 才添加。

Vue2 只能针对实现了 `__proto__` 和未实现 `__proto__` 的浏览器分别执行不同的操作：

- 对于实现了 `__proto__` 的浏览器直接修改该数组的 `__proto__` 属性让数组继承自 `arrayMethods`
- 未实现 `__proto__` 的浏览器则将 `arrayMethods` 的那些方法直接定义到数组身上。

![](http://oss.xiefeng.tech/img/20210319205043.png)

```javascript
function protoAugment (target, src: Object) {
  target.__proto__ = src
}

function copyAugment (target: Object, src: Object, keys: Array<string>) {
    for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i]
        def(target, key, src[key])
    }
}
```

所以 `Observer` 的构造函数所做的事就是对不同类型（数组、对象）的数据采取不同的操作：

```typescript
class Observer {

    constructor (value: any) {
        this.value = value
        this.dep = new Dep()
        
        def(value, '__ob__', this)
        
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods)
            } else {
                copyAugment(value, arrayMethods, arrayKeys)
            }
            this.observeArray(value)
        } else {
            this.walk(value)
        }
    }
}
```

具体为对象使用 `Object.defineProperty` 添加 `getter` 和 `setter` 实现响应式的函数是 `defineReactive`。

该函数在实现响应式的过程中，会通过 `observe` 函数来进行递归以完成深度的响应式实现。

由于遍历时只能遍历到对象的当前属性，无法监测到将来动态增加或删除的属性，`Observer` 模块定义了两个函数 `set` 和 `del` 来解决这个问题。

- 对于对象，删除 / 新增属性之后，通过 `__ob__.notify` 来实现派发更新。

- 对于数组，直接调用改写过的原型方法 `splice` 即可实现派发更新，因为 `arrayMethods` 中也同样使用了 `ob.dp.notify` 派发更新。

# Dep

还有两个问题没解决，就是读取属性时要做什么事，而属性变化时要做什么事，这个问题需要依靠 `Dep` 来解决。

`Dep` 的含义是 `Dependency`，表示依赖的意思。

`Dep` 同样是一个类，该类主要用于解决读取属性读取和属性变化时需要做的事情。

**Vue2 会为响应式对象中的每个属性、对象本身、数组本身创建一个 `Dep` 实例。**

每个 `Dep` 实例都有能力做以下两件事：

- 记录依赖：是谁（函数）在用我对应的数据
- 派发更新：我对应的数据变了，要通知那些用到我的函数进行更新

当读取响应式数据时，它会进行依赖收集；当改变某个响应式数据时，它会派发更新。

这些事都是在 `defineReactive` 中实现：

- `defineReactive` 函数第一行代码就是 `const dep = new Dep()`
- `Observer` 构造函数中存在 ` this.dep = new Dep()`
- `getter` 中存在  `dep.depend()` 收集依赖
- `set` 中存在 `dep.notify()` 派发更新

![](http://oss.xiefeng.tech/img/20210319212645.png)

# Watcher

这里又出现一个问题，就是 `Dep` 如何知道是谁在用我？

要解决这个问题，需要使用到另一个类 `Watcher`。

当某个函数（computed、watch、render）执行的过程中，用到了响应式数据，响应式数据自己是无法知道是哪个函数在用自己的。

响应式的本质就是数据发生了变化，去运行一些函数。在 Vue 中，去运行那些类型的函数我们是知道的，总共就三类：render、computed、watch。

Vue2 通过一种巧妙的办法来解决这个问题，我们不要直接执行函数，而是把函数交给一个叫做 `watcher` 的东西去执行。

每个会用到响应式数据的**这些函数**在初始化的时候都创建一个 `Watcher` 实例，通过该 `watcher` 对象去执行该函数。

在每个 `watcher` 执行对应的函数之前会将一个全局共享的变量设置为自己，然后然后开始执行函数，在函数的执行过程中，如果用到了响应式数据会执行 `getter` 间接的会执行 `dep.depend`，`dep.depend` 函数的作用是记录依赖，所谓的依赖就是这些 `Watcher` 实例。

![](http://oss.xiefeng.tech/img/20210319210527.png)

具体的做法：

1. Vue2 会为每一个响应式数据都创建一个 `Dep` 实例，每个依赖响应式数据的函数都对应一个 `watcher`
2. 每一个 `dep` 实例都具有一个属性 `subs` 记录该 `dep` 对应的响应式数据被依赖的函数对应的 `watcher`
3. `Dep` 有一个静态属性 `target`，在全局用来记录正在执行的  `watcher` 实例
4. 当用到响应时数据时，函数是通过 `Watcher` 实例执行，在执行前将 `Dep.target` 设为自己
5. 当用到响应时数据时会调用 `dep.depend` 就会将现在这个 `watcher` 加入到 `subs` 中，也就是所谓的依赖记录
6. 当响应时数据发生改变，会运行 `setter`，从而运行 `dp.notify` 派发更新，派发更新十分简单就是运行 `subs` 中的每一个 `watcher` 的 `update` 方法
7. `Watcher` 实例有一个 `run` 方法，就是运行和 `watcher` 对应的函数

```javascript
notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
        subs[i].update()
    }
}
```

# Scheduler

`Dep` 通知 `watcher` 之后，如果 `watcher` 立即执行 `run` 运行对应的函数，就有可能导致函数频繁运行，从而导致效率低下。

这样显然是不合适的，因此 `watcher` 收到派发更新的通知后，实际上不是立即执行对应函数，而是运行 `run` 方法把自己交给一个叫调度器的东西，让调度器来调度自己的运行，通过 `queueWatcher(this)` 来实现。

```javascript
update () {
    /* istanbul ignore else */
    if (this.lazy) {
        this.dirty = true
    } else if (this.sync) {
        this.run()
    } else {
        queueWatcher(this)
    }
}
```

调度器通过 scheduler 模块实现，该模块维护一个执行队列，该队列中同一个 `watcher` 仅会存在一次

scheduler 模块中还存在一个 `MAX_UPDATE_COUNT = 100` 的常量，看名字猜测可能队列最多允许存放 100 个 `watcher`

scheduler 模块具有一个  `flushSchedulerQueue` 函数，用于清空执行队列，该函数会被传递给 next-tick 模块中 `nextTick` 函数。

next-tick 模块简单来说就是用于执行一些异步的微任务，该模块维护了一个任务队列，`nextTick` 方法会将需要执行的任务放入为微队列中，一般使用 `Promise` 实现，其次会依次使用 `MutationObserver`、`setImmediate`、`setTimeout(flushCallbacks, 0)`。

所以说 Vue 的更新（render函数的执行）是异步的。

`nextTick` 通过 `$nextTick` 暴露给我们，如果在数据更新操作前使用 `nextTick` 则拿到的数据是更新之前的，在数据更新之后使用 `nextTick` 则可以拿到变化之后的值。

# 总体流程

![](http://oss.xiefeng.tech/img/20210319215147.png)











