import Tool from '../DevTools/Tool'
import $ from 'licia/$'
import isEl from 'licia/isEl'
import nextTick from 'licia/nextTick'
import Emitter from 'licia/Emitter'
import map from 'licia/map'
import MediaQuery from 'licia/MediaQuery'
import isEmpty from 'licia/isEmpty'
import toNum from 'licia/toNum'
import copy from 'licia/copy'
import isShadowRoot from 'licia/isShadowRoot'
import LunaDomViewer from 'luna-dom-viewer'
import { isErudaEl, classPrefix as c, isChobitsuEl } from '../lib/util'
import evalCss from '../lib/evalCss'
import Detail from './Detail'
import chobitsu from '../lib/chobitsu'
import emitter from '../lib/emitter'
import { formatNodeName } from './util'
import { keybindManager } from '../utils'

export default class Elements extends Tool {
  constructor() {
    super()

    this._style = evalCss(require('./Elements.scss'))

    this.name = 'elements'
    this._selectElement = false
    this._observeElement = true
    this._history = []
    this._baseEl

    keybindManager.addSection('elements', async (event) => {
      if (event.key === 'Delete') {
          this._deleteNode()
      } else if (event.ctrlKey && (event.key === 'c' || event.key === 'C')) {
          this._copyNode()
      } else if (event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
          await this._curNode.insertAdjacentHTML('afterend', await navigator.clipboard.readText() || '');
      } else if (event.ctrlKey && (event.key === 'x' || event.key === 'X')) {
          this._copyNode()
          this._deleteNode()
      } else if (event.ctrlKey && event.key === 'Enter') {
        if (!this._$inputContainer.hasClass(c('hidden'))) {
          this._changeElement()
        }
      } else if (event.key === 'Escape') {
        if (!this._$inputContainer.hasClass(c('hidden'))) {
          this._toggleLSInput()
          this._$textarea[0]?.blur()
        }
      }  /*else if (event.ctrlKey && (event.key === 'Z' || event.key === 'z')) {
        elementHistory.undo()
      }  else if (event.ctrlKey && (event.key === 'Y' || event.key === 'y')) {
        elementHistory.redo()
      }*/
    })

    Emitter.mixin(this)
  }
  init($el, container) {
    super.init($el)
    this._baseEl = $el
    this._container = container

    this._initTpl()
    this._htmlEl = document.documentElement
    this._detail = new Detail(this._$detail, container)
    this.config = this._detail.config
    this._splitMediaQuery = new MediaQuery('screen and (min-width: 680px)')
    this._splitMode = this._splitMediaQuery.isMatch()
    this._domViewer = new LunaDomViewer(this._$domViewer.get(0), {
      node: this._htmlEl,
      ignore: (node) => isErudaEl(node) || isChobitsuEl(node),
    })
    this._domViewer.expand()
    this._bindEvent()
    chobitsu.domain('Overlay').enable()

    nextTick(() => this._updateHistory())
  }
  show() {
    super.show()
    this._isShow = true
    keybindManager.listeners.elements.keyboardListening = true
    if (!this._curNode) {
      this.select(document.body)
    } else if (this._splitMode) {
      this._showDetail()
    }
  }
  hide() {
    super.hide()
    this._isShow = false
    keybindManager.listeners.elements.keyboardListening = false
    chobitsu.domain('Overlay').hideHighlight()
  }
  select(node) {
    this._domViewer.select(node)
    this._setNode(node)
    this.emit('change', node)
    return this
  }
  destroy() {
    super.destroy()
    emitter.off(emitter.SCALE, this._updateScale)
    evalCss.remove(this._style)
    this._detail.destroy()
    chobitsu
      .domain('Overlay')
      .off('inspectNodeRequested', this._inspectNodeRequested)
    chobitsu.domain('Overlay').disable()
    this._splitMediaQuery.removeAllListeners()
  }
  _updateButtons() {
    const $control = this._$control
    const $showDetail = $control.find(c('.show-detail'))
    const $copyNode = $control.find(c('.copy-node'))
    const $deleteNode = $control.find(c('.delete-node'))
    const iconDisabled = c('icon-disabled')

    $showDetail.addClass(iconDisabled)
    $copyNode.addClass(iconDisabled)
    $deleteNode.addClass(iconDisabled)

    const node = this._curNode

    if (!node || isShadowRoot(node)) {
      return
    }

    if (node !== document.documentElement && node !== document.body) {
      $deleteNode.rmClass(iconDisabled)
    }
    $copyNode.rmClass(iconDisabled)

    if (node.nodeType === Node.ELEMENT_NODE) {
      $showDetail.rmClass(iconDisabled)
    }
  }
  _showSplit = () => {
    this._showDetail()
    this._baseEl?.toggleClass(c('split-view'))
  }
  _showDetail = () => {
    if (!this._isShow || !this._curNode) {
      return
    }
    if (this._curNode.nodeType === Node.ELEMENT_NODE) {
      this._detail.show(this._curNode)
    } else {
      this._detail.show(this._curNode.parentNode || this._curNode.host)
    }
  }
  _initTpl() {
    const $el = this._$el

    $el.html(
      c(`<div class="elements">
        <div class="control">
          <span class="icon icon-select select"></span>
          <span class="icon icon-eye show-detail"></span>
          <span class="icon icon-caret-down show-split"></span>
          <span class="icon icon-play edit-node"></span>
          <span class="icon icon-copy copy-node"></span>
          <span class="icon icon-delete delete-node"></span>
        </div>
        <div class="dom-viewer-container">
          <div class="dom-viewer"></div>
        </div>
        <div class="crumbs"></div>
      </div>
      <div class="detail"></div>
      <div class="logs-container"></div>
      <div class="element-input hidden">
        <div class="element-buttons">
          <div class="button element-cancel">Cancel</div>
          <div class="button element-execute">Execute</div>
        </div>
        <textarea class="element-text"></textarea>
      </div>`)
    )

    this._$detail = $el.find(c('.detail'))
    this._$domViewer = $el.find(c('.dom-viewer'))
    this._$control = $el.find(c('.control'))
    this._$crumbs = $el.find(c('.crumbs'))
    this._$container = $el.find(c('.elements'))
    this._$inputContainer = $el.find(c('.element-input'))
    this._$textarea = $el.find(c('.element-text'))
  }
  _renderCrumbs() {
    const crumbs = getCrumbs(this._curNode)
    let html = ''
    if (!isEmpty(crumbs)) {
      html = map(crumbs, ({ text, idx }) => {
        return `<li class="${c('crumb')}" data-idx="${idx}">${text}</div></li>`
      }).join('')
    }
    this._$crumbs.html(html)
  }
  _back = () => {
    if (this._curNode === this._htmlEl) return

    const parentQueue = this._curParentQueue
    let parent = parentQueue.shift()

    while (!isElExist(parent)) {
      parent = parentQueue.shift()
    }

    this._setNode(parent)
  }
  _toggleLSInput() {
    this._$inputContainer.toggleClass(c('hidden'))
    this._$container.toggleClass(c('hidden'))
    this._$detail.toggleClass(c('hidden'))
  }
  _changeElement() {
    if (this._curNode) {
      this._curNode.outerHTML = this._$textarea.val()
      this._toggleLSInput()
    }
  }
  _bindEvent() {
    const self = this

    this._$el.on('click', c('.crumb'), function () {
      let idx = toNum($(this).data('idx'))
      let node = self._curNode

      while (idx-- && node.parentElement) {
        node = node.parentElement
      }

      if (isElExist(node)) {
        self.select(node)
      }
    })
    .on('click', c('.element-cancel'), () => {
      this._toggleLSInput()
    })
    .on('click', c('.element-execute'), () => {
      this._changeElement()
    })

    this._$control
      .on('click', c('.select'), this._toggleSelect)
      .on('click', c('.show-detail'), this._showDetail)
      .on('click', c('.show-split'), this._showSplit)
      .on('click', c('.copy-node'), this._copyNode)
      .on('click', c('.delete-node'), this._deleteNode)
      .on('click', c('.edit-node'), () => {
        if (this._curNode.tagName !== 'BODY' && this._curNode.tagName !== 'HEAD' && this._curNode.tagName !== 'HTML') {
          this._$textarea.val(this._curNode.outerHTML || '')
          this._toggleLSInput()
        }
      })

    this._domViewer.on('select', this._setNode).on('deselect', this._back)

    chobitsu
      .domain('Overlay')
      .on('inspectNodeRequested', this._inspectNodeRequested)

    this._splitMediaQuery.on('match', () => {
      this._splitMode = true
      this._showDetail()
    })
    this._splitMediaQuery.on('unmatch', () => {
      this._splitMode = false
      this._detail.hide()
    })

    emitter.on(emitter.SCALE, this._updateScale)
  }
  _updateScale = (scale) => {
    this._splitMediaQuery.setQuery(`screen and (min-width: ${680 * scale}px)`)
  }
  _deleteNode = () => {
    const node = this._curNode

    if (node.parentNode) {
      node.parentNode.removeChild(node)
    }
  }
  _copyNode = () => {
    const node = this._curNode

    if (node.nodeType === Node.ELEMENT_NODE) {
      copy(node.outerHTML)
    } else {
      copy(node.nodeValue)
    }

    this._container.notify('Copied', { icon: 'success' })
  }
  _toggleSelect = () => {
    this._$el.find(c('.select')).toggleClass(c('active'))
    this._selectElement = !this._selectElement

    if (this._selectElement) {
      chobitsu.domain('Overlay').setInspectMode({
        mode: 'searchForNode',
        highlightConfig: {
          showInfo: true,
          showRulers: true,
          showAccessibilityInfo: true,
          showExtensionLines: true,
          contrastAlgorithm: 'aa',
          contentColor: 'rgba(111, 168, 220, .66)',
          paddingColor: 'rgba(147, 196, 125, .55)',
          borderColor: 'rgba(255, 229, 153, .66)',
          marginColor: 'rgba(246, 178, 107, .66)',
        },
      })
      this._container.hide()
    } else {
      chobitsu.domain('Overlay').setInspectMode({
        mode: 'none',
      })
      chobitsu.domain('Overlay').hideHighlight()
    }
  }
  _inspectNodeRequested = ({ backendNodeId }) => {
    this._container.show()
    this._toggleSelect()
    try {
      const { node } = chobitsu.domain('DOM').getNode({ nodeId: backendNodeId })
      this.select(node)
      /* eslint-disable no-empty */
    } catch (e) {}
  }
  _setNode = (node) => {
    if (node === this._curNode) return

    this._curNode = node
    this._renderCrumbs()

    const parentQueue = []

    let parent = node.parentNode
    while (parent) {
      parentQueue.push(parent)
      parent = parent.parentNode
    }
    this._curParentQueue = parentQueue

    if (this._splitMode) {
      this._showDetail()
    }
    this._updateButtons()
    this._updateHistory()
  }
  _updateHistory() {
    const console = this._container.get('console')
    if (!console) return

    const history = this._history
    history.unshift(this._curNode)
    if (history.length > 5) history.pop()
    for (let i = 0; i < 5; i++) {
      console.setGlobal(`$${i}`, history[i])
    }
  }
}

const isElExist = (val) => isEl(val) && val.parentNode

function getCrumbs(el) {
  const ret = []
  let i = 0

  while (el) {
    ret.push({
      text: formatNodeName(el, { noAttr: true }),
      idx: i++,
    })

    if (isShadowRoot(el)) {
      el = el.host
    }
    if (!el.parentElement && isShadowRoot(el.parentNode)) {
      el = el.parentNode
    } else {
      el = el.parentElement
    }
  }

  return ret.reverse()
}
