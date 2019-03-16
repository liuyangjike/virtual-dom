var  _ = require('./util')
var patch =  require('./patch')
var listDiff = require('./diffList').diff

// var oldList = [{id: "p", key:'1111'}, {id: "ul", key: '2222'}, {id: 'div', key: '3333'}]
// var newList = [ {id: "ul", key: '2222', children: [1, 2]}, {id: "p", key: '1111'} ,{id: 'div', key: '4444'},  {id: 'div', key: '3333', ch: []}]

// console.log(listDiff(oldList, newList, 'key'))

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

function diffProps (oldNode, newNode) {
  var count = 0
  var oldProps = oldNode.props
  var newProps = newNode.props

  var key, value
  var propsPatches = {}

  // Find out different propertis
  for (key in oldProps) {
    value = oldProps[key]
    if (newProps[key] !== value) {
      count++
      propsPatches[key] = newProps[key]
    }
  }
  // Find out new property
  for (key in newProps) {
    value = newProps[key]
    if (!oldProps.hasOwnProperty(key)) {
      count++
      propsPatches[key] = newProps[key]
    }
  }
  //If properties all are identical
  if (count === 0) {
    return null
  }
}

function isIgnoreChildren (node) {
  return (node.props && node.props.hasOwnProperty('ignore'))
}

module.exports = diff