YUI.add("gallery-node-optimizations",function(e){var c=/\.([-_a-z0-9]+)/i;var a=/[a-z]+/i;var b=e.Node.prototype.ancestor;e.Node.prototype.ancestor=function(g,h){if(e.Lang.isString(g)){var f=c.exec(g);if(f&&f.length){return this.getAncestorByClassName(f[1],h);}if(a.test(g)){return this.getAncestorByTagName(g,h);}}return b(g,h);};e.Node.prototype.getAncestorByClassName=function(g,f){var h=this._node;if(!f){h=h.parentNode;}while(h&&!e.DOM.hasClass(h,g)){h=h.parentNode;if(!h||!h.tagName){return null;}}return e.one(h);};e.Node.prototype.getAncestorByTagName=function(h,f){var g=this._node;if(!f){g=g.parentNode;}h=h.toLowerCase();while(g&&g.tagName.toLowerCase()!=h){g=g.parentNode;if(!g||!g.tagName){return null;}}return e.one(g);};var d=e.Node.prototype.all;e.Node.prototype.all=function(g){if(e.Lang.isString(g)){var f=c.exec(g);if(f&&f.length){return this.getElementsByClassName(f[1]);}if(a.test(g)){return this.getElementsByTagName(g);}}return d(g);};e.Node.prototype.getElementsByClassName=function(j,l){var m=this.getElementsByTagName(l||"*");var h=null;var g=m.size();for(var f=0;f<g;f++){var k=m.item(f);if(e.DOM.hasClass(e.Node.getDOMNode(k),j)){if(!h){h=new e.NodeList(k);}else{h.push(k);}}}if(!h){h=new e.NodeList("#surely-this-cannot-possibly-exist-on-your-page");}return h;};},"gallery-2011.04.13-22-38",{requires:["node-base"]});