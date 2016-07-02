/**
 * Hover balloon on elements without css and images.
 *
 * Copyright (c) 2011 Hayato Takenaka
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 * @author: Hayato Takenaka (https://urin.github.io)
 * @version: 1.0.3 - 2016/07/02
**/
(function($) {
  //-----------------------------------------------------------------------------
  // Private
  //-----------------------------------------------------------------------------
  // Helper for meta programming
  const Meta = {
    pos: $.extend(['top', 'bottom', 'left', 'right'], {camel: ['Top', 'Bottom', 'Left', 'Right']}),
    size: $.extend(['height', 'width'], {camel: ['Height', 'Width']}),
    getRelativeNames: function(position) {
      const idx = {
        pos: {
          o: position,                                           // origin
          f: (position % 2 === 0) ? position + 1 : position - 1, // faced
          p1: (position % 2 === 0) ? position : position - 1,
          p2: (position % 2 === 0) ? position + 1 : position,
          c1: (position < 2) ? 2 : 0,
          c2: (position < 2) ? 3 : 1
        },
        size: {
          p: (position < 2) ? 0 : 1, // parallel
          c: (position < 2) ? 1 : 0  // cross
        }
      };
      const names = {};
      for(var m1 in idx) {
        if(!names[m1]) { names[m1] = {}; }
        for(var m2 in idx[m1]) {
          names[m1][m2] = Meta[m1][idx[m1][m2]];
          if(!names.camel) { names.camel = {}; }
          if(!names.camel[m1]) { names.camel[m1] = {}; }
          names.camel[m1][m2] = Meta[m1].camel[idx[m1][m2]];
        }
      }
      names.isTopLeft = (names.pos.o === names.pos.p1);
      return names;
    }
  };

  // Helper class to handle position and size as numerical pixels.
  function NumericalBoxElement() { this.initialize.apply(this, arguments); }
  (function() {
    // Method factories
    const Methods = {
      setBorder: function(pos, isVertical) {
        return function(value) {
          this.$.css('border-' + pos.toLowerCase() + '-width', value + 'px');
          this['border' + pos] = value;
          return (this.isActive) ? digitalize(this, isVertical) : this;
        }
      },
      setPosition: function(pos, isVertical) {
        return function(value) {
          this.$.css(pos.toLowerCase(), value + 'px');
          this[pos.toLowerCase()] = value;
          return (this.isActive) ? digitalize(this, isVertical) : this;
        }
      }
    };

    NumericalBoxElement.prototype = {
      initialize: function($element) {
        this.$ = $element;
        $.extend(true, this, this.$.offset(), {center: {}, inner: {center: {}}});
        for(var i = 0; i < Meta.pos.length; i++) {
          this['border' + Meta.pos.camel[i]] = parseInt(this.$.css('border-' + Meta.pos[i] + '-width')) || 0;
        }
        this.active();
      },
      active: function() { this.isActive = true; digitalize(this); return this; },
      inactive: function() { this.isActive = false; return this; }
    };
    for(var i = 0; i < Meta.pos.length; i++) {
      NumericalBoxElement.prototype['setBorder' + Meta.pos.camel[i]] = Methods.setBorder(Meta.pos.camel[i], (i < 2));
      if(i % 2 === 0) {
        NumericalBoxElement.prototype['set' + Meta.pos.camel[i]] = Methods.setPosition(Meta.pos.camel[i], (i < 2));
      }
    }

    function digitalize(box, isVertical) {
      if(isVertical == null) { digitalize(box, true); return digitalize(box, false); }
      const m = Meta.getRelativeNames((isVertical) ? 0 : 2);
      box[m.size.p] = box.$['outer' + m.camel.size.p]();
      box[m.pos.f] = box[m.pos.o] + box[m.size.p];
      box.center[m.pos.o] = box[m.pos.o] + box[m.size.p] / 2;
      box.inner[m.pos.o] = box[m.pos.o] + box['border' + m.camel.pos.o];
      box.inner[m.size.p] = box.$['inner' + m.camel.size.p]();
      box.inner[m.pos.f] = box.inner[m.pos.o] + box.inner[m.size.p];
      box.inner.center[m.pos.o] = box.inner[m.pos.f] + box.inner[m.size.p] / 2;
      return box;
    }
  })();

  // Adjust position of balloon body
  function makeupBalloon($target, $balloon, options) {
    $balloon.stop(true, true);
    var outerTip, innerTip;
    const initTipStyle = {position: 'absolute', height: '0', width: '0', border: 'solid 0 transparent'},
      target = new NumericalBoxElement($target),
      balloon = new NumericalBoxElement($balloon);
    balloon.setTop(-options.offsetY
      + ((options.position && options.position.indexOf('top') >= 0) ? target.top - balloon.height
      : ((options.position && options.position.indexOf('bottom') >= 0) ? target.bottom
      : target.center.top - balloon.height / 2)));
    balloon.setLeft(options.offsetX
      + ((options.position && options.position.indexOf('left') >= 0) ? target.left - balloon.width
      : ((options.position && options.position.indexOf('right') >= 0) ? target.right
      : target.center.left - balloon.width / 2)));
    if(options.tipSize > 0) {
      // Add hidden balloon tips into balloon body.
      if($balloon.data('outerTip')) { $balloon.data('outerTip').remove(); $balloon.removeData('outerTip'); }
      if($balloon.data('innerTip')) { $balloon.data('innerTip').remove(); $balloon.removeData('innerTip'); }
      outerTip = new NumericalBoxElement($('<div>').css(initTipStyle).appendTo($balloon));
      innerTip = new NumericalBoxElement($('<div>').css(initTipStyle).appendTo($balloon));
      // Make tip triangle, adjust position of tips.
      var m;
      for(var i = 0; i < Meta.pos.length; i++) {
        m = Meta.getRelativeNames(i);
        if(balloon.center[m.pos.c1] >= target[m.pos.c1] &&
          balloon.center[m.pos.c1] <= target[m.pos.c2]) {
          if(i % 2 === 0) {
            if(balloon[m.pos.o] >= target[m.pos.o] && balloon[m.pos.f] >= target[m.pos.f]) { break; }
          } else {
            if(balloon[m.pos.o] <= target[m.pos.o] && balloon[m.pos.f] <= target[m.pos.f]) { break; }
          }
        }
        m = null;
      }
      if(m) {
        balloon['set' + m.camel.pos.p1]
          (balloon[m.pos.p1] + ((m.isTopLeft) ? 1 : -1) * (options.tipSize - balloon['border' + m.camel.pos.o]));
        makeTip(balloon, outerTip, m, options.tipSize, $balloon.css('border-' + m.pos.o + '-color'), options.tipPosition);
        makeTip(balloon, innerTip, m, options.tipSize - 2 * balloon['border' + m.camel.pos.o], $balloon.css('background-color'), options.tipPosition);
        $balloon.data('outerTip', outerTip.$).data('innerTip', innerTip.$);
      } else {
        $.each([outerTip.$, innerTip.$], function() { this.remove(); });
      }
    }
    // Make up balloon tip.
    function makeTip(balloon, tip, m, tipSize, color) {
      const len = Math.round(tipSize / 1.7320508);
      tip.inactive()
        ['setBorder' + m.camel.pos.f](tipSize)
        ['setBorder' + m.camel.pos.c1](len)
        ['setBorder' + m.camel.pos.c2](len)
        ['set' + m.camel.pos.p1]((m.isTopLeft) ? -tipSize : balloon.inner[m.size.p])
        ['set' + m.camel.pos.c1](balloon.inner[m.size.c] / options.tipPosition - len)
        .active()
        .$.css('border-' + m.pos.f + '-color', color);
    }
  }

  // True if the event comes from the target or balloon.
  function isValidTargetEvent($target, e) {
    const b = $target.data('balloon') && $target.data('balloon').get(0);
    return !(b && (b === e.relatedTarget || $.contains(b, e.relatedTarget)));
  }

  //-----------------------------------------------------------------------------
  // Public
  //-----------------------------------------------------------------------------
  $.fn.balloon = function(options) {
    return this.one('mouseenter', function first(e) {
      const $target = $(this), t = this
      const $balloon = $target.on('mouseenter', function(e) {
        isValidTargetEvent($target, e) && $target.showBalloon();
      }).off('mouseenter', first).showBalloon(options).data('balloon');
      if($balloon) {
        $balloon.on('mouseleave', function(e) {
          if(t === e.relatedTarget || $.contains(t, e.relatedTarget)) { return; }
          $target.hideBalloon();
        }).on('mouseenter', function(e) {
          if(t === e.relatedTarget || $.contains(t, e.relatedTarget)) { return; }
          $balloon.stop(true, true);
          $target.showBalloon();
        });
      }
    }).on('mouseleave', function(e) {
      const $target = $(this);
      isValidTargetEvent($target, e) && $target.hideBalloon();
    });
  };

  $.fn.showBalloon = function(options) {
    var $target, $balloon;
    if(options || !this.data('options')) {
      if($.balloon.defaults.css === null) { $.balloon.defaults.css = {}; }
      this.data('options', $.extend(true, {}, $.balloon.defaults, options || {}));
    }
    options = this.data('options');
    return this.each(function() {
      var isNew;
      $target = $(this);
      isNew = !$target.data('balloon');
      $balloon = $target.data('balloon') || $('<div>');
      if(!isNew && $balloon.data('active')) { return; }
      $balloon.data('active', true);
      clearTimeout($balloon.data('minLifetime'));
      const contents = $.isFunction(options.contents) ? options.contents.apply(this)
        : (options.contents || $target.attr('title') || $target.attr('alt'));
      $target.removeAttr('title');
      if(!options.url && contents === '' || contents == null) { return; }
      if(!$.isFunction(options.contents)) { options.contents = contents; }
      if(options.url) {
        if(!$balloon.data('ajaxDisabled')) {
          if(contents !== '' && contents != null) {
            if(options.html) {
              $balloon.empty().append(contents);
            } else {
              $balloon.text(contents);
            }
          }
          clearTimeout($balloon.data('ajaxDelay'));
          $balloon.data('ajaxDelay',
            setTimeout(function() {
              $balloon.load(
                $.isFunction(options.url) ? options.url.apply($target.get(0)) : options.url,
                function(res, sts, xhr) {
                  if(sts !== 'success' && sts !== 'notmodified') { return; }
                  $balloon.data('ajaxDisabled', true);
                  if(options.ajaxContentsMaxAge >= 0) {
                    setTimeout(function() { $balloon.data('ajaxDisabled', false); }, options.ajaxContentsMaxAge);
                  }
                  if(options.ajaxComplete) { options.ajaxComplete(res, sts, xhr); }
                  makeupBalloon($target, $balloon, options);
                }
              );
            }, options.ajaxDelay)
          );
        }
      } else {
        if(options.html) {
          $balloon.empty().append(contents);
        } else {
          $balloon.text(contents);
        }
      }
      if(isNew) {
        $balloon
          .addClass(options.classname)
          .css(options.css || {})
          .css({ visibility: 'hidden', position: 'absolute' })
          .appendTo('body');
        $target.data('balloon', $balloon);
        makeupBalloon($target, $balloon, options);
        $balloon.hide().css('visibility', 'visible');
      } else {
        makeupBalloon($target, $balloon, options);
      }
      $balloon.data('delay', setTimeout(function() {
        if(options.showAnimation) {
          options.showAnimation.apply(
            $balloon.stop(true, true), [
              options.showDuration, function() {
                options.showComplete && options.showComplete.apply($balloon);
              }
            ]
          );
        } else {
          $balloon.show(options.showDuration, function() {
            if(this.style.removeAttribute) { this.style.removeAttribute('filter'); }
            options.showComplete && options.showComplete.apply($balloon);
          });
        }
        if(options.maxLifetime) {
          clearTimeout($balloon.data('maxLifetime'));
          $balloon.data('maxLifetime',
            setTimeout(function() { $target.hideBalloon(); }, options.maxLifetime)
          );
        }
      }, options.delay));
    });
  };

  $.fn.hideBalloon = function() {
    const options = this.data('options');
    if(!this.data('balloon')) { return this; }
    return this.each(function() {
      const $target = $(this), $balloon = $target.data('balloon');
      clearTimeout($balloon.data('delay'));
      clearTimeout($balloon.data('minLifetime'));
      clearTimeout($balloon.data('ajaxDelay'));
      $balloon.data('minLifetime', setTimeout(function() {
        if(options.hideAnimation) {
          options.hideAnimation.apply(
            $balloon.stop(true, true),
            [
              options.hideDuration,
              function(d) {
                $(this).data('active', false);
                options.hideComplete && options.hideComplete(d);
              }
            ]
          );
        } else {
          $balloon.stop(true, true).hide(
            options.hideDuration,
            function(d) {
              $(this).data('active', false);
              options.hideComplete && options.hideComplete(d);
            }
          );
        }
      },
      options.minLifetime));
    });
  };

  $.balloon = {
    defaults: {
      contents: null, html: false, classname: null,
      url: null, ajaxComplete: null, ajaxDelay: 500, ajaxContentsMaxAge: -1,
      delay: 0, minLifetime: 200, maxLifetime: 0,
      position: 'top', offsetX: 0, offsetY: 0, tipSize: 8, tipPosition: 2,
      showDuration: 100, showAnimation: null,
      hideDuration:  80, hideAnimation: function(d, c) { this.fadeOut(d, c); },
      showComplete: null, hideComplete: null,
      css: {
        fontSize       : '.7rem',
        minWidth       : '.7rem',
        padding        : '.2rem .5rem',
        border         : '1px solid rgba(212, 212, 212, .4)',
        borderRadius   : '3px',
        boxShadow      : '2px 2px 4px #555',
        color          : '#eee',
        backgroundColor: '#111',
        opacity        : 0.85,
        zIndex         : '32767',
        textAlign      : 'left'
      }
    }
  };
})(jQuery);

