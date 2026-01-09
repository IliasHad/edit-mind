import { DecoratorNode, type SerializedLexicalNode } from 'lexical'

export type SerializedFaceMentionNode = {
  id: string
  name: string
  thumbnailUrl?: string
  type: 'face-mention'
} & SerializedLexicalNode

export class FaceMentionNode extends DecoratorNode<null> {
  __id: string
  __name: string
  __image?: string

  static getType() {
    return 'face-mention'
  }

  static clone(node: FaceMentionNode) {
    return new FaceMentionNode(node.__id, node.__name, node.__image, node.__key)
  }

  constructor(id: string, name: string, thumbnailUrl?: string, key?: string) {
    super(key)
    this.__id = id
    this.__name = name
    this.__image = thumbnailUrl
  }

  createDOM() {
    const span = document.createElement('span')
    span.className =
      'inline-flex items-center gap-1.5 px-2 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-medium'

    const avatar = document.createElement('div')
    avatar.className = 'w-3 h-3 rounded-full shrink-0 bg-gradient-to-br from-purple-500 to-indigo-500 overflow-hidden'

    if (this.__image) {
      const img = document.createElement('img')
      img.src = `/faces/${this.__image}`
      img.alt = this.__name
      img.className = 'w-full h-full object-cover'
      avatar.appendChild(img)
    } else {
      avatar.className += ' flex items-center justify-center text-white text-xs font-semibold'
      avatar.textContent = this.__name.charAt(0).toUpperCase()
    }

    const text = document.createElement('span')
    text.textContent = `@${this.__name}`

    span.appendChild(avatar)
    span.appendChild(text)

    return span
  }

  updateDOM() {
    return false
  }

  exportJSON(): SerializedFaceMentionNode {
    return {
      type: 'face-mention',
      id: this.__id,
      name: this.__name,
      thumbnailUrl: this.__image,
      version: 1,
    }
  }

  static importJSON(serialized: SerializedFaceMentionNode) {
    return new FaceMentionNode(serialized.id, serialized.name, serialized.thumbnailUrl)
  }
}
