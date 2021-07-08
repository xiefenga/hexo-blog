---
title: Vue2配置的处理方式
date: 2021-03-21 13:27:05
tags: Vue
categories: [前端, Vue]
cover: http://oss.xiefeng.tech/img/20210315221604.png
sticky: 4
---

# computed实现原理

computed 依赖响应式数据，所以在实现的时候必然需要用到 `Watcher`，Vue2 会给实例对象创建一个 `_computedWatchers` 属性，跟该实例中 `computed` 对应的 `Watcher` 实例都会被保存在该数组中。

computed 的特点：

- 在没有使用到 computed 的时候，不会运行 computed 的 `getter`
- 在改变 computed 所依赖的响应式数据的时候，不会立即更新 computed 的值，一切都要等到使用 computed 的时候

由于 computed 的特点，处理 computed 的 `Watcher` 实例有些特殊，处理的非常巧妙。

它具有一个 `lazy` 属性，用于标识这是一个 lazy watcher，同时也会具有一个属性 `dirty` 标识数据是否是脏数据，`watcher` 的 `value` 属性表示该计算属性的值。

在实例化该 `Watcher` 时，传递的 `options` 是一个极其简单的配置 `{ lazy: true }`，`dirty` 初始值等于 `lazy`，表明是一个脏数据，因为 `value` 最初并不会计算出来，初始值是 `undefined`，只有当运行 `getter` 时，才会计算。

computed 的源码在 `./src/core/instance/state.js` 中，大致的源码：

```javascript
const computedWatcherOptions = { lazy: true }

const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
}

function initComputed(vm: Component, computed: Object) {
    const watchers = vm._computedWatchers = Object.create(null)
    for (const key in computed) {
        const userDef = computed[key]
        const getter = typeof userDef === 'function' ? userDef : userDef.get
        // create internal watcher for the computed property.
        watchers[key] = new Watcher(vm, getter, noop, computedWatcherOptions)
        defineComputed(vm, key, userDef)
    }
}

function defineComputed(target: any, key: string, userDef: Object | Function) {
    if (typeof userDef === 'function') {
        sharedPropertyDefinition.get = createComputedGetter(key)
    } 
    Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter(key) {
    return function computedGetter() {
        const watcher = this._computedWatchers[key]
        if (watcher.dirty) {
            watcher.evaluate()
        }
        return watcher.value
    }
}
```

配置的 computed 的选项会通过 `Object.defineProperty` 被代理到组件实例身上，而且只有使用到该 computed 时，运行 `getter` 才会开始计算该 computed 的值。通过 `dirty` 的值来判断数据是否是脏数据。

由于 computed 上次计算时用到了该响应时数据运行了它的 `getter`，所以 computed 所对应的 watcher 会被收集，当 computed 所依赖的响应式数据发生改变时，会运行 `dep.notify`，就会运行相对应的 `Watcher` 实例的 `update` 方法，对于一般的 watcher，会把自己交给 scheduler，而对于 computed 的 watcher，直接运行一句简单的代码 `this.dirty = true`。

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

# watch实现原理

在定义完 Vue 构造函数之后，会运行一系列函数为 `Vue` 添加原型方法，其中一个 `stateMixin` 会给 `Vue` 添加 `$watch` 方法，该方法是 Vue 处理 watch 配置需要用到的方法，也是 Vue 暴露给我们使用 watch 的方法。

watch 也需要依赖响应式数据，所以依旧需要借助 `Watcher`。针对每一个 watch 配置，Vue 都会为它创建一个 `Watcher` 实例。

**initWatch**

```javascript
function initWatch(vm: Component, watch: Object) {
    for (const key in watch) {
        const handler = watch[key]
        if (Array.isArray(handler)) {
            for (let i = 0; i < handler.length; i++) {
                createWatcher(vm, key, handler[i])
            }
        } else {
            createWatcher(vm, key, handler)
        }
    }
}

function createWatcher(vm: Component, expOrFn: string | Function, handler: any, options?: Object) {
    if (isPlainObject(handler)) {
        options = handler
        handler = handler.handler
    }
    if (typeof handler === 'string') {
        handler = vm[handler]
    }
    return vm.$watch(expOrFn, handler, options)
}
```

`createWatcher` 的作用就是处理一下回调函数的格式，再接着调用 `$watc`h 创建 `Watcher` 实例。

**$watch**

```javascript
Vue.prototype.$watch = function (expOrFn: string | Function, cb: any, options?: Object): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
        return createWatcher(vm, expOrFn, cb, options)
    }
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
        cb.call(vm, watcher.value)
    }
    return function unwatchFn() {
        watcher.teardown()
    }
}
```

**watch 如何实现让响应时数据收集依赖？**

在 `$watch` 方法中只是创建了一个 `Watcher` 实例，并没有通过 `vm.xxx` 来让响应式数据收集依赖，那就只能在 `Watcher` 内部收集了。

在 `Watcher` 的构造函数中有这么几行：

```javascript
if (typeof expOrFn === 'function') {
    this.getter = expOrFn
} else {
    this.getter = parsePath(expOrFn)
}
this.value = this.lazy ? undefined : this.get()
```

核心就是这个 `get` 方法，该方法的注释是：Evaluate the getter, and re-collect dependencies.

```javascript
get () {
    pushTarget(this)
    let value
    const vm = this.vm
    value = this.getter.call(vm, vm)
    popTarget()
    return value
}
```

在初始化 `watch` 之前，就已经初始化过 `data` 了，此时的 `data` 已经具有响应时了，所以通过 `get` 方法，可以让 `data` 中的数据收集到依赖。

# methods的处理

由于 methods 不具有响应时，调用一次执行一次，因此只需要将其代理到实例上并且绑定 `this` 就可以。

```javascript
function initMethods(vm: Component, methods: Object) {
    const props = vm.$options.props
    for (const key in methods) {
        vm[key] = bind(methods[key], vm)
    }
}
```

# data的处理

data 的处理也很简单，将 data 中的数据都代理到实例上，并且将其变为响应时数据。

通过 `observe` 模块的 `observe` 方法可以很简单的实现。

```javascript
function initData(vm: Component) {
    let data = vm.$options.data
    data = vm._data = typeof data === 'function' ? data() : data || {}

    // proxy data on instance
    const keys = Object.keys(data)
    let i = keys.length
    while (i--) {
        const key = keys[i]
        proxy(vm, `_data`, key)
    }
    // observe data
    observe(data, true /* asRootData */)
}

function proxy(target: Object, sourceKey: string, key: string) {
    sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key]
    }
    sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val
    }
    Object.defineProperty(target, key, sharedPropertyDefinition)
}
```