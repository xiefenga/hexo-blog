---
title: webpack中的性能优化
date: 2021-02-05 11:07:10
tags: webpack
categories: [前端, webpack]
keywords: webpack, 性能优化
description: webpack常见性能优化
cover: https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208123725.png
---

# 构建性能

这里所说的构建性能，是指在**开发阶段的构建性能**，而不是生产环境的构建性能。

优化的目标，**是降低从打包开始，到代码效果呈现所经过的时间。**

## 减少模块解析

模块解析包括：抽象语法树分析、依赖分析、模块依赖函数替换。

如果没有模块解析打包过程就是这样的：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210205112008.png)

如果不解析某个模块，该模块经过loader处理后的代码就是最终代码，如果没有loader对该模块进行处理，该模块的源码就是最终打包结果的代码。

对于那些已经打包好了的第三方库，可以使用这种方式，缩短构建时间。例如：`jquery`，它的 `package.json` 中`main`字段指向的就是已经打包好的文件。

**开启方式**：配置 `module.noParse`，被正则匹配到的模块不会解析。

## 优化loader性能

### 限制loader的应用范围

对于某些库，不使用loader，因为没有必要。例如：`babel-loader`可以转换ES6或更高版本的语法，可是有些库本身就是用ES5语法书写的，不需要转换，使用`babel-loader`反而会浪费构建时间。

通过 `module.rule.exclude` 或 `module.rule.include`，排除或仅包含需要应用loader的场景

```js
module.exports = {
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /lodash/,
                use: "babel-loader"
            }
        ]
    }
}
```

这种做法是对loader的范围进行进一步的限制，和`module.noParse`不冲突。

### 缓存loader的结果

如果某个文件内容不变，经过相同的loader解析后，解析后的结果也不变。可以将loader的解析结果保存下来，让后续的解析直接使用保存的结果。

loader的运行过程中，还包含一个过程，即`pitch`，可以决定是否使用后序的loader。本质`pitch`是loader的`pitch` 方法。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210205121058.png)

使用`cache-loader`可以实现缓存的功能：

```js
module.exports = {
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ['cache-loader', ...loaders]
            },
        ],
    },
};
```

### 为loader的运行开启多线程

运行loader的过程中会有大量的运算，如果项目很大loader很多运算量很大，可以使用多线程提高效率。

使用`thread-loader`可以为后序的loader的运行开启多线程。

`thread-loader`会开启一个线程池，线程池中包含适量的线程，它会把后续的loader放到线程池的线程中运行，以提高构建效率。

由于后续的loader会放到新的线程中，所以，后续的loader不能：

- 使用 webpack api 生成文件
- 无法使用自定义的 plugin api
- 无法访问 webpack options

所以在实际的开发中，需要进行测试，来决定`thread-loader`放到什么位置比较合适。

# 传输性能

传输性能是指，打包后的JS代码传输到浏览器经过的时间。

在优化传输性能时要考虑到：

1. 总传输量：所有需要传输的JS文件的内容加起来，就是总传输量，重复代码越少，总传输量越少
2. 文件数量：访问页面时需要传输的JS文件数量，文件数量越多，http请求越多，响应速度越慢
3. 浏览器缓存：JS文件会被浏览器缓存，被缓存的文件不会再进行传输

## 手动分包

### 基本原理

1. 先单独的打包公共模块

	公共模块会被打包成为动态链接库(Dynamic Link Library)，并生成资源清单

2. 根据入口模块进行正常打包

	打包时，如果发现模块中使用了资源清单中描述的模块，则不会包含公共模块的代码

### 打包公共模块

打包公共模块是一个**独立的**打包过程，和主模块打包分开。

我们公共模块以`jquery`和`lodash`为例。

需要单独为公共模块配置一个配置文件：

```js
const webpack = require("webpack");
const path = require("path");

module.exports = {
    mode: "production",
    entry: {
        jquery: ["jquery"],
        lodash: ["lodash"]
    },
    output: {
        filename: "dll/[name].js",
        library: "[name]" // 每个bundle暴露的全局变量名
    },
    plugins: [
        // 利用DllPlugin生成资源清单
        new webpack.DllPlugin({
            path: path.resolve(__dirname, "dll", "[name].manifest.json"),
            name: "[name]"
        })
    ]
};
```

打包之后会形成这样的目录结构：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210205132403.png)

根目录的dll目录下是公共模块的资源清单：

```json
{
  "name": "jquery",
  "content": {
    "./node_modules/jquery/dist/jquery.js": {
      "id": 755,
      "buildMeta": {}
    }
  }
}
```

### 使用公共模块

在页面模板中手动引入公共模块：

```html
<script src="./dll/jquery.js"></script>
<script src="./dll/lodash.js"></script>
```

### 打包主模块

如果使用了插件`clean-webpack-plugin`，为了避免它把公共模块清除，需要配置`cleanOnceBeforeBuildPatterns`

使用`DllReferencePlugin`控制打包结果，需要用到刚才生成的资源清单：

```js
module.exports = {
    plugins:[
        new webpack.DllReferencePlugin({
            manifest: require("./dll/jquery.manifest.json")
        }),
        new webpack.DllReferencePlugin({
            manifest: require("./dll/lodash.manifest.json")
        })
    ]
}
```

例如我们有两个chunk，其中都用到了公共模块：

```js
entry: {
    main: "./src/index.js",
    other: "./src/other.js"
}
```

最后的打包结果就是这样的：

```js
{
    "./node_modules/lodash/lodash.js": ((module, __unused_webpack_exports, __webpack_require__) => {
        module.exports = (__webpack_require__("dll-reference lodash"))(486);
    }),
    "dll-reference lodash": ((module) => {
        "use strict";
        module.exports = lodash;
    })
}
```

### 总结

**手动打包的过程**：

1. 开启`output.library`暴露公共模块
2. 用`DllPlugin`创建资源清单
3. 用`DllReferencePlugin`使用资源清单

**手动打包的注意事项**：

1. 资源清单不参与运行，可以不放到打包目录中
2. 记得手动引入公共JS，以及避免被删除
3. 不要对小型的公共JS库使用

**优点**：

1. 极大提升自身模块的打包速度
2. 极大的缩小了自身文件体积
3. 有利于浏览器缓存第三方库的公共代码

**缺点**：

1. 使用非常繁琐
2. 如果第三方库中包含重复代码，则效果不太理想

## 自动分包

### 基本原理

不同与手动分包，自动分包是从**实际的角度**出发，从一个更加**宏观的角度**来控制分包，而一般不对具体哪个包要分出去进行控制

要控制自动分包，关键是要配置一个合理的**分包策略**

有了分包策略之后，不需要额外安装任何插件，webpack会自动的按照策略进行分包

![分包简单流程](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210205134035.png)

- 分包策略至关重要，它决定了如何分包
- 分包时，webpack开启了一个**新的chunk**，对分离的模块进行打包
- 打包结果中，公共的部分被提取出来形成了一个单独的文件，它是新chunk的产物

### 分包策略的基本配置

webpack提供了`optimization`配置项，用于配置一些优化信息，其中`splitChunks`是分包策略的配置：

```js
module.exports = {
    optimization: {
        splitChunks: {
            // 分包策略
        }
    }
}
```

分包策略有默认值：

- `chunks`

	该配置项用于配置需要应用分包策略的chunk

	`chunks` 有三个取值，分别是：

	- `all`: 对于所有的chunk都要应用分包策略
	- `async`：【默认】仅针对异步chunk应用分包策略
	- `initial`：仅针对普通chunk应用分包策略

	所以，只需要配置`chunks`为`all`即可让每个chunk都分包

- `automaticNameDelimiter`：新chunk名称的分隔符，默认值~

- `minChunks`：一个模块被多少个chunk使用时，才会进行分包，默认值1

- `minSize`：当包达到多少字节后才允许被真正的拆分，默认值30000

- `maxSize`

	该配置可以控制包的最大字节数

	如果某个包（包括分出来的包）超过了该值，则webpack会尽可能的将其分离成多个包

	但是分包的**基础单位是模块**，如果一个完整的模块超过了该体积，它是无法做到再切割的

## 代码压缩

目前最流行的代码压缩工具主要有两个：UglifyJs和Terser

webpack自动集成了Terser，当启用生产环境后自动用其进行代码压缩。

如果想更改、添加压缩工具，又或者是想对Terser进行配置，使用下面的webpack配置：

```js
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
module.exports = {
    optimization: {
        // 是否要启用压缩，默认情况下，生产环境会自动开启
        minimize: true, 
        minimizer: [ // 压缩时使用的插件，可以有多个
            new TerserPlugin(), 
            new OptimizeCSSAssetsPlugin()
        ],
    },
}
```

## tree shaking

### 概念

压缩可以移除模块内部的无效代码，tree shaking 可以移除模块之间的无效代码。

例如像这样的代码：

myMath.js

```js
export function add(a, b){
    console.log("add")
    return a+b;
}

export function sub(a, b){
    console.log("sub")
    return a-b;
}
```

index.js

```js
import {add} from "./myMath"
console.log(add(1,2));
```

对于myMath模块，我们只使用到了其中的`add`函数，所以在打包结果中没有必要包含其他的函数。

tree shaking的作用就是用于移除掉那些不会用到的导出。

从webpack2开始，只要是生产环境，`tree shaking`自动开启。

### 原理

webpack解析一个模块时会根据ES6的模块导入语句来判断，该模块依赖了另一个模块的哪个导出。

在具体分析依赖时，webpack坚持的原则是：**保证代码正常运行，然后再尽量tree shaking。**

依赖分析完毕后，`webpack`会根据每个模块每个导出是否被使用，标记其他导出为`dead code`，然后交给代码压缩工具处理。

代码压缩工具最终移除掉那些`dead code`代码。

webpack之所以选择ES6的模块导入语句，是因为ES6模块的特点有利于分析出稳定的依赖：

1. 导入导出语句只能是顶层语句
2. import的模块名只能是字符串常量
3. import绑定的变量是不可变的

在编写代码的时候尽量：

- 使用`export xxx`导出，而不使用`export default {xxx}`导出
- 使用`import {xxx} from "xxx"`导入，而不使用`import xxx from "xxx"`导入

所以对于使用commonjs模块方式的导出，`tree shaking`是无法发挥作用的。

### 作用域分析

`tree shaking`本身并没有完善的作用域分析，可能导致在一些`dead code`函数中的依赖仍然会被视为依赖。

插件`webpack-deep-scope-plugin`提供了作用域分析，可以解决这些问题。

### 副作用问题

webpack在`tree shaking`的使用，有一个原则：**一定要保证代码正确运行。**

在满足该原则的基础上，再来决定如何`tree shaking`。

因此，当`webpack`无法确定某个模块是否有副作用时，它往往将其视为有副作用。

如果要解决该问题，就需要标记哪些文件是没有副作用的。

在`package.json`中加入`sideEffects`：

有两种配置方式：

- `false`：当前工程中，所有模块都没有副作用。
- 数组：设置哪些文件拥有副作用，例如：`["!src/common.js"]`，表示只要不是`src/common.js`的文件，都有副作用

```json
{
    "sideEffects": false
}
```

这个通常是一些第三方库在它们自己的`package.json`中标注。

### css

webpack无法对css完成tree shaking，因此对css的tree shaking需要其他插件完成。

例如：`purgecss-webpack-plugin`

但是，`purgecss-webpack-plugin`对`css module`无能为力。

## gzip

gzip是一种压缩文件的算法，在B/S结构中的压缩传输过程：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210205125623.png)

优点：传输效率可能得到大幅提升

缺点：服务器的压缩需要时间，客户端的解压需要时间

我们可以使用webpack进行预压缩，使用`compression-webpack-plugin`插件对打包结果进行压缩，可以移除服务器的压缩时间：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210205125727.png)