---
title: JavaScript中的继承
date: 2021-03-03 13:55:19
tags: JavaScript
categories: [编程语言, JavaScript]
cover: http://oss.xiefeng.tech/img/20210303140513.jpg
keywords: JavaScript, class, 继承
description: JavaScript中的继承
---

# 原型

JavaScript 是基于对象的，函数也是一个对象。JavaScript 中的每一个函数/类都有一个 `prototype` 属性，它定义了构造函数制造出的对象的公共祖先。在它上面定义的属性和方法可以被对象实例共享。

默认情况下，所有原型对象自动获得一个名为 `constructor` 的属性，指回与之关联的构造函数。

```javascript
function Test { }
console.log(Test.prototype.constructor === Test); // true
```

每个对象都有一个内部属性 `[[Prototype]]`，也被称为隐式原型。 该属性指向构造函数的原型。js 中没有访问 `[[Prototype]]` 的标准方式，但 Firefox、Safari 和 Chrome 会在每个对象上暴露 `__proto__` 属性。

默认通过对象字面量创建的对象隐式原型指向 `Object.prototype`，相当于通过 `new Object()` 创建。

> 在 Chrome 控制台，一个对象的隐式原型的 `constructor` 为什么函数/类，这个对象就会显示为什么类型。

## 原型链

> 在通过对象访问属性时，会按照这个属性的名称开始搜索。搜索开始于对象实例本身。如果在这个 实例上发现了给定的名称，则返回该名称对应的值。如果没有找到这个属性，则搜索会沿着指针进入原型对象，然后在原型对象上找到属性后，再返回对应的值。

对象通过 `[[Prototype]]` 属性形成原型链，从而实现继承。

- 对于JavaScript中的**大部分**对象，最终都会继承自`Object.prototype`
- `Object.prototype.__proto__ === null`，且 **不可以更改**
- 所有的函数/类都继承自 `Function.prototype`，所以所有的函数都是 `Function` 类型

**JavaScript 默认的继承关系：**

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/原型链.png)

# ES5实现继承

## 盗用构造函数

在子类构造函数中调用父类构造函数，使用 `apply` 和 `call` 方法以新创建的对象为上下文执行构造函数。

```javascript
function SuperType() {
    this.colors = 'red';
}
function SubType() {
    SuperType.call(this); // 继承 SuperType
}
```

**优点：** 盗用构造函数的一个优点就是可以在子类构造函数中向父类构造函数传参

**缺点：** 由于没有使用原型链，所以必须在构造函数中定义方法才能继承方法，而且子类无法共享，无法实现函数复用

## 组合继承

组合继承将原型链和盗用构造函数相结合，通过盗用构造函数来实现属性的继承，通过原型链实现方法的继承。

```javascript
function SuperType(name){
    this.name = name;
    this.colors = ["red", "blue", "green"];
}
SuperType.prototype.sayName = function(){
    console.log(this.name); 
}

function SubType(name, age){
    SuperType.call(this, name); // 继承属性
    this.age = age;
}

SubType.prototype = new SuperType(); // 继承方法
```

**优点：** 弥补了盗用构造函数的不足，而且也保留了 `instanceof` 操作符和 `isPrototypeOf()`方法识别合成对象的能力

**缺点：** 存在效率问题，最主要的效率问题就是父类构造函数始终会被调用两次

## 原型式继承

> 2006 年，Douglas Crockford 写了一篇文章：《JavaScript 中的原型式继承》（“Prototypal Inheritance in JavaScript”）。这篇文章介绍了一种不涉及严格意义上构造函数的继承方法。他的出发点是即使不自定义 类型也可以通过原型实现对象之间的信息共享。文章最终给出了一个函数：

```javascript
function object(o) {
    function F() {}
    F.prototype = o;
    return new F();
} 
```

原型式继承适用的情况：你有一个对象，想在它的基础上再创建一个新对象。 你需要把这个对象先传给 `object()`，然后再对返回的对象进行适当修改。

ES5 新增的 `Object.create()` 实现了该意图，该方法接收两个参数：作为新对象隐式原型的对象，新对象的额外属性

## 寄生式继承

寄生式继承和原型式继承类似，即创建一个仅用于封装继承过程的函数，该函数在内部以某种方式来增强对象，最后再像真地是它做了所有工作一样返回对象。

```javascript
function createAnother(original){
    var clone = object(original); //通过调用函数创建一个新对象
    clone.sayHi = function(){ //以某种方式来增强这个对象
        console.log("hi");
    };
    return clone; //返回对象
} 
```

`object()` 函数不是寄生式 继承所必需的，任何返回新对象的函数都可以在这里使用。

## 寄生组合式继承

寄生组合式继承，**即通过借用构造函数来继承属性，通过原型链的混成形式来继承方法**。

其背后的基本思路是：不必为了指定子类型的原型而调用父类型的构造函数，我们所需要的无非就是父类型原型的一个副本而已。

```javascript
function inherit(subType, superType){
    var prototype = object(superType.prototype); //创建对象
    prototype.constructor = subType; //增强对象
    subType.prototype = prototype; //指定对象
}
```

寄生组合式继承的高效率体现在它只调用了一次 `SuperType` 构造函数，并且因此避免了 `SubType.prototype` 上面创建不必要、多余的属性。保持了组合式的优点，去除了组合式继承的效率问题的缺点。

使用起来也比较方便：

```javascript
function SuperType(name){
    this.name = name;
    this.colors = ["red", "blue", "green"];
}
SuperType.prototype.sayName = function(){
    alert(this.name);
}
function SubType(name, age){
    SuperType.call(this, name); // 通过借用构造函数实现属性继承
    this.age = age;
}
inherit(SubType, SuperType); // 通过原型链实现方法继承
```

寄生组合式继承也被称为圣杯模式，一个很喜欢的实现：

```javascript
var inherit = (function () {
    var F = function () { };
    return function (SubType, SupeType) {
        F.prototype = SupeType.prototype;
        SubType.prototype = new F();
        SubType.prototype.constructor = SubType;
        SubType.prototype.uber = SupeType.prototype; //方便查找最终继承的原型
    };
}());
```

组合寄生式继承是在 ES3 和 ES5 能够做到的最好的继承方式，但是依旧不能够完美的实现继承。

# ES6实现继承

ES5 中添加了 `Object.getPrototyeOf` 用来得到一个对象的隐式原型，但没有办法一个标准方法来改变一个对象实例化后的隐式原型，这也是我们没有办法实现比较完美的继承的方式。

ES6 添加了 `Object.setPrototypeOf` 用来改变一个对象的隐式原型，利用该函数可以直接修改原型实现继承。

## 字面量继承

在 ES5 是没有办法将两个已经存在的对象字面量变成继承关系的，而通过 ES6 提供的 `setPrototypeOf` 可以很容易的实现。

```javascript
const person = {
    greet() {
        console.log('hi');
    }
}

const man = {
    name: 'man'
}

Object.setPrototypeOf(man, person);
console.log(man);
```

![](http://oss.xiefeng.tech/img/20210306215146.png)

## Super

ES6引用了 `super` 关键字，使用它可以更便捷的访问对象原型，当重写了继承的方法，但是需要用到原本的方法，就可以使用 `super`。

```javascript
const person = {
    getGreeting() {
        return 'hi!';
    }
}

const friend = {
    getGreeting() {
        return super.getGreeting() + 'my friend2';
    }
}

Object.setPrototypeOf(friend, person);

friend.getGreeting()  // hi!my friend
```

ES5 也是可以实现的，plain-object 使用 `Object.getPrototypeOf`，构造函数使用 `inherit` 中添加的 `uber` 来实现，但是调用时都需要 `call(this)`

```javascript
// ES5 实现调用父类被重写的方法
const friend = {
    getGreeting() {
        return Object.getPrototypeOf(this).getGreeting.call(this) + 'my friend1';
    }
}

// 继承
Object.setPrototypeOf(friend, person);

friend.getGreeting()  // hi!my friend
```

简单来说，`super.xxx()` 相当于 `Object.getPrototypeOf(this).getGreeting.call(this)`

### bug

ES5 方式存在的问题：当继承的层级超过三层，且调用这种重写的方法时就会陷入无限递归。

无论是使用 `getPrototypeOf` 还是类继承中的 `uber`。

```javascript
const friend = {
    getGreeting() {
        return Object.getPrototypeOf(this).getGreeting.call(this) + 'my friend';
    }
}

Object.setPrototypeOf(friend, person);

const obj = Object.create(friend);

obj.getGreeting(); // Uncaught RangeError: Maximum call stack size exceeded
```

而 `super` 关键字不存在该问题：

```javascript
const friend = {
    getGreeting() {
        return super.getGreeting() + 'my friend';
    }
}

Object.setPrototypeOf(friend, person);

const obj = Object.create(friend);

console.log(obj.getGreeting());  // hi!my friend
```

### Super细节

`super` 引用不会动态变化的，它总是指向正确的对象。

在ES6 之前从未正式定义“方法”的概念，方法仅仅是一个具有功能而非数据的对象属性。

在ES6 中正式将方法定义为一个函数，它有一个内部的 `[[HomeObject]]` 属性，该属性指向这个方法从属的对象。

`super` 的所有引用都是通过 `[[HomeObject]]` 属性来确定后序的运行过程：

1. 在 `[[HomeObject]]` 属性上调用 `Object.getPrototypeOf` 找到原型
2. 搜寻原型同名函数，并绑定 `this` 调用

## 类继承

ES6 出来了 `class` 语法，实现继承只需要通过关键字 `extends` 就可以实现寄生组合式继承，严格来说比寄生组合式继承更加完善。

```javascript
class SuperType {

    static sayHi() {
        console.log('hi');
    }

    constructor(name) {
        this.name = name;
        this.colors = ["red", "blue", "green"];
    }

    sayName() {
        console.log(this.name);
    }
}

class SubType extends SuperType {

    constructor(name, age) {
        super(name);
        this.age = age;
    }

    sayAge() {
        console.log(this.age);
    }
}

const sub = new SubType('sub', 18);

sub.sayAge();  // 18

sub.sayName(); // sub

SubType.sayHi(); // hi
```

类继承之后的原型链：

![](http://oss.xiefeng.tech/img/20210303194447.svg)



**参考书籍：**

1. 《JavaScript 高级程序设计》
2. 《深入理解 ES6》