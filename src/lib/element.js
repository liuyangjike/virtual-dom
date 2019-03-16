var _ = require('./util')

// 创建虚拟dom
function Element (tagName, props, children) {
  if (!(this instanceof Element)) {
    if (!_.isArray(children) && children !== null) {
      children = _.slice(arguments, 2).filter(_.truthy)
    }
    return new Element(tagName, props, children)
  }

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


module.exports = function (tagName, props, children) {
  return new Element(tagName, props, children)
}