---
title: AVL树
date: 2021-02-08 12:29:49
tags: 数据结构
categories: [计算机基础, 数据结构]
keywords: 二叉树, 二叉搜索树, 平衡二叉搜索树, AVL树
description:
cover: https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208221126.jpg
---

# 平衡二叉搜索树

在理想情况下，二叉搜索树添加、删除、搜索的时间复杂度为 logn 级别，但是二叉搜索树的结构依赖于添加的顺序。最糟糕的情况会让一棵二叉搜索树退化成一个链表。

对于7、4、9、2、5、8、11这样的数据，构造出来的二叉搜索树是这样的：

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208130334.svg)

但是如果数据添加的顺序不是按照这个顺序而是按照从大到小/从小到大的顺序，那么就会退化成一个链表。

对于二叉搜素树来说，由于数据添加的顺序决定了树的结构，所以很难达到理想情况。

**平衡：** 所谓的平衡就是左右子树的高度接近。左右子树高度越接近，二叉树越平衡。

最理想的平衡就是像完全二叉树那样，高度是最小的。

在二叉搜索树的添加、删除之后做一些操作，来减小树的高度，让树变平衡一些。

# AVL树

AVL树是最早发明的平衡二叉搜索树之一。

## 平衡因子

平衡因子是AVL树中一个比较重要的概念，它是指树中某个节点的左右子树的高度差，通常我们用左子树减去右子树。

AVL树对平衡因子的要求：每个节点的平衡因子只能为 -1，0，1。

这意味着每个节点的左右子树的高度差不能超过1，超过就意味着失去平衡需要调整。

## AVL树节点定义

```typescript
class AVLNode<T> extends TreeNode<T> {
    // 树的高度
    public height: number = 1;

    public right: AVLNode<T> | null = null;
    public left: AVLNode<T> | null = null;
    public parent: AVLNode<T> | null = null;

    // > 0 左边高    < 0 右边高
    public get balanceFactor() {
        const left = this.left?.height || 0;
        const right = this.right?.height || 0;
        return left - right;
   }
}
```

## 失衡调整

AVL树失衡的调整有四种情况，添加和删除是一样的。

### LL型

这种情况下，对于失衡的节点来说，是左子树的左子树导致的。也就是说左子树的高度比右子树的高度 > 1，而且左子树的左子树的高度是大于左子树的右子树的。

![](https://xf-blog-imgs.oss-cn-hangzhou.aliyuncs.com/img/20210208134822.svg)

以添加到情况为例，添加了节点2导致了失衡，失衡的节点是9，而导致失衡的原因是因为左子树的左子树导致的。

**调整方式：** 让失衡节点右单旋。

以上面的情况为例：

![](D:/Google%20Chrome/%E4%BA%8C%E5%8F%89%E6%90%9C%E7%B4%A2%E6%A0%91%20(4).svg)

对于一般的情况就是这样：

```typescript
/**
 * LL 右单旋
 *
 *         y                          x
 *        / \                       /   \
 *       x   T4     y 右旋转        z     y
 *      / \       ------------>   / \   /  \
 *     z  T3                     T1 T2 T3  T4
 *    / \
 *   T1 T2
 */
```

### RR型

和LL型对应，就是右子树的右子树导致的节点失衡。

调整方案也很简单，让失衡的节点左单旋。

```typescript
/**
 *  RR  左单旋
 * 
 *         y                           x
 *        / \                        /   \
 *       T1  x       y 右旋转        y     z
 *          / \    ----------->    / \   / \
 *        T2  z                   T1 T2 T3 T4
 *           / \
 *          T3 T4
 */
```

### LR型

是左子树的右子树导致的失衡。

**调整方案：**

1. 左子树根节点左单旋
2. 失衡节点右单旋

```typescript
/**
 * LR 左单旋 + 右单旋
 *
 *         y                           y                         z
 *        / \                         / \                     /     \
 *       x   T4     x 左单旋          z  T4    y 右单旋        x       y
 *      / \       ----------->      / \     ----------->    / \     / \
 *     T1  z                       x  T3                   T1  T2  T3 T4
 *        / \                     / \
 *       T2 T3                   T1  T2
 */
```

### RL型

是右子树的左子树导致的失衡。

**调整方案：**

1. 右子树根节点右单旋
2. 失衡节点左单旋

```typescript
/**
 * RL 右单旋 + 左单旋
 *
 *         y                      y                         z
 *        / \                    / \                     /     \
 *       T1  x      x 右单旋     T1  z    y 左单旋        y       x
 *          / \   ----------->     / \  ----------->   / \     / \
 *         z  T2                  T3  x               T1  T3  T4 T2
 *        / \                        / \
 *       T3 T4                      T4 T2
 */
```

## 实现旋转

可以看到核心的逻辑就是左单旋和右单旋。

**左单旋：**

```typescript
function rotateLeft(root: AVLNode<T>): AVLNode<T> {
    const right = <AVLNode<T>>root.right;
    const rightLeft = right.left;
    // 旋转
    right.left = root;
    root.right = rightLeft;
    // 更新 parent,需要更新parent是因为树的节点中维护了parent，非必须
     right.parent = root.parent; 
     rightLeft && (rightLeft.parent = root);
     root.parent = right;
    // 更新高度
    this.updateHeight(root);
    this.updateHeight(right);
    // 返回新的根节点
    return right;
}
```

**右单旋：**

```typescript
function rotateRight(root: AVLNode<T>): AVLNode<T> {
    const left = <AVLNode<T>>root.left;
    const leftRight = left.right;
    // 旋转
    left.right = root;
    root.left = leftRight;
    // 更新parent属性
    left.parent = root.parent;
    leftRight && (leftRight.parent = root);
    root.parent = left;
    // 更新树高
    updateHeight(root);
    updateHeight(left);
    // 返回新的根节点
    return left;
}
```

其中的 `updateHeight` 方法：

```typescript
function updateHeight(root: AVLNode<T>): void {
    root.height = Math.max(root.right?.height || 0, root.left?.height || 0) + 1;
}
```

## 添加和删除

AVL树的添加和删除需要在二叉搜索树的基础上稍加改进。

因为添加和删除会导致树失衡，所以添加和删除完之后可以直接检查一个节点是否失衡并调整。

```typescript
function checkBalance(root: AVLNode<T>): AVLNode<T> {
    const factor = root.balanceFactor;
    if (factor > 1) { // L
        const left = <AVLNode<T>>root.left;
        const leftFactor = left.balanceFactor;
        if (leftFactor > 0) { // LL
            root = rotateRight(root);
        } else {  // LR
            root.left = this.rotateLeft(left);
            root = rotateRight(root);
        }
    } else if (factor < -1) { // R
        const right = <AVLNode<T>>root.right;
        const rightFactor = right.balanceFactor;
        if (rightFactor < 0) { // RR
            root = rotateLeft(root);
        } else {  // RL
            root.right = rotateRight(right);
            root = rotateLeft(root);
        }
    }
    return root;
}
```

**添加：**

```typescript
function add(root: AVLNode<T> | null, val: T): AVLNode<T> {
    // 递归的方式的添加代码 ...
    // 添加完需要先更新高度，再检测平衡
    this.updateHeight(root);
    root = this.checkBalance(root);
    return root;
  }
```

**删除：**

```typescript
function delete(root: AVLNode<T> | null, val: T): AVLNode<T> | null {
    // 递归的方式的删除代码 ...
    if (root) {
        this.updateHeight(root);
        root = this.checkBalance(root);
    }
    return root;
}
```

**注：** 检测一个节点是否平衡的逻辑大致相同，但是对于不同的添加方式，迭代和递归的最终代码会有所差别，因为递归的特性只需要在每次添加/删除完成更新高度并检测就行。

**tips：**

- 本文只涉及核心逻辑，具体添加和删除的代码可以见[二叉树和二叉搜索树](/二叉树和二叉搜索树.html)。

- 完整的代码实现可以见[GitHub项目](https://github.com/xiefenga/data-structure)。











