class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

class LRUCache {
  constructor(capacity = 50) {
    this.capacity = capacity;
    this.cache = new Map();
    this.head = new Node(null, null);
    this.tail = new Node(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToHead(node) {
    node.next = this.head.next;
    node.next.prev = node;
    this.head.next = node;
    node.prev = this.head;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const node = this.cache.get(key);
    this._remove(node);
    this._moveToHead(node);
    return node.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this._remove(node);
      this._moveToHead(node);
    } else {
      if (this.cache.size >= this.capacity) {
        const lruNode = this.tail.prev;
        this.cache.delete(lruNode.key);
        this._remove(lruNode);
      }
      const newNode = new Node(key, value);
      this.cache.set(key, newNode);
      this._moveToHead(newNode);
    }
  }

  invalidate(key) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      this._remove(node);
      this.cache.delete(key);
    }
  }
}

// Export a single, global instance
module.exports = new LRUCache(50);
