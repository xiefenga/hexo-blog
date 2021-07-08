---
title: 弄明白BFC
date: 2021-01-25 18:39:10
tags: CSS
categories: [前端, CSS]
keywords: BFC,块级格式化上下文
description: 块级格式化上下文
cover: https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208221046.jpg
---

# BFC是什么

刚开始学 CSS 只知道BFC叫做块级格式化上下文，触发BFC可以解决布局的一些问题，但是具体BFC是个什么不清楚。

先说总结，BFC是一块独立的渲染区域，而且在这块区域中的规定了常规流块盒的布局：

- 常规流块盒在水平方向必须撑满包含块
- 常规流块盒在包含块的垂直方向上依次摆放
- 常规流块盒若外边距无缝相邻，则进行外边距合并
- 常规流块盒的自动高度和摆放位置，无视浮动元素

这也对应了MDN中的描述：

> **块格式化上下文（Block Formatting Context，BFC）** 是Web页面的可视CSS渲染的一部分，是块盒子的布局过程发生的区域，也是浮动元素与其他元素交互的区域。

CSS 2.1 中对常规流的描述：

> 常规流中的任何一个盒子总是某个*格式区域*（*formatting context*）中的一部分。块级盒子是在*块格式区域*（*block formatting context*）中工作的盒子，而内联盒子是在*内联格式区域*（*inline formatting context*）中工作的盒子。任何一个盒子总是块级盒子或内联盒子中的一种。

也就是说BFC就是一个区域，所有的常规流块盒都是在BFC中布局的，换句话说BFC定义常规流了块盒的布局规则。

定义中的最后一句 “也是浮动元素与其他元素交互的区域“ 这一句，倒是不是很能理解，可能是因为由于浮动元素没有完全脱离文档流会对常规流布局产生影响常规流布局需要考虑到浮动元素吧。

按道理也有IFC（内联格式化上下文）的存在，其实还存在FFC（弹性格式化上下文）、GFC（栅格格式化上下文）。

# 创建BFC

常见创建BFC的方式有：

1. 根元素（`<html>`）
2. 浮动元素（元素的 `float` 不是 `none`）
3. `position` 为 `absolute` 或 `fixed`
4. `display` 为 `inline-block`
5. `overflow` 不为 `visible` 的块元素
6. 弹性元素（`display` 为 `flex` 或 `inline-flex `元素的直接子元素）
7. ……

根元素可以创建BFC，那也很合理的印证了我们的总结，BFC规定了常规流块盒的布局，这也就是为什么我们在body中布局的时候会有那些规则，因为这些元素都处在html创建的BFC中。

# BFC解决的问题

对于创建BFC的元素，它会产生一些布局上的变化：

- 创建BFC的元素，它的自动高度需要计算**浮动**元素
- 创建BFC的元素，它的**边框盒**不会与浮动元素重叠
- 创建BFC的元素，不会和它的子元素进行外边距合并

# 布局

利用 BFC 可以方便地做出一些布局尤其是在不使用 CSS3 的情况下。

## 两栏布局

主区域是自适应的，和侧边栏的间隙可以通过设置侧边栏的margin来控制，非常方便。

html：

```html
<div id="app" class="clearfix">
    <div class="menu">
        侧边栏
    </div>
    <div class="main">
        主区域
    </div>
</div>
```

css：

```css
.clearfix::after {
    content: "";
    display: block;
    clear: both;
}

.menu {
    float: left;
    width: 200px;
    border: 1px solid;
    margin-right: 10px;
}

.main {
    /* 触发 BFC */
    overflow: hidden;
    border: 1px solid;
}
```

## 三栏布局

与两栏布局类似，让主区域创建BFC，这种做法仅适用于对主区域代码位置无要求的情况。

html：

```html
<div id="app" class="clearfix">
    <div class="menu-left">
        侧边栏-左
    </div>
    <div class="menu-right">
        侧边栏-右
    </div>
    <div class="main">
        主区域
    </div>
</div>
```

css：

```css
.menu-left,
.menu-right {
    width: 200px;
    border: 1px solid;
}

.menu-left {
    float: left;
    margin-right: 10px;
}

.menu-right {
    float: right;
    margin-left: 10px;
}

.main {
    /* 触发 BFC */
    overflow: hidden;
    border: 1px solid;
}
```

参考链接：

- [MDN 块格式化上下文](https://developer.mozilla.org/zh-CN/docs/Web/Guide/CSS/Block_formatting_context)
- [MDN 常规流中的块和内联布局](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Flow_Layout/Block_and_Inline_Layout_in_Normal_Flow)
