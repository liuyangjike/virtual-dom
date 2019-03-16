var  _ = require('./util')

// 变化类型
var REPLACE = 0  // 替换节点
var REORDER = 1  // 顺序更改
var PROPS = 2  //修改属性
var TEXT = 3   // 文本替换

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

function setProps (node, props) {
  for (var key in props) {
    if (props[key] === void 666) { // undefined, 属性值为undefined, 直接移除
      node.removeAttribute(key)
    } else {
      var value = props[key]
      _.setAttr(node, key, value)
    }
  }
}

function reorderChildren (node, moves) {
  var staticNodeList = _.toArray(node.childNodes)  // dom 转化成数组
  var maps = {}
  _.each(staticNodeList, function (node) {
    if (node.nodeType === 1) {
      var key = node.getAttribute('key')
      if (key) {
        maps[key] = node
      }
    }
  })

  if (moves.length >5) {
    console.log(moves)
  }

  _.each(moves, function (move) {
    var index = move.index
    if (move.type === 0) {  // remove item
      if (staticNodeList[index] === node.childNodes[index]) {
        console.log(node.childNodes, index)
        node.removeChild(node.childNodes[index])
      }
      staticNodeList.splice(index, 1)
    } else if (move.type === 1) {  // insert item
      var insertNode = maps[move.item.key]
        ?maps[move.item.key].cloneNode(true)  // reuse old item
        : (typeof move.item === 'object')
          ? move.item.render()
          : document.createTextNode(move.item)
      staticNodeList.splice(index, 0, insertNode)
      node.insertBefore(insertNode, node.childNodes[index] || null)
    }
  })
}


patch.REPLACE = REORDER
patch.REORDER = REORDER
patch.PROPS = PROPS
patch.TEXT = TEXT

module.exports = patch