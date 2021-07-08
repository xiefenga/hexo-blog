---
title: Vue中的样式穿透
date: 2020-09-12 15:15:00
tags: Vue
categories: [前端, Vue]
keywords: 样式穿透,vue
description: vue中样式穿透的使用
cover: http://oss.xiefeng.tech/img/20210315191634.png
---

# 前言

前段时间，写一个轮播图组件的时候遇到了一个样式不生效的问题，通过样式穿透解决了，记录一下。

对于vue文件中的 `<style>` 标签，加上 `scoped` 属性，它的css样式只能用于当前的组件，它的原理的是通过使用 PostCSS 来实现转换

# scoped 转换规则

- 组件的根元素、组件自身的后代元素、子组件的根元素都会加上该组件特定的 `data-v-x` 属性。
- css样式中，最后一个选择器会被添加上 `data-v-xxx` 属性选择器

```vue
/* Father.vue */
<template>
	<div class="father-wrapper">
        <div class="inner">
            father-inner
        </div>
        <child-cmp></child-cmp>
    </div>
</template>
<style scoped>
    .father-wrapper {
        border: 1px solid;
    }
    .father-wrapper .inner {
        font-size: 20px;
    }
    .father-wrapper .child-wrapper .inner-1 {
        font-size: 20px;
    }
</style>
```

```vue
/* Child.vue */
<template>
  <div class="child-wrapper">
    <div class="inner-1">
      child-inner-1
    </div>
    <div class="inner-2">
      child-inner-2
    </div>
  </div>
</template>
```

转换后的代码：

![转换后的HMTL](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20200912145609801.png)

![转换后的CSS](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20200912145537844.png)

# 样式穿透规则

如果你希望 `scoped` 样式中的一个选择器能够作用得“更深”，例如影响子组件，可以使用 `>>>` 操作符( `/deep/` 或 `::v-deep` 操作符)

```vue
<style scoped>
.a >>> .b { /* ... */ }
</style>
```

```css
.a[data-v-f3f3eg9] .b { /* ... */ }
```

可以看到使用了 `>>>` 操作符，属性选择器不会被加到 `>>>` 后的选择器上，这就方便我们操作样式

```vue
<style scoped>
    .father-wrapper .child-wrapper >>> .inner-1 {
        color: lightblue;
    }
</style>
```

![使用>>>之后转换后的css](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20200912145739827.png)

**用途：** 当我们使用一些第三方的组件库的时候，对于某些样式不满意并且套的层次比较深的时候，我们可以使用样式穿透来改变样式。

**参考资料：**

- [vue-loader](https://vue-loader.vuejs.org/zh/guide/scoped-css.html)