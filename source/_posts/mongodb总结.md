---
title: mongodb总结
date: 2021-02-08 16:14:45
tags: mongodb
categories: [数据库, mongodb]
keywords: mongodb
description: mongodb总结
cover: https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208205804.png
---

# 基础概念

**mongodb 的特点：**

- `nosql`数据库
	- 无`sql`语句
	- 使用极其简单，学习成本非常低
	- 由于没有集合之间的关联，难以表达复杂的数据关系
	- 存取速度极快
- 文档型数据库
	- 数据内容非常丰富和灵活
	- 对数据结构难以进行有效的限制

**基础概念：**

- `db`：和`mysql`的概念一致
- `collection`：集合，类似于`mysql`中的表
- `document`：每个集合中的文档，类似于`mysql`中的记录
	- `Primary Key`：和`mysql`中的主键含义一致，每个`document`都有一个主键
	- `field`：文档中的字段

# 常用命令

1. 查看所有数据库：

   ```shell
   show dbs;
   ```

2. 显示当前使用的数据库：

   ```shell
   db;
   ```

3. 查看当前数据库状态：

   ```shell
   db.stats()
   ```

4. 查看数据库中所有的集合：

   ```shell
   show collections;
   ```

5. 切换数据库：

   ```shell
   use db;
   ```
   
6. 备份：

	```shell
	mongodump -d <dbname> -o <backupDir>
	```

7. 恢复

	```shell
	mongorestore -d <dbname> <backupDir>
	```

# 原生CRUD

## Create

```shell
// 新增单个数据，doc是一个文档对象
db.<collection>.insertOne(doc); 

// 新增多个数据，docs是一个文档数组
db.<collection>.insertMany(docs); 

// 新增单个或多个数据，返回新增的行数，doc即可以是一个文档对象，也可以是一个文档数组
db.<collection>.insert(doc); 
```

- 新的文档如果没有指定字段`_id`，则会自动添加一个字段`_id`作为主键

- 自动的主键是一个`ObjectId`对象，该对象是通过调用函数`ObjectId()`创建的

- 它的原理是根据**时间戳+机器码+进程Id+自增量**生成的一个十六进制的唯一字符串

- 使用`ObjectId`函数还可以把某个字符串还原成一个`ObjectId`对象，例如`ObjectId("xxxxx")`

## Read

```shell
db.<collection>.find([filter, projection]);
```

- `filter`：条件参数
- `projection`：投影，表示哪些字段需要投影到查询结果中
- 返回结果：一个游标对象（cursor），它类似于迭代器，可以在查询结果中进行迭代

### cursor对象

- `next()`：游标向后移动，并返回下一个结果，如果没有结果则报错
- `hasNext()`：判断游标是否还能向后移动
- `skip(n)`：去前面的`n`条数据，**返回`cursor`**
- `limit(n)`：取当前结果的`n`条数据，**返回`cursor`**
- `sort(sortObj)`：按照指定的条件排序，**返回`cursor`**
- `count()`：得到符合 `filter` 的结果数量
- `size()`：得到最终结果的数量

由于某些函数会继续返回`cursor`，因此可以进行链式编程。

但是无论它们的调用顺序如何，始终按照这样的顺序执行：**sort --> skip --> limit**

`count` 始终返回的是 `find` 函数得到的数据数量，只有 `size`返回的是前一个函数返回的数量。

### filter条件

`filter`的写法极其丰富，只总结常用的。

**查询中的常用操作符：**

- `$or`：或者
- `$and`：并且
- `$in`：在...之中
- `$nin`：不在...之中
- `$gt`：大于
- `$gte`：大于等于
- `$lt`：小于
- `$lte`：小于等于
- `$ne`：不等于

**常见场景：**

1. 查询所有`name`为"曹敏" 并且`age`在 20~30 之间年龄的用户

	```json
	{  name: "曹敏",  age: {  $gt: 20,  $lt: 30 } }
	```

2. 查询所有`age`等于18 或 20 或 25 的用户

	```json
	{ age: { $in: [18, 20, 25] } }
	```

3. 查询所有`loginId`以7结尾 或者 `name`包含"敏"的用户

	```json
	{ $or: [ { loginId: /7$/ }, { name: /敏/ } ] }
	```

4. 查询`tags`数组字段是否包含 "red"

	```json
	{ tags: "red" }
	```

5. 第四点具体来说，查询一个数组字段是否至少包含一个符合条件的元素，字段后面可以跟条件

	`dim_cm`包含至少一个值大于25的元素

	```json
	{ dim_cm: { $gt: 25 } }
	```

### projection条件

类似于`mysql`中的`select`，表达了哪些字段需要投影到查询结果中，哪些不需要

1. 查询结果中仅包含 `name`、`age`，以及会自动包含的 `_id`

	```json
	{ name: 1, age: 1 }
	```

2. 查询结果不能包含 `loginPwd`、`age`，其他的都要包含

	```json
	{ loginPwd: 0, age: 0 }
	```

## Update

```shell
db.<collection>.updateOne(filter, update, [options]); 

db.<collection>.updateMany(filter, update, [options]); 
```

### update操作

#### 普通字段

1. 将匹配文档的 `name` 设置为"邓哥"，`address.city` 设置为"哈尔滨"

	```json
	{ $set: {  name:"邓哥", "address.city": "哈尔滨" } }
	```

2. 将匹配文档的 `age` 字段、`address.province` 字段删除

	```json
	{ $unset: { age:"", "address.province":"" } }
	```

3. 将匹配文档的`age`增加 2，`number`乘以2

	```json
	{ $inc: { age: 2 }, $mul: { number: 2 } }
	```

4. 匹配文档的 `name` 字段修改为 `fullname`

	```json
	{ $rename: { name: "fullname" } }
	```

#### 数组字段

1. 向 `loves` 添加一项"秋葵"，不存在则进行添加，若存在则不进行任何操作

	```json
	{ $addToSet: { loves: "秋葵" } }
	```

2. 向 `loves` 添加一项"秋葵"，无论数组中是否存在都添加

	```json
	{ $push: { loves: "秋葵" } }
	```

3. 向 `loves` 添加多项："秋葵、"香菜"

	```json
	{ $push: { loves: { $each: ["秋葵", "香菜"] } } }
	```

4. 删除 `loves` 中满足条件的项: "秋葵" 或 "香菜"

	```json
	{ $pull: { loves: { $in: ["秋葵","香菜"] } } }
	```

5. 将所有 `loves` 中的 "其他 "修改为 "other"

	```shell
	db.users.updateOne({
	    loves: "其他"
	}, {
	    $set: {
	        "loves.$": "other"
	    }
	})
	```

### option

- `upsert`：默认`false`，若无法找到匹配项，则进行添加

## Delete

```shell
db.<collection>.deleteOne(filter)
db.<collection>.deleteMany(filter)
```

# 索引

在数据库中，索引类似于一个目录，用于快速定位到具体的内容

**使用索引可以显著的提高查询效率，但会增加额外的存储空间**

在mongodb中，索引的存储结构是B树。

## 创建索引

```shell
db.<collection>.createIndex(keys, [options]);
```

- `keys`：指定索引中关联的字段，以及字段的排序方式，1为升序，-1为降序
- `options`：索引的配置
	- `background`：默认`false`，建索引过程会阻塞其它数据库操作，是否以后台的形式创建索引
	- `unique`：默认`false`，是否是唯一索引
	- `name`：索引名称

## 其他索引操作

```shell
// 查看所有索引
db.<collection>.getIndexes()
// 查看集合索引占用空间
db.<collection>.totalIndexSize()
// 删除所有索引
db.<collection>.dropIndexes()
// 删除集合指定索引
db.<collection>.dropIndex("索引名称")
```

## 最佳实践

- 针对数据量大的集合使用索引
- 针对常用的查询或排序字段使用索引
- 尽量避免在程序运行过程中频繁创建和删除索引

# Mongoose

## CRUD操作

### Create

**方式1：创建模型对象，然后保存**

```javascript
const obj = new <Model>(doc); 
const result = await obj.save();
```

**方式2：直接使用函数创建对象**

```javascript
// 创建一个或多个文档
const result = await <Model>.create(...doc); 
```

**创建操作的细节**：

- `mongoose`会为每个对象（包括子对象）添加字段`_id`，特别是在对象数组中，可以有效的维护数据的唯一标识
	- 如果希望禁用这种做法，只需要在相应的`Schema`中配置`_id: false`
- `mongoose`在创建文档时，会自动生成一个字段`__v`，该字段用于方式并发冲突
	- 如果希望禁用这种做法，只需要在`Schema`的第二个参数中配置`versionKey: false`
- `mongoose`总是会在保存文档时触发验证，如果希望禁用这种行为，可以有两种做法：
	- 在`Schema`的第二个参数中配置`validateBeforeSave:false`，该`Schema`的`Model`在保存时均不会触发验证
	- 在调用`save`方法或`create`方法时，传入配置`validateBeforeSave:false`，仅针对这一次调用不进行验证
- `mongoose`支持`<Model>.validate(doc, [context])`直接对文档进行验证，该验证是异步的。
- `<Model>.create(doc, option)`等效于`new <Model>(doc).save(option)`
	- 如果给`create`传入的是多个文档，则其在内部会创建多个模型，然后循环调用它们的`save`方法
- 两种方式都会得到**模型实例**，该实例会被`mongoose`持续跟踪，只要对模型实例的修改都会被记录，一旦重新调用模型实例的`save`方法，就会把之前对模型的所有更改持久化到数据库。
- 新增对象时，如果遇到`Schema`中没有定义的字段，则会被忽略

### Read

```javascript
<Model>.findById(id); // 按照id查询单条数据
<Model>.findOne(filter, projection); // 根据条件和投影查询单条数据
<Model>.find(filter, projection); // 根据条件和投影查询多条数据
```

**细节：**

`findOne` 和 `find`如果没有给予回调或等待，则不会真正的进行查询，而是返回一个`DocumentQuery`对象，可以通过`DocumentQuery`对象进行链式调用进一步获取结果，直到传入了回调、等待、调用`exec`时，才会真正执行查询。

**链式调用中包括：**

- `count`  --> `countDocuments`
- `limit`
- `skip`
- `sort`

**和原生的区别：**

1. `count`得到的是当前结果的数量
2. 查询`id`时，使用字符串即可
3. `projection`支持字符串写法
4. `sort` 支持字符串写法
5. `populate` 支持关联查询

### Update

**方式1：在模型实例中进行更新，然后保存**

```javascript
const u = await User.findById("5ed093872e3da2b654983476");
u.address.province = "黑龙江";
u.loves.push("秋葵", "香菜");
await u.save(); // 此时会自动对比新旧文档，完成更新
```

**方式2：直接使用函数进行更新**

```javascript
<Model>.updateOne(filter, update, [options]);
<Model>.updateMany(filter, update, [options]);
```

**细节：**

- `_id`可以直接使用字符串进行匹配
- `updatec`中可以省略`$set`，直接更改即可
- 默认情况下，不会触发验证，需要在`options`设置`runValidators: true`开启验证

### Delete

```javascript
<Model>.deleteOne(filter);
<Model>.deleteMany(filter);
```

## 联表查询

1. 定义 `schema` 的时候，在需要联表查询的字段加入 `ref`，值为模型名称
2. 查询时，使用链式调用 `populate(filed/options)`

例如联表查询 `user`：

第一步，定义 `schema`：

```javascript
const categorySchema = new Schema<IMiniCategory>({
  topLevel: {
    type: ObjectId,
    required: true,
    ref: 'TopLevelCategory'
  },
  twoLevel: {
    type: ObjectId,
    ref: 'TwoLevelCategory'
  }
});

const articleSchema = new Schema<IArticle>({
  title: {
    type: String,
    required: true,
    unique: true
  },
  markdown: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  categories: {
    type: [categorySchema],
    required: true,
    index: true
  },
  tags: [{
    type: ObjectId,
    required: true,
    index: true,
    ref: 'Tag'
  }]
});
```

第二步，查询使用 `populate`：

```javascript
const result = await Article.find()populate("tags").populate({
    path: 'categories',
    populate: 'topLevel twopLevel'
});
console.log(result);
```

## 并发管理

在并发请求中会有多个异步函数同时操作数据库，就可能发生数据模型和数据库中的数据不统一的情况，面对这种情况，`mongoose`作出以下假设：

- 当修改一个文档时，如果某些字段已经不再和数据库对应，说明这个字段的数据是脏数据（dirty data），对于脏数据，不应该对数据库产生影响
- 当修改一个文档时，如果字段和数据库是对应的，则是正常数据，正常数据可以正常的更改数据库

然而，`mongoose`无法准确的判定数组是否是脏数据，因此，如果遇到数组的修改，`mongoose`会做出如下处理：

- 当新增文档时，会自动添加字段`__v`，用于记录更新版本号，一开始为`0`
- 通过模型实例对数组进行修改后，保存时会在内部调用实例的`increment`函数，将版本号`+1`
- 当其他模型实例也更改了数组，保存时会对比版本号，如果不一致，则会引发`VersionError`

出现错误是好事，可以提醒开发者：这一次保存的某些数据是脏数据，应该引起重视。开发者可以灵活的根据具体情况作出处理，比如提示用户保存失败，或者重新获取数据然后保存。

**版本控制插件：**

`mongoose`仅针对数组进行版本控制，如果要针对所有字段都进行版本控制，需要使用`mongoose`的插件：`mongoose-update-if-current`。

使用插件后，所有的字段都将受到版本控制，一旦版本不一致，将引发`VersionError`。

