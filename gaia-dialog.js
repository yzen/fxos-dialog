;(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Extend from the `HTMLElement` prototype
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);
var removeAttribute = proto.removeAttribute;
var setAttribute = proto.setAttribute;
var has = Object.prototype.hasOwnProperty;

/**
 * Runs when an instance of `GaiaTabs`
 * is first created.
 *
 * The initial value of the `select` attribute
 * is used to select a tab.
 *
 * @private
 */
proto.createdCallback = function() {
  this.createShadowRoot().innerHTML = template;

  this.els = {
    inner: this.shadowRoot.querySelector('.inner'),
    background: this.shadowRoot.querySelector('.background'),
    window: this.shadowRoot.querySelector('.window')
  };

  this.setupAnimationListeners();
  this.styleHack();
};

proto.setupAnimationListeners = function() {
  this.addEventListener('animationstart', this.onAnimationStart.bind(this));
  this.addEventListener('animationend', this.onAnimationEnd.bind(this));
};

proto.styleHack = function() {
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('shadow-content', 'shadow-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

proto.open = function(options) {
  if (this.isOpen) { return; }
  this.animateIn(options);
  this.isOpen = true;
  this.setAttribute('opened', '');
  this.dispatch('opened');
};

proto.close = function(options) {
  if (!this.isOpen) { return; }
  this.animateOut();
  this.isOpen = false;
  this.removeAttribute('opened');
  this.dispatch('closed');
};

proto.attributeChangedCallback = function(name, from, to) {
  if (this.attrs[name]) { this[name] = to; }
};

proto.setAttribute = function(attr, value) {
  this.els.inner.setAttribute(attr, value);
  setAttribute.call(this, attr, value);
};

proto.removeAttribute = function(attr) {
  this.els.inner.removeAttribute(attr);
  removeAttribute.call(this, attr);
};

proto.animateIn = function(e) {
  var hasTarget = e && ('clientX' in e || e.touches);
  if (hasTarget) { return  this.animateInFromTarget(e); }

  var self = this;
  this.dispatch('animationstart');
  this.els.background.classList.add('animate-in');
  this.els.background.addEventListener('animationend', function fn() {
    self.els.background.removeEventListener('animationend', fn);
    self.els.window.classList.add('animate-in');
    self.dispatch('animationend');
  });
};

proto.animateInFromTarget = function(e) {
  var pos = e.touches && e.touches[0] || e;
  var scale = Math.max(window.innerWidth, window.innerHeight) / 20 * 1.2;
  var background = this.els.background;
  var end = 'transitionend';
  var self = this;

  background.style.transform = 'translate(' + pos.clientX + 'px, ' + pos.clientY + 'px)';
  background.style.transitionDuration = '400ms';
  background.classList.add('circular');

  setTimeout(function() {
    background.style.transform += ' scale(' + scale + ')';
    background.style.opacity = 1;
    self.dispatch('animationstart');

    background.addEventListener(end, function fn() {
      background.removeEventListener(end, fn);
      self.els.window.classList.add('animate-in');
      self.dispatch('animationend');
    });
  });
};

proto.animateOut = function() {
  var end = 'animationend';
  var background = this.els.background;
  var self = this;
  var classes = {
    el: this.classList,
    window: this.els.window.classList,
    background: this.els.background.classList
  };

  this.dispatch('animationstart');
  classes.window.add('animate-out');

  this.els.window.addEventListener(end, function fn(e) {
    self.els.window.removeEventListener(end, fn);
    e.stopPropagation();
    classes.background.add('animate-out');
    self.els.background.addEventListener(end, function fn() {
      self.els.background.removeEventListener(end, fn);
      classes.window.remove('animate-out', 'animate-in');
      classes.background.remove('animate-out', 'animate-in');
      background.classList.remove('circular');
      background.style = '';
      self.dispatch('animationend');
    });
  });
};

proto.onAnimationStart = function() {
  this.classList.add('animating');
};

proto.onAnimationEnd = function() {
  this.classList.remove('animating');
};

proto.dispatch = function(name) {
  this.dispatchEvent(new CustomEvent(name));
};

proto.attrs = {
  opened: {
    get: function() { return !!this.isOpen; },
    set: function(value) {
      value = value === '' || value;
      if (!value) { this.close(); }
      else { this.open(); }
    }
  }
};

Object.defineProperties(proto, proto.attrs);

var template = `
<style>

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  border: 0;
}

.shadow-host {
  display: none;
  position: fixed;
  top: 0px; left: 0px;
  width: 100%;
  height: 100%;
  z-index: 200;
  font-style: italic;
  text-align: center;
}

.shadow-host[opened],
.shadow-host.animating {
  display: block;
}

/** Inner
 ---------------------------------------------------------*/

.inner {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

/** Background
 ---------------------------------------------------------*/

.background {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  background: rgba(199,199,199,0.85);
}

.background.circular {
  width: 40px;
  height: 40px;
  margin: -20px;
  border-radius: 50%;
  will-change: transform;
  transition-property: opacity, transform;
  transition-timing-function: linear;
}

.background.animate-in {
  animation-name: gaia-dialog-fade-in;
  animation-duration: 300ms;
  animation-fill-mode: forwards;
}

.background.animate-out {
  animation-name: gaia-dialog-fade-out;
  animation-delay: 300ms;
  animation-duration: 300ms;
  animation-fill-mode: forwards;
  opacity: 1;
}

/** Window
 ---------------------------------------------------------*/

.window {
  position: relative;
  width: 90%;
  max-width: 350px;
  margin: auto;
  box-shadow: 0 1px 0 0px rgba(0,0,0,0.15);
  background: var(--color-iota);
  opacity: 0;
}

.window.animate-in {
  animation-name: gaia-dialog-entrance;
  animation-duration: 300ms;
  animation-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
  animation-fill-mode: forwards
}

.window.animate-out {
  animation-name: gaia-dialog-fade-out;
  animation-duration: 200ms;
  animation-delay: 100ms;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  opacity: 1;
}

/** Section
 ---------------------------------------------------------*/

.shadow-content section {
  padding: 33px 16px;
  color: #858585;
}

/** Buttons
 ---------------------------------------------------------*/

.shadow-content button {
  position: relative;
  display: block;
  width: 100%;
  height: 50px;
  margin: 0;
  border: 0;
  padding: 0rem 25px;
  font: inherit;
  background: var(--color-beta);
  color: var(--color-epsilon);
  transition: all 200ms;
  transition-delay: 300ms;
}

.shadow-content button:after {
  content: '';
  display: block;
  position: absolute;
  height: 1px;
  left: 6px;
  right: 6px;
  top: 49px;
  background: #E7E7E7;
}

.shadow-content button:last-of-type:after {
  display: none;
}

.shadow-content button:active {
  background-color: var(--highlight-color);
  color: #fff;
  transition: none;
}

.shadow-content button:active:after {
  background: var(--highlight-color);
  transition: none;
}

/** Fieldset (button group)
 ---------------------------------------------------------*/

.shadow-content fieldset {
  overflow: hidden;
}

.shadow-content fieldset button {
  position: relative;
  float: left;
  width: 50%;
}

.shadow-content fieldset button:after {
  content: '';
  display: block;
  position: absolute;
  top: 6px;
  bottom: 6px;
  right: 0px;
  left: auto;
  width: 1px;
  height: calc(100% - 12px);
  background: #e7e7e7;
  transition: all 200ms;
  transition-delay: 200ms;
}

</style>

<div class="inner">
  <div class="background"></div>
  <div class="window"><content></content></div>
</div>`;

var animations = `
@keyframes gaia-dialog-entrance {
  0% {
    opacity: 0;
    transform: translateY(100px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
}

@keyframes gaia-dialog-fade-in {
  0% { opacity: 0 }
  100% { opacity: 1 }
}

@keyframes gaia-dialog-fade-out {
  0% { opacity: 1 }
  100% { opacity: 0 }
}`;

(function() {
  var style = document.createElement('style');
  style.innerHTML = animations;
  document.head.appendChild(style);
})();

// Register and expose the constructor
module.exports = document.registerElement('gaia-dialog', { prototype: proto });
module.exports.proto = proto;


module.exports.extend = function() {
  return mixin(Object.create(proto), extended);
};

var extended = {
  onCreated: function() {
    var self = this;

    this.createShadowRoot().innerHTML = this.template;
    this.els = { dialog: this.shadowRoot.querySelector('gaia-dialog') };
    this.setupAnimationListeners();
    this.styleHack();

    this.els.dialog.addEventListener('opened', function() {
      setAttribute.call(self, 'opened', '');
    });

    this.els.dialog.addEventListener('closed', function() {
      removeAttribute.call(self, 'opened');
    });
  },

  open: function(e) {
    this.els.dialog.open(e);
  },

  close: function() {
    this.els.dialog.close();
  },

  setAttribute: function(attr, value) {
    this.els.dialog.setAttribute(attr, value);
    setAttribute.call(this, attr, value);
  },

  removeAttribute: function(attr) {
    this.els.dialog.removeAttribute(attr);
    removeAttribute.call(this, attr);
  }
};

function mixin(a, b) {
  for (var key in b) { a[key] = b[key]; }
  return a;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog',this));