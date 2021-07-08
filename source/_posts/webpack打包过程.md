---
title: 浅析webpack打包过程
date: 2021-01-28 12:18:23
tags: webpack
categories: [前端, webpack]
keywords: webpack, webpack原理
description: webpack编译过程, webpack打包过程
cover: https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208124813.png
---

# 初始化

当我们运行 `webpack` 命令进行打包的时候，webpack第一步做的事就是将我们命令行传递的参数、`webpack.config.js` 配置文件的导出、默认配置进行合并，形成最终的配置然后开始打包我们的模块。

这一步做的事比较简单，对配置的处理过程是依托一个第三方库`yargs`完成的。

# 编译

这一步是最重要的一步，用于将我们的源代码转换成目标代码。

## chunk

chunk是打包过程中的一个产物，它表示通过某个入口模块找到的所有依赖的统称。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210128133747.png)

webpack 会根据入口模块创建一个chunk，一个项目中可以配置多个chunk。

每个chunk都有至少两个属性：

- name：默认为main
- id：唯一编号，开发环境和name相同，生产环境是一个数字，从0开始

配置中 `entry` 配置的就是chunk名和入口模块：

```json
entry: {
    main: "./src/index.js", //属性名：chunk的名称， 属性值：入口模块（启动模块）
    a: ["./src/a.js", "./src/index.js"] //启动模块有两个
}
```

## 构建所有依赖模块

webpack会从启动模块开始，读取文件内容通过AST分析来得到该模块的依赖，然后保存到dependencies中，将读取到内存的文件内容中的依赖函数替换为 `__webpack_require__` 这样的函数，然后将替换后的代码对应着模块id（模块路径）保存到一个数据结构中，接着递归的对该模块的依赖（dependencies）执行相同的操作。

以默认的chunk为例，类似就是这样一张流程图：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210128130706.png)

## 产生chunk assets

依赖模块构建完成之后，chunk中会产生一个模块列表，其中包含了**模块id**和**模块转换后的代码**。

webpack会根据配置为chunk生成一个资源列表（chunk assets），资源列表可以理解为是生成到最终文件的文件名和文件内容。资源列表也叫做bundle。

在这过程中会生成一个叫做chunkhash的字符串，chunkhash是根据chunk assets的内容生成的一个hash字符串。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210128131652.png)

## 合并chunk assets

如果有多个chunk，则会将多个chunk的assets合并到一起，并产生一个总的资源列表，在这过程中会产生hash，这是总的hash，是根据总的assets内容产生。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210128132719.png)

## hash

chunkhash和hash是通过hash算法根据相对应的文件内容生成，对于一个chunk来说，只要其中的文件内容没有发生变化，相对于的chunkhash也不会变化，适合作为最终的文件名。既可以方便缓存，当文件发生改变浏览器也能立即获取新文件。

# 输出

webpack利用node中的fs模块，根据编译产生的总的assets，生成相应的文件到相应的目录。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210128132935.png)

# loader

webpack仅仅分析出各种模块的依赖关系，然后形成资源列表，最终打包生成到指定的文件中。因为要生成抽象语法树，所以只能打包js，但是webpack的官网的图表示任何资源都是一个模块，webpack单独是做不到的，这就需要loader来处理。

前面编译构建依赖的图其实少了loader处理的一步，更加细节一点的是这样的：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210129114616.png)

loader 的本质是一个函数，它的作用是将某个源码字符串转换成另一个源码字符串返回，这样只要返回的是符合js语法的内容就可以正常打包，而且loader是运行在node环境并且可以获取到webpack上下文中的内容所以可以做很多事，例如：处理图片，处理css等。

```js
function loader(sourceCode: string): string
```

loader的执行顺序是和规则的匹配顺序不同，一个规则可以配置多个loader，匹配loader的时候顺序匹配，执行loader的时候逆着执行，前一个loader的返回值是下一个loader的参数。

```js
module.exports = {
    mode: "development",
    module: {
        rules: [
            {
                test: /index\.js$/, 
                use: ["./loaders/loader1", "./loaders/loader2"] 
            }, //规则1
            {
                test: /\.js$/,
                use: ["./loaders/loader3", "./loaders/loader4"] 
            } 
        ]
    }
}
```

对于index.js，loader的执行顺序会是这样的：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210129120720.png)

# plugin

webpack中除了loader还有一个比较重要的东西：plugin。

loader的功能定位是转换代码，而一些其他的操作难以使用loader完成，例如：

- 当webpack生成文件时，顺便多生成一个说明描述文件
- 当webpack编译启动时，控制台输出一句话表示webpack启动了

像这种在webpack打包的整个过程中，在某个阶段做一些事情的需求，loader就无能为力了，这就需要plugin来处理。

## compiler

webpack在初始化阶段会创建一个 `compiler` 对象，`compiler` 对象会创建一个 `compilation` 对象，`compilation` 对象才是用来处理打包的。

有一个细节的点，在整个webpack进程运行过程中，只会有一个 `compiler` 对象，而`compilation` 对象可能会有多个，这句话的意思是在webpack运行过程中只会创建一次 `compiler` 而 `compilation` 则可能会被创建多次，取决于打包次数。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210129123234.png)

`compiler`对象提供了大量的钩子函数（hooks，类似于事件），plugin可以注册这些钩子函数，参与webpack的整个过程。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210129123354.png)

plugin的**本质**是一个带有`apply`方法（参数为 `compiler`）的对象，但是一般会将该对象写成构造函数的模式，这样便于在启用plugin时传递参数：

```js
class MyPlugin{
    apply(compiler){
		
    }
}
```

apply方法会在**创建好compiler对象后调用**，并向方法传入`compiler`对象，因为`compiler`只会被创建一次，事件也只会被注册一次。处理函数的事件参数即为 `compilation` 对象。

## 事件

这一部分使用的是 Tapable API，这个小型的库是一个专门用于钩子函数监听的库。

它提供了一些事件类型：

- tap：注册一个同步的钩子函数，函数运行完毕则表示事件处理结束
- tapAsync：注册一个基于回调的异步的钩子函数，函数通过调用一个回调表示事件处理结束
- tapPromise：注册一个基于Promise的异步的钩子函数，函数通过返回的Promise进入已决状态表示事件处理结束

就像这样注册事件：

```js
class MyPlugin {
    apply(compiler) {
        //在这里注册事件，第一个参数为plugin名字
        compiler.hooks.done.tap("MyPlugin-done",compilation => {
            //事件处理函数
            console.log("编译完成");
        })
    }
}
```