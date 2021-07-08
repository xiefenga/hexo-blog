---
title: Vue3中v-model的变化
date: 2020-11-14 21:14:01
tags: Vue
categories: [前端, Vue]
keywords: vue3,v-model
description: vue2和vue3中v-model的区别V
cover: http://oss.xiefeng.tech/img/20210315190443.png
---

# Vue2中的v-model

Vue 给我们提供了 `v-model` 指令来实现双向数据绑定，所谓双向数据绑定就是：**数据更新元素更新、元素更新数据也会更新。**

先回顾一下 Vue2 中的用法：

```vue
<template>
  <div id="app">
    <input type="text" v-model="value">
    <p>{{value}}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      value: ''
    }
  }
}
</script>
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/v-model1.gif)

`v-model` 实际上是一个语法糖，本质上，上面的写法相当于：

```vue
<input type="text" :value="value" @input="value=$event.target.value">
```

## 表单的使用

除了 `input` 元素，其他的表单元素 `v-model` 也可以实现双向数据绑定，只是数据类型有些不同而已。

### 单选框

对于单选框 `input:radio`，和 `input:text` 一样的用法，也是传递一个 `string` 类型的 `value` 值，只不过监听的事件是 `change`，修改的 HTML属性是 `checked`

```vue
<div id="app">
    <label>
        apple <input type="radio" value="apple" v-model="picked">
    </label>
    <label>
        orange <input type="radio" value="orange" v-model="picked">
    </label>
    <label>
        banana <input type="radio" value="banana" v-model="picked">
    </label>
</div>
```

### 复选框

复选框和单选框一样，内部都是监听的 `change` 事件。但是多选框就有两种情况了：

我们可以使用单个复选框，表示选 / 不选，也可以使用多个复选框，表示选择哪些。

**单个复选框**

我们将 `v-model` 绑定到一个 `boolean` 值，即可完成双向数据绑定。

**多个复选框**

将这些复选框的 `v-model` 绑定到同一个数组即可。数据中的值即是选中的 `value`。

```vue
<div id="app">
    <input type="checkbox" id="1" value="xxx" v-model="checked">
    <label for="1">xxx</label>

    <input type="checkbox" id="2" value="yyy" v-model="checked">
    <label for="2">yyy</label>

    <input type="checkbox" id="3" value="zzz" v-model="checked">
    <label for="3">zzz</label>
    <br>
    <span>被选中的有: {{ checked }}</span>
</div>
```

其他的还有 `select` 和 `textarea`，具体的参考官方文档：[表单输入绑定](https://cn.vuejs.org/v2/guide/forms.html)

## 组件的使用

不光表单元素可以使用，组件也可以实现双向数据绑定。

例如，有一个 `my-input` 的组件：

```vue
<template>
  <div class="my-input">
    :value="value" @input="$emit('input', $event.target.value)"
    <p>value: {{ value }}</p>
  </div>
</template>

<script>
export default {
    props: ['value']
};
</script>

```

接着在 `App.vue` 中使用：

```vue
<template>
  <div id="app">
    <my-input v-model="value" />
  </div>
</template>

<script>
import MyInput from './components/MyInput'
export default {
  components: {
    MyInput
  },
  data() {
    return {
      value: "",
    };
  },
};
</script>
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/v-model2.gif)

这样的 `v-model` 依旧是语法糖，本质上做的事依旧是绑定了 `value` 属性，监听了 `input` 事件：

```vue
<my-input :value="value" @input="value = $event" />
```

如果我们想实现其他形式的 `v-model`，则需要在组件的内部配置一个选项：

`prop` 表示外部在对该组件使用 `v-model` 时绑定的属性值，`event` 表示监听的事件（可以是自定义事件）

```vue
model: {
    prop: 'checked',
    event: 'change'
},
```

## .sync 修饰符

然而对于组件使用 `v-model` 实现数据的双向绑定有一个缺点，那就是**只能绑定一个数据，无法实现多个双向数据绑定。**

Vue2 提供了另外一种方式实现数据的双向绑定，`v-bind` 的 `sync` 修饰符。

例如刚才的 `my-input` 组件的双向数据绑定我们只需要修改一点点代码：

```vue
// App.vue
<my-input :value.sync="value" />

// MyInput.vue
<input type="text" :value="value" @input="$emit('update:value', $event.target.value)" />
```

本质上 `.sync` 做的事就是监听 `update:绑定的属性` 自定义事件，前面的 `App.vue` 就相当于：

```vue
<my-input :value="value" @update:value="value = $event" />
```

**两者的比较：**

1. 两者都是用于实现双向数据传递的，实现方式都是语法糖，最终通过 ``prop`` + ``事件`` 来达成目的。
2. `v-model` 只能实现一个双向数据帮绑定；`.sync` 凡是需要双向数据传递时，都可以去使用。

# Vue3中的变化

> Vue2 比较让人诟病的一点就是提供了两种双向绑定：`v-model` 和 `.sync`，在 Vue3 中，去掉了 `.sync` 修饰符，只需要使用 `v-model` 进行双向绑定即可。

为了让 `v-model` 更好的针对多个属性进行双向绑定，Vue3 作出了以下修改：

1. 当对自定义组件使用 `v-model` 指令时，绑定的默认属性名由原来的 `value` 变为 `modelValue`，事件名由原来的 `input ` 变为 `update:modelValue`
2. 去掉了 `.sync` 修饰符，它原本的功能由 `v-model` 的参数替代
3. `model` 配置被移除
4. 允许自定义 `v-model` 修饰符

需要注意的是，对于一般的表单元素使用 `v-model` 并无变化，变化的就只是对组件的双向数据绑定，简单来说就是将 `v-model` 和 `.sync` 结合了一下。

将前面的例子改变成 Vue3 的版本：

```vue
// App.vue
<my-input v-model="value" />
// 相当于
// <my-input v-model:modelValue="value" @update:modelValue="value = $event" />

// MyInput.vue
<input type="text" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
```

如果需要绑定多个数据或是不想用 `modelValue` 这个属性名，可以使用 `v-model` 的参数：

```vue
<my-input v-model:inpVal="value" />

<input type="text" :value="inpVal" @input="$emit('update:inpVal', $event.target.value)" />
```

因为第二点的存在自然就有了第三点，不再需要 `model` 配置了。

第四点就是 Vue3 升级的地方，可以使用自定义的属性修饰符：

如果我们使用了 `v-model` 的属性修饰符，则 Vue 会向组件内部除了传递 `modelValue` 属性之外，还会传递一个 `modelModifiers` 属性，该属性是一个对象，里面包含了该 `v-model` 所使用的全部属性修饰符。

如果 `v-model` 使用了参数，也就是不使用默认的 `modelValue` 则传递的另一个关于属性修饰符的属性名为 `参数+Modifiers` 

在组件内部我们就可以根据传递进来的 `xxxModifiers` 属性来决定怎么处理。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20201008163022.png)

将之前的例子修改一下：

**App.vue** 

```vue
<div id="app">
    <my-input v-model:inpVal.trim="value" />
</div>
```

**MyInput.vue**

```vue
<template>
  <div class="my-input">
    <input type="text" :value="inpVal" @input="handelInput" />
    <p>value: {{ inpVal }}</p>
  </div>
</template>

<script>
import { onMounted } from "vue";
export default {
  props: ["inpVal", "inpValModifiers"],
  setup(props, ctx) {
    const printModifiers = () => {
      console.log(props.inpValModifiers);
    };
    const handelInput = (e) => {
      ctx.emit("update:inpVal", e.target.value);
    };
    onMounted(printModifiers);
    return {
      printModifiers,
      handelInput
    };
  },
};
</script>
```

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/v-model3.gif)

使用 `.trim` 自定义修饰符，我们想去除首尾空白：

```js
const handelInput = (e) => {
    let val = e.target.value;
    if (props.inpValModifiers?.trim) {
        val = val.trim();
    }
    ctx.emit("update:inpVal", val);
};
```

