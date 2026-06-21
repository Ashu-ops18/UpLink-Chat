class Node {
  constructor(contact) {
    this.contact = contact; // Full user object from DB
    this.key = contact._id; // Sorted by ID string
    this.left = null;
    this.right = null;
    this.parent = null;
  }
}

export default class SplayTree {
  constructor() {
    this.root = null;
  }

  // Helpers for tree rebalancing
  _leftRotate(x) {
    let y = x.right;
    x.right = y.left;
    if (y.left != null) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent == null) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  _rightRotate(x) {
    let y = x.left;
    x.left = y.right;
    if (y.right != null) y.right.parent = x;
    y.parent = x.parent;
    if (x.parent == null) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }

  // Pulls a specific node to the root.
  // We use this to keep active chats at the top of the tree for faster lookups.
  _splay(x) {
    while (x.parent != null) {
      if (x.parent.parent == null) {
        if (x === x.parent.left) this._rightRotate(x.parent);
        else this._leftRotate(x.parent);
      } else if (x === x.parent.left && x.parent === x.parent.parent.left) {
        this._rightRotate(x.parent.parent);
        this._rightRotate(x.parent);
      } else if (x === x.parent.right && x.parent === x.parent.parent.right) {
        this._leftRotate(x.parent.parent);
        this._leftRotate(x.parent);
      } else if (x === x.parent.right && x.parent === x.parent.parent.left) {
        this._leftRotate(x.parent);
        this._rightRotate(x.parent);
      } else {
        this._rightRotate(x.parent);
        this._leftRotate(x.parent);
      }
    }
  }

  insert(contact) {
    let node = new Node(contact);
    let y = null;
    let x = this.root;

    while (x != null) {
      y = x;
      if (node.key < x.key) x = x.left;
      else x = x.right;
    }

    node.parent = y;
    if (y == null) this.root = node;
    else if (node.key < y.key) y.left = node;
    else y.right = node;

    // Pull to root immediately since we'll likely need it right away
    this._splay(node);
  }

  access(key) {
    let node = this.root;
    let target = null;

    while (node != null) {
      if (key === node.key) {
        target = node;
        break;
      }
      if (key < node.key) node = node.left;
      else node = node.right;
    }

    // Found them. Pull to root so the next message from them processes instantly.
    if (target != null) {
      this._splay(target);
    }

    return target;
  }
}
