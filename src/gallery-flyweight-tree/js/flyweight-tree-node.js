/**
* An implementation of the flyweight pattern.  
* This object can be slid on top of a literal object containing the definition 
* of a tree and will take its state from that node it is slid upon.
* It relies for most of its functionality on the flyweight manager object,
* which contains most of the code.
* @module gallery-flyweight-tree
*/

/**
* An implementation of the flyweight pattern.  This class should not be instantiated directly.
* Instances of this class can be requested from the flyweight manager class
* @class FlyweightTreeNode
* @extends Base
* @constructor  Do not instantiate directly.
*/
FWNode = Y.Base.create(
	'flyweight-tree-node',
	Y.Base,
	[],
	{
		/**
		 * Reference to the node in the configuration tree it has been slid over.
		 * @property _node
		 * @type {Object}
		 * @private
		 **/
		_node:null,
		/**
		 * Reference to the FlyweightTreeManager instance this node belongs to.
		 * It is set by the root and should be considered read-only.
		 * @property _root
		 * @type FlyweightTreeManager
		 * @private
		 */
		_root: null,
		/**
		 * Returns a string with the markup for this node along that of its children
		 * produced from its attributes rendered
		 * via the first template string it finds in these locations:
		 *
		 * * It's own {{#crossLink "template"}}{{/crossLink}} configuration attribute
		 * * The static {{#crossLink "FlyweightTreeNode/TEMPLATE"}}{{/crossLink}} class property
		 *
		 * @method _getHTML
		 * @param index {Integer} index of this node within the array of siblings
		 * @param nSiblings {Integer} number of siblings including this node
		 * @param depth {Integer} number of levels to the root
		 * @return {String} markup generated by this node
		 * @protected
		 */
		_getHTML: function(index, nSiblings, depth) {
			// assumes that if you asked for the HTML it is because you are rendering it
			var self = this,
				node = this._node,
				attrs = this.getAttrs(),
				s = '', 
				templ = node.template,
				childCount = node.children && node.children.length,
				nodeClasses = [CNAME_NODE],
				superConstructor = this.constructor;
				
			while (!templ) {
				templ = superConstructor.TEMPLATE;
				superConstructor = superConstructor.superclass.constructor;
				
			}

			node._rendered = true;
			if (childCount) {
				if (attrs.expanded) {
					node._childrenRendered = true;
					this.forSomeChildren( function (fwNode, index, array) {
						s += fwNode._getHTML(index, array.length, depth+1);
					});
					nodeClasses.push(CNAME_EXPANDED);
				} else {
					nodeClasses.push(CNAME_COLLAPSED);
				}
			} else {
				if (this._root.get('dynamicLoader') && !node.isLeaf) {
					nodeClasses.push(CNAME_COLLAPSED);
				} else {
					nodeClasses.push(CNAME_NOCHILDREN);
				}
			}
			if (index === 0) {
				nodeClasses.push(CNAME_FIRSTCHILD);
			} 
			if (index === nSiblings - 1) {
				nodeClasses.push(CNAME_LASTCHILD);
			}
			attrs.children = s;
			attrs.cname_node = nodeClasses.join(' ');
			attrs.cname_children = CNAME_CHILDREN;

			return Lang.sub(templ, attrs);

		},
		/**
		 * Method to slide this instance on top of another node in the configuration object
		 * @method _slideTo
		 * @param node {Object} node in the underlying configuration tree to slide this object on top of.
		 * @private
		 */
		_slideTo: function (node) {
			this._node = node;
			this._stateProxy = node;
		},
		/**
		 * Executes the given function on each of the child nodes of this node.
		 * @method forSomeChildren
		 * @param fn {Function} Function to be executed on each node
		 *		@param fn.child {FlyweightTreeNode} Instance of a suitable subclass of FlyweightTreeNode, 
		 *		positioned on top of the child node
		 *		@param fn.index {Integer} Index of this child within the array of children
		 *		@param fn.array {Array} array containing itself and its siblings
		 * @param scope {object} The falue of this for the function.  Defaults to the parent.
		**/
		forSomeChildren: function(fn, scope) {
			var root = this._root,
				children = this._node.children,
				child, ret;
			scope = scope || this;
			if (children && children.length) {
				YArray.some(children, function (node, index, array) {
					child = root._poolFetch(node);
					ret = fn.call(scope, child, index, array);
					root._poolReturn(child);
					return ret;
				});
			}
		},
		/**
		 * Getter for the expanded configuration attribute.
		 * It is meant to be overriden by the developer.
		 * The supplied version defaults to true if the expanded property 
		 * is not set in the underlying configuration tree.
		 * It can be overriden to default to false.
		 * @method _expandedGetter
		 * @return {Boolean} The expanded state of the node.
		 * @protected
		 */
		_expandedGetter: function () {
			return this._node.expanded !== false;
		},
		/**
		 * Setter for the expanded configuration attribute.
		 * It renders the child nodes if this branch has never been expanded.
		 * Then sets the className on the node to the static constants 
		 * CNAME_COLLAPSED or CNAME_EXPANDED from Y.FlyweightTreeManager
		 * @method _expandedSetter
		 * @param value {Boolean} new value for the expanded attribute
		 * @private
		 */
		_expandedSetter: function (value) {
			var self = this,
				node = self._node,
				root = self._root,
				el = Y.one('#' + node.id),
				dynLoader = root.get('dynamicLoader');
				
			node.expanded = value = !!value;
			if (dynLoader && !node.isLeaf && (!node.children  || !node.children.length)) {
				this._loadDynamic();
				return;
			}
			if (node.children && node.children.length) {
				if (value) {
					if (!node._childrenRendered) {
						self._renderChildren();
					}
					el.replaceClass(CNAME_COLLAPSED, CNAME_EXPANDED);
				} else {
					el.replaceClass(CNAME_EXPANDED, CNAME_COLLAPSED);
				}
			}
		},
		/**
		 * Triggers the dynamic loading of children for this node.
		 * @method _loadDynamic
		 * @private
		 */
		_loadDynamic: function () {
			var self = this,
				root = self._root;
			Y.one('#' + this.get('id')).replaceClass(CNAME_COLLAPSED, CNAME_LOADING);
			root.get('dynamicLoader').call(root, self, Y.bind(self._dynamicLoadReturn, self));
			
		},
		/**
		 * Callback for the dynamicLoader method.
		 * @method _dynamicLoadReturn
		 * @param response {Array} array of child nodes 
		 * @private
		 */
		_dynamicLoadReturn: function (response) {
			var self = this,
				node = self._node,
				root = self._root;

			if (response) {

				node.children = response;
				root._initNodes(node);
				self._renderChildren();
			} else {
				node.isLeaf = true;
			}
			// isLeaf might have been set in the response, not just in the line above.
			Y.one('#' + node.id).replaceClass(CNAME_LOADING, (node.isLeaf?CNAME_NOCHILDREN:CNAME_EXPANDED));
		},
		/**
		 * Renders the children of this node.  
		 * It the children had been rendered, they will be replaced.
		 * @method _renderChildren
		 * @private
		 */
		_renderChildren: function () {
			var s = '',
				node = this._node,
				depth = this.get('depth');
			node._childrenRendered = true;
			this.forSomeChildren(function (fwNode, index, array) {
				s += fwNode._getHTML(index, array.length, depth + 1);
			});
			Y.one('#' + node.id + ' .' + CNAME_CHILDREN).setContent(s);
		},
		/**
		 * Prevents this instance from being returned to the pool and reused.
		 * Remember to {{#crossLink "release"}}{{/crossLink}} this instance when no longer needed.
		 * @method hold
		 * @chainable
		 */
		hold: function () {
			return (this._node._held = this);
		},
		/**
		 * Allows this instance to be returned to the pool and reused.
		 * 
		 * __Important__: This instance should not be used after being released
		 * @method release
		 * @chainable
		 */
		release: function () {
			this._node._held = null;
			this._root._poolReturn(this);
			return this;
		},
		/**
		 * Returns the parent node for this node or null if none exists.
		 * The copy is not on {{#crossLink "hold"}}{{/crossLink}}.  
		 * Remember to release the copy to the pool when done.
		 * @method getParent
		 * @return FlyweightTreeNode
		 */
		getParent: function() {
			var node = this._node._parent;
			return (node?this._root._poolFetch(node):null);
		},
		/**
		 * Returns the next sibling node for this node or null if none exists.
		 * The copy is not on {{#crossLink "hold"}}{{/crossLink}}.  
		 * Remember to release the copy to the pool when done.
		 * @method getNextSibling
		 * @return FlyweightTreeNode
		 */
		getNextSibling: function() {
			var parent = this._node._parent,
				siblings = (parent && parent.children) || [],
				index = siblings.indexOf(this) + 1;
			if (index === 0 || index > siblings.length) {
				return null;
			}
			return this._root._poolFetch(siblings[index]);
		},
		/**
		 * Returns the previous sibling node for this node or null if none exists.
		 * The copy is not on {{#crossLink "hold"}}{{/crossLink}}.  
		 * Remember to release the copy to the pool when done.
		 * @method getPreviousSibling
		 * @return FlyweightTreeNode
		 */
		getPreviousSibling: function() {
			var parent = this._node._parent,
				siblings = (parent && parent.children) || [],
				index = siblings.indexOf(this) - 1;
			if (index < 0) {
				return null;
			}
			return this._root._poolFetch(siblings[index]);
		},
		
		/**
		 * Sugar method to toggle the expanded state of the node.
		 * @method toggle
		 * @chainable
		 */
		toggle: function() {
			this.set('expanded', !this.get('expanded'));
			return this;
		},
		/**
		 * Returns true if this node is the root node
		 * @method isRoot
		 * @return {Boolean} true if root node
		 */
		isRoot: function() {
			return this._root._tree === this._node;
		},
		/**
		* Gets the stored value for the attribute, from either the
		* internal state object, or the state proxy if it exits
		*
		* @method _getStateVal
		* @private
		* @param {String} name The name of the attribute
		* @return {Any} The stored value of the attribute
		*/
		_getStateVal : function(name) {
			var node = this._node;
			if (this._state.get(name, BYPASS_PROXY) || !node) {
				return this._state.get(name, VALUE);
			}
			if (node.hasOwnProperty(name)) {
				return node[name];
			}
			return this._state.get(name, VALUE);
		},

		/**
		* Sets the stored value for the attribute, in either the
		* internal state object, or the state proxy if it exits
		*
		* @method _setStateVal
		* @private
		* @param {String} name The name of the attribute
		* @param {Any} value The value of the attribute
		*/
		_setStateVal : function(name, value) {
			var node = this._node;
			if (this._state.get(name, BYPASS_PROXY) || this._state.get(name, 'initializing') || !node) {
				this._state.add(name, VALUE, value);
			} else {
				node[name] = value;
			}
		}
	},
	{
		/**
		 * Template string to be used to render this node.
		 * It should be overriden by the subclass.
		 *    
		 * It contains the HTML markup for this node plus placeholders,
		 * enclosed in curly braces, that have access to any of the 
		 * configuration attributes of this node plus the following
		 * additional placeholders:
		 * 
		 * * children: The markup for the children of this node will be placed here
		 * * cname_node: The className for the HTML element enclosing this node.
		 *   The template should always use this className to help it locate the DOM element for this node.
		 * * cname_children: The className for the HTML element enclosing the children of this node.
		 * The template should always use this className to help it locate the DOM element that contains the children of this node.
		 * 
		 * The template should also add the `id` attribute to the DOM Element representing this node. 
		 * @property TEMPLATE
		 * @type {String}
		 * @default '<div id="{id}" class="{cname_node}"><div class="content">{label}</div><div class="{cname_children}">{children}</div></div>'
		 * @static
		 */
		TEMPLATE: '<div id="{id}" class="{cname_node}"><div class="content">{label}</div><div class="{cname_children}">{children}</div></div>',
		/**
		 * CCS className constant to use as the class name for the DOM element representing the node.
		 * @property CNAME_NODE
		 * @type String
		 * @static
		 */
		CNAME_NODE: CNAME_NODE,
		/**
		 * CCS className constant to use as the class name for the DOM element that will containe the children of this node.
		 * @property CNAME_CHILDREN
		 * @type String
		 * @static
		 */
		CNAME_CHILDREN: CNAME_CHILDREN,
		/**
		 * CCS className constant added to the DOM element for this node when its state is not expanded.
		 * @property CNAME_COLLAPSED
		 * @type String
		 * @static
		 */
		CNAME_COLLAPSED: CNAME_COLLAPSED,
		/**
		 * CCS className constant added to the DOM element for this node when its state is expanded.
		 * @property CNAME_EXPANDED
		 * @type String
		 * @static
		 */
		CNAME_EXPANDED: CNAME_EXPANDED,
		/**
		 * CCS className constant added to the DOM element for this node when it has no children.
		 * @property CNAME_NOCHILDREN
		 * @type String
		 * @static
		 */
		CNAME_NOCHILDREN: CNAME_NOCHILDREN,
		/**
		 * CCS className constant added to the DOM element for this node when it is the first in the group.
		 * @property CNAME_FIRSTCHILD
		 * @type String
		 * @static
		 */
		CNAME_FIRSTCHILD: CNAME_FIRSTCHILD,
		/**
		 * CCS className constant added to the DOM element for this node when it is the last in the group.
		 * @property CNAME_LASTCHILD
		 * @type String
		 * @static
		 */
		CNAME_LASTCHILD: CNAME_LASTCHILD,
		/**
		 * CCS className constant added to the DOM element for this node when dynamically loading its children.
		 * @property CNAME_LOADING
		 * @type String
		 * @static
		 */
		CNAME_LOADING: CNAME_LOADING,
		ATTRS: {
			/**
			 * Reference to the FlyweightTreeManager this node belongs to
			 * @attribute root
			 * @type {FlyweightTreeManager}
			 * @readOnly
			 * 
			 */

			root: {
				_bypassProxy: true,
				readOnly: true,
				getter: function() {
					return this._root;
				}
			},

			/**
			 * Template to use on this particular instance.  
			 * The renderer will default to the static TEMPLATE property of this class 
			 * (the preferred way) or the nodeTemplate configuration attribute of the root.
			 * See the TEMPLATE static property.
			 * @attribute template
			 * @type {String}
			 * @default undefined
			 */
			template: {
				validator: Lang.isString
			},
			/**
			 * Label for this node. Nodes usually have some textual content, this is the place for it.
			 * @attribute label
			 * @type {String}
			 * @default ''
			 */
			label: {
				validator: Lang.isString,
				value: ''
			},
			/**
			 * Id to assign to the DOM element that contains this node.  
			 * If none was supplied, it will generate one
			 * @attribute id
			 * @type {Identifier}
			 * @default guid()
			 * @readOnly
			 */
			id: {
				readOnly: true
			},
			/**
			 * Returns the depth of this node from the root.
			 * This is calculated on-the-fly.
			 * @attribute depth
			 * @type Integer
			 * @readOnly
			 */
			depth: {
				_bypassProxy: true,
				readOnly: true,
				getter: function () {
					var count = 0, 
						node = this._node;
					while (node._parent) {
						count += 1;
						node = node._parent;
					}
					return count-1;
				}
			},
			/**
			 * Expanded state of this node.
			 * @attribute expanded
			 * @type Boolean
			 * @default true
			 */
			expanded: {
				_bypassProxy: true,
				getter: '_expandedGetter',
				setter: '_expandedSetter'
			}
		}
	}
);
Y.FlyweightTreeNode = FWNode;

