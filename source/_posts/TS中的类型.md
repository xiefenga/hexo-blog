---
title: TS中的类型总结
date: 2020-11-06 18:15:51
tags: Typescript
categories: [编程语言, typescript]
keywords: TS,TS中的类型
description: TS中的类型相关内容
---

# 类型约束

TS 是一个**可选的**、**静态的**类型系统

类型约束语法：`变量: 类型`

```typescript
let num: number = 1;
```

TS 在很多时候可以完成类型推导：

```typescript
let num = 1;
```

![类型推导](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/image-20201106182135820.png)

# 基本类型

- number
- string
- boolean
- symbol
- bigint
- object
- null
- undefined

`null` 和 `undefined` 是所有类型的子类型，它们可以赋值给其他类型

通过在 `tsconfig.json` 文件设置 `strictNullChecks:true` ，可以获得更严格的空类型检查，`null` 和 `undefined` 只能赋值给自身。

## 数组

不建议约束为 `[]`，建议加上数组类型

例如：

```typescript
let arr: string[] = [];
```

这样数组的每一项都只能是字符串

或者使用构造函数和泛型的写法：

```typescript
let arr: Array<string> = [];
```

## 元组 Tuple

 该类型为一个固定长度的数组，并且数组中每一项的类型确定

例如：

```typescript
let x: [string, number];

x = ['q', 1]; // x 只能赋值为长度为2并且第一项为 string 第二项为 number 的数组
```

## 字面量类型

```typescript
let sex: 'male';
```

`sex` 的值只能为 `'male'`，`'male'` 就是一个字面类型（该类型的值就是自己本身）

## 联合类型

```typescript
let sex: 'male' | 'female';

let phone: string | null | undefined;
```

`sex` 的值只能是 `'male'` 或者 `'female'` 类型；`phone` 的类型可以为 `string`，`null` 或者 `undefined`

## void

表示没有类型，用于函数没有返回值

```typescript
function printHelloWorld(): void{
    console.log('Hello world');
}
```

## never

`never` 类型表示的是那些永不存在的值的类型，通常用于那些永远不会结束的函数的返回值（例如抛异常）

`never` 类型是任何类型的子类型，也可以赋值给任何类型；然而，没有类型是 `never` 的子类型（包括 `any`）或可以赋值给 `never` 类型（除了`never`本身之外）。 

## any

any 类型可以绕过类型检查，因此，任意类型的数据可以赋值给该变量，any 类型的数据可以赋值给任意类型。

一般情况不建议使用 any 类型，因为会跳过类型检查，可能会有隐患。

# 扩展类型

## 枚举

枚举通常用于约束某个变量的取值范围。

先看枚举如何使用，定义一个枚举：

```typescript
enum GameStatus {
    playing = 1,
    paused = 2,
    over = 3
}
```

通过关键字可定义一个枚举类型，其中包括一个个的字段和字段值值。

细节：

- 枚举的字段值只能是字符串 / 数字
- 数字枚举的值会自动增加
- 被数字枚举约束的变量，可以直接赋值为数字
- 数字枚举的编译结果 和 字符串枚举有差异

先看第二点，数字枚举的值会自动增加，也就是说上面的代码就等同于

```typescript
enum GameStatus {
    playing = 1,
    paused,
    over
}
```

而且如果这个枚举类型的值一个都没写，则默认第一个值为0，后面依次增加

对于第三点，先看看枚举类型怎么使用：

```typescript
let status: GameStatus = GameStatus.playing;
```

第三点也很好理解了：

```typescript
status = 3; 
```

这样修改 `status` 的值也不会报错而且 `status` 值的类型依旧是 `GameStatus` 

最后一点大家可以尝试自己编译试试看看结果

**枚举的最佳实践**

1. 尽量不要在一个枚举中既出现字符串字段，又出现数字字段
2. 使用枚举时，尽量使用枚举字段的名称，而不使用真实的值

实际上，字面量和联合类型配合使用，也可以达到同样约束某个变量的取值范围的效果，但是为什么还要出现枚举。

字面量约束取值范围会让逻辑含义和真实的值产生了混淆，导致当修改真实值的时候，产生大量的修改。

而且枚举是会出现在编译结果中，这就是枚举为什么会那样使用，可以将逻辑含义和真实的值区分的原因。

枚举在编译后就是一个对象。

## 类型别名

类型别名就是给一些类型起一个别的名字，可以简化代码

例如：

```typescript
type cb = (...args: any[]) => void;
```

通过关键字 `type` 我们就给 `(...args: any[]) => void` 这个类型起了个 `cb` 的名字，以后使用的时候通过 `cb` 就可以使用

## 接口

通过 `interface` 关键字定义一个接口

```typescript
interface User {
    id: string
    age: number
    say: () => void
}
```

### 约束对象

```typescript
let user: User = {
    id: '132414354',
    age: 18,
    say() {}
}
```

### 约束函数

和刚才的类型别名类似，可以对函数起一个类型别名

```typescript
interface Callback {
    (...args: any[]): void
}
```

### 面向对象相关

#### 继承

一个接口可以继承其他的接口（多继承），这样 C 接口就有 `T1`、`T2`、`T3` 三个属性

```typescript
interface A {
    T1: string
}

interface B {
    T2: number
}

interface C extends A, B {
    T3: boolean
}
```

类型别名也可以实现类似的效果，利用交叉类型 `&`

#### 实现

```typescript
class VIPUser implements User {
    id: string;
    age: number;
    level: number
    constructor(id: string, age: number, level: number) {
        this.id = id;
        this.age = age;
        this.level = level;
    }

    say() {
        console.log("I'm vip")
    }
}
```

# 类型对于函数

```typescript
function(a: string, b?: number): boolean {
    return true;
}
```

`?` 是可选参数，可选参数必须在参数列表的末尾

## 函数重载

在函数的实现之前，对函数参数的各种情况进行声明，由于 TS 会编译成js，所以对于参数的判断需要在实现时进行判断

这是自己写俄罗斯方块的一个类的构造函数的例子，函数实现之前的全是声明，最后才是实现

```typescript
constructor();
constructor(postion: Coordinate);
constructor(color: string);
constructor(viewer: IViewer);
constructor(postion: Coordinate, color: string);
constructor(position: Coordinate, viewer: IViewer);
constructor(color: string, viewer: IViewer);
constructor(position: Coordinate, color: string, viewer: IViewer);
constructor(param1?: Coordinate | string | IViewer, param2?: string | IViewer, param3?: IViewer) {
            if (instanceofCoordinate(param1)) {
                this.pos = param1;
            } else if (instanceofIViewer(param1)) {
                this.viewer = param1;
            } else if (typeof param1 === 'string') {
                this.color = param1;
            }
            if (instanceofIViewer(param2)) {
                this.viewer = param2;
            } else if (typeof param2 === 'string') {
                this.color = param2;
            }
            if (instanceofIViewer(param3)) {
                this.viewer = param3;
            }
}
```

**可能会有人问，为什么要写那么函数声明？**

在函数实现之前写的那些函数声明都是函数可以被使用的方式，在我个人看来，因为写了那些声明，最后实现函数重载的时候，思路会比较清晰。

最重要的一点，我们使用 TS 就是使用它的类型系统给我们提供便利，在其他地方调用该函数的时候编辑器会自动的提示该函数的重载。

# 类型断言

有的时候编译器并不是非常的智能无法判断在某个位置某个变量的类型，但是我们可以百分之百的确定在这里这个变量一定是这个类型，为了不报错，我们可以使用类型断言，我感觉类型断言类似于其他语言中的强制类型转换。

通过 `<类型>` / `as 类型` 使用：

```typescript
let num: string = <string>str;

let num: string = str as string;
```

# 类型兼容性

如果 `B = A` 能完成赋值，则B和A类型兼容

TS 中对于类型的赋值，是一种鸭子辨型法：目标类型需要某一些特征，赋值的类型只要能满足该特征即可

对于基本类型不用多说，类型完全匹配才可以。

对于对象类型，采用的就是鸭子辨型法，举个例子：

```typescript
interface User {
    name: string
    age: number
}

class Person {
    constructor(public name: string, public age: number, public sex: boolean) { }
}

let p: User = new Person('xxxx', 15, true);
```

鸭子辨型法就是说，你要的我一定有，我可以多出来别的东西。类似于，子类对象可以赋值个父类类型的变量，但是更加的强大，不强制需要由继承关系或者实现接口。

**注意**：如果使用对象字面量的话，必须强制的符合要求（不能多属性），从这可以感觉出 TS 的设计是非常具有逻辑性的

对于函数类型，就显得一切无比自然：

- 参数：传递给目标函数的参数可以少，但不可以多

- 返回值：要求返回必须返回；不要求返回，我们可以随意返不返回

这就是为什么我们在 TS 中使用 `forEach` 等函数时传递的函数参数可以任意传递的原因