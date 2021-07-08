---
title: Web文件处理
date: 2021-03-26 08:04:14
tags: [JavaScript]
categories: [前端, Web API]
cover: http://oss.xiefeng.tech/img/20210326103518.png
---

# Blob

Blob 表示一个不可变、原始数据的类文件对象，是 JavaScript 对不可修改二进制数据的封装类型。

构造函数：

```javascript
new Blob(blobParts[, options]);
```

- `blobParts`：是一个由 `ArrayBuffer`, `ArrayBufferView`, `Blob`, `string` 等构成的数组，这些都是 blob 的内容。`string` 会被编码为UTF-8。
- `options`：
	- `type`：默认值为 `""`，内容的MIME类型
	- `endings`：用于指定包含行结束符 `\n` 的字符串如何被写入，默认值为`"transparent"`
		- `native`：行结束符会被更改为适合宿主操作系统文件系统的换行符
		- `transparent`：保持blob中保存的结束符不变

Blob 的只读属性：

- `size`：数据大小
- `type`：数据 MIME 类型

Blob 的方法：

- `slice([start[, end[, contentType]]])`：返回一个新的 `Blob` 对象，包含了源 `Blob` 对象中指定范围内的数据
- `stream()`：返回一个能读取blob内容的 `ReadableStream`
- `text()`：返回一个promise且包含blob所有内容的UTF-8格式的字符串
- `arrayBuffer()`：返回一个promise且包含blob所有内容的二进制格式的 `ArrayBuffer` 

```javascript
const blob = new Blob(['aaa', 'bbb', 'ccc', 'ddd']);

blob.text().then(res => console.log(res)); // aaabbbcccddd
```

# File

File 类型提供了文件的信息，允许 JavaScript 可以访问其内容。File 继承自 Blob，在此基础上扩展支持用户系统上的文件。

每个 File 对象都有一些只读属性：

- `name`：本地系统中的文件名
- `size`：以字节计的文件大小
- `type`：文件 MIME 类型
- `lastModified`：文件最后修改时间的时间戳
- `lastModifiedDate`：文件最后修改时间 Date 类型

通过构造函数也可以创建一个 File 实例，构造函数：

```javascript
new File(bits, name[, options]);
```

- `bits`：一个包含 `ArrayBuffer`，`ArrayBufferView`，`Blob`，或者 `string` 的数组，这是 UTF-8 编码的文件内容。
- `name`：表示文件名称，或者文件路径
- `options` ：选项对象，包含文件的可选属性。可用的选项如下
	- `type`：表示将要放到文件中的内容的 MIME 类型。默认值为 `""` 。
	- `lastModified`：表示文件最后修改时间的 Unix 时间戳（毫秒）。默认值为 `Date.now()`

```javascript
const file = new File(["foo"], "foo.txt", { type: "text/plain" });
```

通过表单控件所选择的文件保存在 `input.files` 属性中，该属性是一个 FileList 类型。FileList 是一个类数组，每一项都是一个 File 类型。

FileList 类型也实现了 Iterator 接口。

# FileReader

FileReader 类型表示一种异步文件读取机制，使用 File 或 Blob 对象指定要读取的文件或数据。

FileReader 类型提供了几个读取文件数据的方法：

- `readAsText(blob[, encoding])`：读取文件为字符串保存在 `result` 属性中。第二个参数表示编码，默认 `'utf-8'`
- `readAsDataURL(blob)`：读取文件并将内容的数据编码为 base64 保存在 `result` 属性中
- `readAsBinaryString(blob)`：读取文件并将每个字符的二进制数据保存在 `result` 属性中
- `readAsArrayBuffer(blob)`：读取文件并将文件内容以 ArrayBuffer 形式保存在 `result` 属性中
- `abort()`：中止读取操作，`readyState` 属性变为 `DONE`

FileReader 类型的事件：

- `onabort`：该事件在读取操作被中断时触发，通过 `abort` 方法触发
- `onerror`：该事件在读取操作发生错误时触发
- `onload`：该事件在读取操作完成时触发
- `onloadstart`：该事件在读取操作开始时触发
- `onloadend`：该事件在读取操作结束时（要么成功，要么失败）触发
- `onprogress`：progress 事件每 50 毫秒就会触发一次，在 progress 事件中可以读取 `result` 属性，即使其中尚未包含全部数据

事件参数 e 为 `ProgressEvent`，其中包含 `lengthComputable`、`loaded` 和 `total`

因为 FileReader 继承自 `EventTarget`，所以可以通过 `addEventListener` 方法注册

FileReader 类型的只读属性：

- `result`：文件的内容。该属性仅在读取操作完成后才有效，数据的格式取决于使用哪个方法来启动读取操作
- `readyState`：表示 FileReader 状态的数字
	- 0：EMPTY，还没有加载任何数据
	- 1：LOADING，数据正在被加载
	- 2：DONE，已完成全部的读取请求
- `error`：表示在读取文件时发生的错误，1（未找 到文件）、2（安全错误）、3（读取被中断）、4（文件不可读）、 5（编码错误）

```javascript
let file;
document.querySelector('input').onchange = e => {
    file = e.target.files[0];
    read.readAsDataURL(file)
}
const read = new FileReader();
read.onload = e => console.log(read.result)
read.onprogress = e => console.log(e.loaded / e.total);
```

![](http://oss.xiefeng.tech/img/20210326094011.png)

# FileReaderSync

FileReaderSync 接口允许以同步的方式读取 File 或 Blob 对象中的内容。

FileReaderSync 只在工作线程中可用，因为在主线程里进行同步I/O操作可能会阻塞用户界面。

方法：

- `readAsArrayBuffer(blob)`
- `readAsText(blob[, encoding])`
- `readAsDataUrl(blob)`
- `readAsBinaryString(blob)`

读取的结果在返回值中，这些方法可能引发下述异常：

- `NotFoundError`
- `SecurityError`
- `NotReadableError`
- `EncodingError`

```javascript
// worker.js 
self.omessage = (messageEvent) => {
    const syncReader = new FileReaderSync(); 
    // 读取文件时阻塞工作线程 
    const result = syncReader.readAsDataUrl(messageEvent.data); // PDF 文件的示例响应
    console.log(result); // data:application/pdf;base64,JVBERi0xLjQK... // 把 URL 发回去 
    self.postMessage(result);
}
```

# ObjectURL

对象 URL 有时候也称作 Blob URL，是指引用存储在 File 或 Blob 中数据的 URL。

对象 URL 的优点是不用把文件内容读取到 JavaScript 也可以使用文，只要在适当位置提供对象 URL 即可。

通过 `window.URL.createObjectURL(blob)` 创建 ObjectURL，返回的值是一个指向内存中地址的字符串。

因为这个字符串是 URL，所以可以在 DOM 中直接使用。

使用完数据之后，最好能释放与之关联的内存。但是如果对象 URL 在使用中，就不能释放内存。

使用 `window.URL.revokeObjectURL(URL)` 可以释放对象 URL。页面卸载时所有对象 URL 占用的内存都会被释放。不过，最好在不使用时就立即释放内存，以便尽可能保持页面 占用最少资源。

使用对象 URL 可以实现文件导出：

```javascript
const createDownloadURL = data => window.URL.createObjectURL(new Blob([data], { type: 'text/plain' }));

const exportFile = (data, fileName, ext) => {
    const download = document.createElement('a');
    download.display = 'none';
    const url = createDownloadURL(data);
    download.href = url;
    download.download = `${fileName}.${ext}`;
    document.body.appendChild(download);
    download.click();
    document.body.removeChild(download);
    window.URL.revokeObjectURL(url);
    return true;
}
```

# 读取文件夹

通过给 input 标签添加 `webkitdirectory` 属性可以上传文件中的所有文件。在多层路径的情况下，通过 `webkitRelativePath` 属性即可判断文件所属文件夹。

```html
 <input type="file" webkitdirectory directory>
```



