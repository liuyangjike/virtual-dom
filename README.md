## 虚拟DOM的patch算法实现

### 前言
因为处理真实的`DOM`速度比较慢, 所以可以用原生的`Javascript`对象处理起来比较快

### 1. 用Js对象模块DOM树
```js
// 创建虚拟dom
function Element (tagName, props, children) {

  if (_.isArray(props)) {  // 没有传props的时候
    children = props
    props = {}
  }
  this.tagName = tagName
  this.props = props || {}
  this.children = children || []
  this.key = props
    ?props.key
    : void 666  // undefined
  var count = 0

  _.each(this.children, function (child, i) {
    if (child instanceof Element) {
      count += child.count
    } else {
      children[i] = '' + child
    }
    count++
  })
  this.count = count
}

module.exports = function (tagName, props, children) {
  return new Element(tagName, props, children)
}
```
使用时就可以这样:
```js
var ul = el('ul', {id: 'list'}, [
  el('li', {class: 'item'}, ['Item 1]),
  el('li', {class: 'item'}, ['Item 2]),
  el('li', {class: 'item'}, ['Item 3]),
])
```

把虚拟dom映射成真实dom
```js
// 将虚拟dom  映射成 真实的dom
Element.prototype.render = function () {
  var el = document.createElement(this.tagName)  // 根据tagName构建
  var props = this.props

  for (var propName in props) {  // 设置节点的DOM属性
    var propValue = props[propName]
    _.setAttr(el, propName, propValue)
  }

  _.each(this.children, function (child){
    var childEl = (child instanceof Element)
      ? child.render()  // 如果子节点也是虚拟dom, 递归构建DOM节点
      : document.createTextNode(child)  // 如果是字符串, 只构建文本节点
    el.appendChild(childEl)
  })
  return el
}
```

### 2. 对比新旧虚拟dom树的差异
比较两棵DOM树的差异是 `Virtual DOM `算法最核心的部分。两个树的完全的 `diff` 算法是一个时间复杂度为` O(n^3)` 的问题。但是在前端当中，你很少会跨越层级地移动DOM元素。所以` Virtual DOM` 只会对同一个, 这样算法复杂度就可以达到 `O(n)`。
```js
// diff函数  对比两棵树
function diff (oldTree, newTree) {
  var index = 0  // 当前节点的标志0, 1, 2 ....
  var patches = {}  // 用来记录每个节点差异的对象

  dfsWalk(oldTree, newTree, index, patches)
  return patches
}

// 对两棵树进行深度优先遍历
function dfsWalk (oldNode, newNode, index, patches) {
  var currentPatch = []

  // Node is removed
  if (newNode === null) {
    // Real DOM node will be removed when preform reordering, so has no needs to do anythings in here
  } else if ( _.isString(oldNode)  && _.isString(newNode)) {
    if (newNode !== oldNode) {   // 字符串替换
      currentPatch.push({type: patch.TEXT, content: newNode})
    }
  // Nodes are the same, diff old node's props and children
  } else if (
    oldNode.tagName === newNode.tagName && oldNode.key === newNode.key
  ) {
    // Diff props
    var propsPatches = diffProps(oldNode, newNode)
    if (propsPatches) {
      currentPatch.push({type: patch.PROPS, props: propsPatches})
    }
    // Diff children, If the node has a `ignore` property, do not diff children
    if (!isIgnoreChildren(newNode)) {
      diffChildren(
        oldNode.children,
        newNode.children,
        index,
        patches,
        currentPatch
      )
    }
    // 新旧节点不同, 用新节点替换老节点
  } else {
    currentPatch.push({type: patch.REPLACE, node: newNode})
  }
  // 对比oldNode和newNode的不同, 记录下来
  if (currentPatch.length) {
    patches[index] = currentPatch
  }
}

// 遍历子节点
function diffChildren (oldChildren, newChildren, index, patches, currentPatch) {
  var diffs = listDiff(oldChildren, newChildren, 'key')
  newChildren = diffs.children
  if (diffs.moves.length) {
    var reorderPatch = {type: patch.REORDER, moves: diffs.moves}
    currentPatch.push(reorderPatch)
  }
  var leftNode = null
  var currentNodeIndex = index
  _.each(oldChildren, function (child, i){       //
    var newChild = newChildren[i]
    currentNodeIndex = ( leftNode && leftNode.count) // 计算节点的标识
      ? currentNodeIndex + leftNode.count + 1
      : currentNodeIndex + 1
    dfsWalk(child, newChild, currentNodeIndex, patches)  // 深度遍历子节点
    leftNode = child
  })
}
```
##### 深度优先遍历，记录差异
在实际的代码中，会对新旧两棵树进行一个深度优先的遍历，这样每个节点都会有一个唯一的标记：`0`, `1`....

![](http://ww1.sinaimg.cn/large/b44313e1ly1g14p3nbxfaj20bd09jt9u.jpg)

在深度优先遍历的时候，每遍历到一个节点就把该节点和新的的树进行对比。如果有差异的话就记录到一个对象里面。
##### 差异类型
* 替换掉原来的节点，例如把上面的div换成了section
* 移动、删除、新增子节点，例如上面div的子节点，把p和ul顺序互换
* 修改了节点的属性
* 对于文本节点，文本内容可能会改变。例如修改上面的文本节点2内容为`Virtual DOM 2`

##### 列表对比算法
这个问题抽象出来其实是字符串的最小编辑距离问题

### 3. 把差异应用到真正的DOM树上

```js
function patch (node, patches) {  //将差异更新到真正的DOM树上
  var walker = {index: 0}  // 节点的标志
  dfsWalk(node, walker, patches)  // 深度优先的遍历
}

function dfsWalk (node, walker, patches) {
  
  var currentPatches = patches[walker.index]  //  从patches拿出当前节点的差异
  
  var len = node.childNodes
    ? node.childNodes.length
    : 0

  for (var i =0; i < len; i++) {  // 省深度遍历子节点
    var child = node.childNodes[i]
    walker.index++
    dfsWalk(child, walker, patches)
  }

  if (currentPatches) {
    applyPatches(node, currentPatches)  // 对当前节点进行DOM操作
  }
}

function applyPatches(node, currentPatches) {
  _.each(currentPatches, function(currentPatch) {
    switch (currentPatch.type) {
      case REPLACE:
        var newNode = (typeof currentPatch.node === 'string')
          ? document.createTextNode(currentPatch.node)
          : currentPatch.node.render()
        node.parentNode.replaceChild(newNode, node)
        break
      case REORDER:
        reorderChildren(node, currentPatch.moves)
        break
      case PROPS:
        setProps(node, currentPatch.props)
        break
      case TEXT:
        if (node.textContent) {   // 区别input和其他dom
          node.textContent = currentPatch.content
        } else {
          node.Value = currentPatch.content
        }
        break
      default:
        throw new Error('Unknown patch')
    }
  })
}
```
### 参考
[深度剖析：如何实现一个 Virtual DOM 算法](https://github.com/livoras/blog/issues/13)