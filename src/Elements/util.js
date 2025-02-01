import each from 'licia/each'
import isStr from 'licia/isStr'
import isShadowRoot from 'licia/isShadowRoot'
import { classPrefix as c } from '../lib/util'

export function sepateStyles(syl) {
  const regex = /\/\*.*?\*\/|[^;]+;/g
  return syl?.match(regex)?.map(e => e.trim())
}

export function valImportant(val) {
  const splitted = val?.split('!')
  return val?.includes('!important') ? `${splitted[0]} <span class="eruda-important">${splitted[1]}</span>` : val
}

/*class ElementHistory {
  undoArr = []
  redoArr = []
  constructor() {}
  action(action) {
    this.undoArr.push(action)
    this.redoArr = []
  }
  undo(){
    const action = this.undoArr.pop()
    action?.undo.fn(...action.undo.args)
    action && this.redoArr.push(action)
  }
  redo(){
    const action = this.redoArr.pop()
    action?.redo.fn(...action.redo.args)
    action && this.undoArr.push(action)
  }
}

export const elementHistory = new ElementHistory()*/

export function formatNodeName(node, { noAttr = false } = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    return `<span class="${c('tag-name-color')}">(text)</span>`
  } else if (node.nodeType === Node.COMMENT_NODE) {
    return `<span class="${c('tag-name-color')}"><!--></span>`
  } else if (isShadowRoot(node)) {
    return `<span class="${c('tag-name-color')}">#shadow-root</span>`
  }

  const { id, className, attributes } = node

  let ret = `<span class="eruda-tag-name-color">${node.tagName.toLowerCase()}</span>`

  if (id !== '') ret += `<span class="eruda-function-color">#${id}</span>`

  if (isStr(className)) {
    let classes = ''
    each(className.split(/\s+/g), (val) => {
      if (val.trim() === '') return
      classes += `.${val}`
    })
    ret += `<span class="eruda-attribute-name-color">${classes}</span>`
  }

  if (!noAttr) {
    each(attributes, (attr) => {
      const name = attr.name
      if (name === 'id' || name === 'class' || name === 'style') return
      ret += ` <span class="eruda-attribute-name-color">${name}</span><span class="eruda-operator-color">="</span><span class="eruda-string-color">${attr.value}</span><span class="eruda-operator-color">"</span>`
    })
  }

  return ret
}
