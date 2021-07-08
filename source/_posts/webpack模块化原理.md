---
title: webpack模块化原理
date: 2021-01-26 15:40:45
tags: webpack
categories: [前端, webpack]
keywords: webpack模块化原理
description: webpack模块化原理
cover: https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208123725.png
---

# commonjs

在webpack中既可以书写commonjs模块也可以书写es模块，而且不用考虑浏览器的兼容性问题，我们来分析一下原理。

首先搞清楚commonjs模块化的处理方式，简单配置一下webpack，写两个模块编译一下看一下：

webpack.config.js

```js
module.exports = {
    mode: "development",
    devtool: "none"
}
```

index.js

```js
const a = require('./a')
console.log(a)
```

a.js

```js
const a = 'a';
module.exports = a;
```

## 编译结果

查看编译结果，可以发现webpack对于每个模块的做法类似于node，将每个模块放在一个函数环境中并向其中传入一些必要的参数。webpack将这些模块组成一个对象（属性名是模块路径(模块id)，属性值为模块内容）传入一个立即执行函数，立即执行函数中定义了一个函数 `__webpack_require__`类似node中的`require`函数，实现了导入模块的作用。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210126162619.png)

打包结果中删去了一些注释和暂时用不要的代码，可以很明显的看出来实现commonjs模块化的关键就是这个 `__webpack_require__` 函数，通过传入模块id来得到模块的导出。

## require 函数

`__webpack_require__` 函数的实现：

```js
function __webpack_require__(moduleId) {
    // Check if module is in cache
    if (installedModules[moduleId]) {
        return installedModules[moduleId].exports;
    }
    // Create a new module (and put it into the cache)
    var module = installedModules[moduleId] = {
        i: moduleId,
        l: false,
        exports: {}
    };
    // Execute the module function
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    // Flag the module as loaded
    module.l = true;
    // Return the exports of the module
    return module.exports;
}
```

如果熟悉node就很容易理解这个函数了：

1. 首先查看这个模块是否已经被加载过，所以就需要一个全局变量`installedModules`用来记录所有被加载过模块的导出
2. 没有加载过的模块就先构造一个`module`对象，关键是要有一个 `exports` 属性
3. 执行模块代码并返回模块导出值

最终的一步就是需要加载启动模块，也就是IIFE的最后一句：

```js
return __webpack_require__("./src/index.js");
```

# ES Module

es 模块化的处理方式是需要借助 `__webpack_require__` 实现的，首先看一些刚才被删除的代码：

1. `__webpack_require__.r`

	该函数用于标识es模块的导出

	```js
	// define __esModule on exports
	__webpack_require__.r = function (exports) {
	    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
	        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
	    }
	    Object.defineProperty(exports, '__esModule', { value: true });
	};
	```

2. `__webpack_require__.d`

	用于处理es模块的具名导出

	```js
	// define getter function for harmony exports
	__webpack_require__.d = function (exports, name, getter) {
	    if (!__webpack_require__.o(exports, name)) {
	        Object.defineProperty(exports, name, { enumerable: true, get: getter });
	    }
	};
	```

3. `__webpack_require__.o`

	就是给 `hasOwnPreperty` 换了个名字

	```js
	__webpack_require__.o = 
	    function (object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
	```

我们改一下模块代码看看纯es Module导入导出的编译结果：

index.js

```js
import a, { test } from './a'
import b from './b'
console.log(a);
test();
console.log(b)
```

a.js

```js
const a = 'a';
function test() { }
export default a;
export { test }
```

b.js

```js
const b = 'b';
export default b;
```

## 编译结果

```js
{
    "./src/a.js": (function (module, __webpack_exports__, __webpack_require__) {

        "use strict";
        __webpack_require__.r(__webpack_exports__);
        /* harmony export (binding) */
        __webpack_require__.d(__webpack_exports__, "test", function () { return test; });

        const a = 'a';

        function test() { }

        /* harmony default export */
        __webpack_exports__["default"] = (a);
    }),
    "./src/b.js": (function (module, __webpack_exports__, __webpack_require__) {

        "use strict";
        __webpack_require__.r(__webpack_exports__);
        const b = 'b';

        /* harmony default export */
        __webpack_exports__["default"] = (b);

    }),
    "./src/index.js": (function (module, __webpack_exports__, __webpack_require__) {

        "use strict";
        __webpack_require__.r(__webpack_exports__);
        /* harmony import */
        var _a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/a.js");
        /* harmony import */
        var _b__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/b.js");

        console.log(_a__WEBPACK_IMPORTED_MODULE_0__["default"])

        Object(_a__WEBPACK_IMPORTED_MODULE_0__["test"])();

        console.log(_b__WEBPACK_IMPORTED_MODULE_1__["default"])
    })
}
```

根据编译结果可以很明白的看出来，和 commonjs 编译出来的结果差不多，核心都是使用 `__webpack_require__` 函数，区别在于es模块化，`exports` 对象首先就会被`__webpack_require__.r`标记为es module，对于默认导出就是 `exports` 的 `default` 属性，对于具名导出使用 `__webpack_require__.d` 包装了一下，目的是让这些具名导出在模块之外只能读不能被修改（这是es module的特点）。

## v5 的变化

但是为什么 `default` 没有被`__webpack_require__.d` 处理，这不合理啊。本来是使用的 webpack 4打包的，然后换了webpack 5试了一下，webpack 5打包的结果中 `default` 也被处理了，这可能是webpack 4的一个小bug吧。

webpack5的编译结果有些许的不同，但是整个逻辑是没有变的：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210126191117.png)

# 两种模块化交互

webpack 是支持两种模块化代码共存的，虽然不建议这样做。首先我们先看一下他们互相导入的时候的导入结果是什么样的：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210126193113.png)

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210126193114.png)

我们来看看 webpack 是如何实现的，先修改一下模块：

index.js

```js
const { a, test } = require('./a')
```

a.js

```js
import b from './b'
import * as bbb from './b'
console.log(bbb)
console.log(b)
console.log(b.b)
const a = 'a';
function test() { }
export default a;
export { test };
```

b.js

```js
module.exports = {
  b: () => { },
  moduleName: 'b'
}
```

## 编译结果

```js
{
  "./src/a.js":
    (function (module, __webpack_exports__, __webpack_require__) {

      "use strict";
      __webpack_require__.r(__webpack_exports__);
      /* harmony export (binding) */
      __webpack_require__.d(__webpack_exports__, "test", function () { return test; });
      /* harmony import */
      var _b__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/b.js");
      /* harmony import */
      var _b__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(_b__WEBPACK_IMPORTED_MODULE_0__);
        
      console.log(_b__WEBPACK_IMPORTED_MODULE_0__)

      console.log(_b__WEBPACK_IMPORTED_MODULE_0___default.a)

      console.log(_b__WEBPACK_IMPORTED_MODULE_0___default.a.b)

      const a = 'a';

      function test() { }

      /* harmony default export */
      __webpack_exports__["default"] = (a);
    }),
  "./src/b.js": (function (module, exports) {

    module.exports = {
      b: () => { },
      moduleName: 'b'
    }
  }),
  "./src/index.js": (function (module, exports, __webpack_require__) {

    const { a, test } = __webpack_require__("./src/a.js")
  })
}
```

可以发现当通过es模块的方式去 `import` 一个commonjs模块时，就会把导入的模块进行一层包装，通过 `__webpack_require__.n`，主要目的应该是为了兼容 `import * as obj from '....'` 这样的语法。

该函数的具体实现：

```js
__webpack_require__.n = function (module) {
    var getter = module && module.__esModule 
    ? function getDefault() { return module['default']; }
    : function getModuleExports() { return module; };
    __webpack_require__.d(getter, 'a', getter);
    return getter;
}
```

# 总结

webpack 中实现模块化的核心就是 `__webpack_require__` 函数，无论是commonjs模块化还是es 模块都是通过该函数来导入的。并且利用立即执行函数的特点实现了作用域的封闭避免了全局变量的污染，非常的巧妙。