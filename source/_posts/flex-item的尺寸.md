---
title: flex布局item的尺寸
date: 2021-03-17 22:07:06
tags: CSS
categories: [前端, CSS]
cover: http://oss.xiefeng.tech/img/20210317221040.jpg
---

# flex-basis

`flex-basis` 用于设置项目（flex-item）的基础宽度，和 `width` 一样，`flex-basis` 设置的是 `content-box`。	

**项目最终宽度的优先级：** 最大最小尺寸限制 > 弹性增长或收缩 > 基础尺寸

# flex-shrink

设置项目的收缩比例，默认值为：1

**特殊点：收缩比例的计算方式**

1. 计算加权值（`content-width` * 比例 + `content-width` * 比例 + …… = W）
2. 收缩像素（ `content-width` / W * 溢出像素）

3. 计算方式和盒模型没有关系，只和**内容盒**的宽度有关
4. 当该项目设置 `flex-basis` 并且内容溢出**撑开**盒子，该项目不参与收缩

# 基础尺寸

基础尺寸由 `flex-basis`、`width`、`content-size` 共同决定，`content-size` 包括文本内容和元素。

## auto

当 `flex-basis` 为 `auto` 时：

`width` 的优先级 > `content-size` 的优先级，也就是说当设置了 `width` 时，内容无法撑开项目的宽度。

**HTML**

```html
<div class="wrapper">
    <div class="box box1">
        .....................................
    </div>
</div>
<div class="wrapper">
    <div class="box box2">
        .....................................
    </div>
</div>
```

**CSS**

```css
body {
    display: flex;
    justify-content: space-around;
}

.wrapper {
    display: flex;
    background-color: lightblue;
    width: 500px;
    height: 200px;
}

.wrapper .box {
    height: 100px;
    background-color: #008c8c;
}

.box2 {
    width: 100px;
}
```

![](http://oss.xiefeng.tech/img/20210317214015.png)

## 不为auto

1. 设置了 `width`：
	1. `width > flex-basis`，则 `flex-basis <= realWidth <= width`
	2. `flex-basis >= width`，则项目的宽度为 `flex-basis`，**内容**不可以撑开该项目
2. 没设置 `width`：内容可以撑开该项目

当设置了 `width` 且 `width > flex-basis` 时，优先级 `content-size > flex-basis` && `width > content-size`

**HTML**

```html
<div class="wrapper">
    <div class="box">
        .....................................
    </div>
</div>
```

**CSS**

```css
.wrapper {
    display: flex;
    background-color: lightblue;
    width: 500px;
    height: 200px;
}
.wrapper .box {
    height: 100px;
    background-color: #008c8c;
    width: 100px;
    flex-basis: 50px;
}
```

**JavaScript**

```javascript
const box = document.querySelector('.box');
let time = 0;

function test() {
    box.innerText = box.innerText + '.';
    time++;
    if (time < 50) {
        requestAnimationFrame(test);
    }
}
```

![](http://oss.xiefeng.tech/img/20210317220217.gif)









