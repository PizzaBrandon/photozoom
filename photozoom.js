/*!
 * PhotoZoom - jQuery Plugin
 * Version 0.2.0 - 2014-03-17
 * https://github.com/PizzaBrandon/photozoom
 *
 * Copyright (c) 2014 by Brandon Belvin
 * Released under the MIT License | http://brandon.mit-license.org
 */

/* jshint browser:true, jquery:true */
(function ($, window) {
    'use strict';

    /**
     * Finds the edges of the passed in element and optionally clips to the edges
     * of the visible screen.
     *
     * @param {(string|HTMLElement|Object)} elem Element to analyze
     * @param {boolean=} clip Whether to clip the region to the top and bottom boundaries of the screen
     * @returns {Object.<string, number>}
     */
    function findElementBounds(elem, clip) {
        var $elem = $(elem),
            $window = $(window),
            bounds = {
                left: $elem.offset().left,
                top: $elem.offset().top,
                right: $elem.offset().left + $elem.outerWidth(),
                bottom: $elem.offset().top + $elem.outerHeight()
            };

        if (clip) {
            // Clip top the top/bottom bounds of screen
            bounds.top = Math.max(bounds.top, $window.scrollTop());
            bounds.bottom = Math.min(bounds.bottom, $window.scrollTop() +
                $window.height());
        }

        bounds.width = bounds.right - bounds.left;
        bounds.height = bounds.bottom - bounds.top;

        return bounds;
    }

    var Lens = function (options) {
        var self = this,
            zoomContainer = options.zoomContainer,
            image = options.image,
            lensSize,
            lens;

        $('#photozoomLens').remove();
        lens = $('<div id="photozoomLens" class="photozoomLens"/>')
            .css({
                'position': 'absolute',
                'background': '#fff',
                'border': '2px solid #333',
                'opacity': 0.5,
                'display': 'none',
                'cursor': 'pointer'
            }).appendTo(image);

        self.resize = function () {
            var zoomRatio = zoomContainer.zoomRatio || 0.25;
            var zoomBoundary = zoomContainer.zoomBoundary;

            lensSize = {
                'width': Math.round(Math.min(image.width(),
                    zoomBoundary.width * zoomRatio)),
                'height': Math.round(Math.min(image.height(),
                    zoomBoundary.height * zoomRatio))
            };

            lens.css(lensSize);

            return self;
        };
        $(document).on('photozoom.imageready', self.resize);

        self.moveLens = function (cursorPos) {
            if (!lens) {
                return;
            }

            var x = cursorPos.x;
            var y = cursorPos.y;

            if (x < lensSize.width / 2) {
                x = 0;
            } else if (x > image.width() - (lensSize.width / 2)) {
                x = image.width() - lensSize.width;
            } else {
                x = x - (lensSize.width / 2);
            }

            if (y < lensSize.height / 2) {
                y = 0;
            } else if (y > image.height() - (lensSize.height / 2)) {
                y = image.height() - lensSize.height;
            } else {
                y = y - (lensSize.height / 2);
            }

            var pos = {
                'left': x,
                'top': y
            };

            lens.css(pos);

            return pos;
        };

        if (options.pos) {
            self.moveLens(options.pos);
        }

        self.show = function () {
            if (lens) {
                lens.show();
            }

            return self;
        };

        self.hide = function () {
            if (lens) {
                lens.hide();
            }

            return self;
        };

        self.destroy = function () {
            if (lens) {
                lens.remove();
            }
            lens = null;

            $(document).off('photozoom.imageready');

            return self;
        };

        self.element = function () {
            return lens;
        };
    };

    var ZoomContainer = function (options) {
        var self = this,
            image = options.image,
            target = options.target,
            zoomImageSrc = options.zoomImage,
            container,
            imageObj,
            zoomImage,
            zoomSize;

        $('#photozoomContainer').remove();
        container = $('<div id="photozoomContainer" class="photozoomContainer"/>')
            .css({
                'position': 'absolute',
                'background': '#fff',
                'overflow': 'hidden',
                'display': 'none'
            }).appendTo(document.body);

        self.resize = function () {
            var boundary = self.zoomBoundary = findElementBounds(target, options.clip);
            container.css({
                'top': boundary.top,
                'left': boundary.left,
                'width': boundary.width,
                'height': boundary.height
            });

            return self;
        };

        imageObj = new Image();
        imageObj.onload = function () {
            zoomSize = {
                'width': imageObj.width,
                'height': imageObj.height
            };
            self.zoomRatio = image.width() / imageObj.width;
            self.resize();
            $(document).trigger('photozoom.imageready');
        };
        imageObj.src = zoomImageSrc;

        zoomImage = $('<img id="photozoomImage" class="photozoomImage"/>')
            .attr('src', zoomImageSrc)
            .css({
                'position': 'absolute'
            }).appendTo(container);

        self.moveImage = function (pos) {
            zoomImage.css({
                top: -pos.top / self.zoomRatio,
                left: -pos.left / self.zoomRatio
            });

            return self;
        };

        self.show = function () {
            if (container) {
                container.show();
            }

            return self;
        };

        self.hide = function () {
            if (container) {
                container.hide();
            }

            return self;
        };

        self.destroy = function () {
            zoomImage.remove();
            zoomImage = null;
            container.remove();
            container = null;

            return self;
        };
    };

    var Gallery = function (options) {
        var self = this,
            image = options.image,
            gallery = $(options.gallery);

        function handleGalleryClick(e) {
            e.preventDefault();
            var data = $(e.currentTarget).data();

            image.switchImage(data.src, data.zoomSrc);
        }

        // This attaches more listeners than preferred, but is faster in reality
        // because jQuery's "has" check is too slow to run synchronous to click
        gallery.find('[data-photozoom-gallery]').on('click.photozoom', handleGalleryClick);

        self.destroy = function () {
            gallery.find('[data-photozoom-gallery]').off('click.photozoom');
            gallery = null;

            return self;
        };

        return self;
    };

    var photozoom = function (options) {
        var self = this;
        var active = false;
        var defaults = {
            clipToBoundaries: true,
            target: '#photozoomWindow',
            gallery: '#photozoomGallery'
        };
        options = $.extend(defaults, options);

        var zoomContainer = self.zoomContainer = new ZoomContainer({
            'image': self,
            'target': options.target,
            'zoomImage': self.data().zoomSrc,
            'clip': options.clipToBoundaries
        });

        var lens = self.lens = new Lens({
            'image': self,
            'zoomContainer': zoomContainer
        });

        var gallery = self.gallery = new Gallery({
            'image': self,
            'gallery': options.gallery
        });

        function activate(touch) {
            if (active) {
                return;
            }

            active = touch || true;

            zoomContainer.resize().show();
            lens.resize().show();

            if (touch) {
                $(document).on('touchmove.photozoom', handleMouseMove)
                    .on('touchend.photozoom', deactivate);
            } else {
                $(document).on('mousemove.photozoom', handleMouseMove);
                lens.element().on('mouseout.photozoom', deactivate);
            }
        }

        function deactivate() {
            if (!active) {
                return;
            }
            lens.hide();
            zoomContainer.hide();

            $(document).off('touchmove.photozoom touchend.photozoom mousemove.photozoom');
            lens.element().off('mouseout.photozoom');

            active = false;
        }

        function handleMouseMove(e) {
            var lensPos,
                touch = e.originalEvent.touches ? e.originalEvent.touches[0] :
                    (e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0] : null);

            if (touch) {
                e.preventDefault();

                activate('touch');
                e = touch;
            } else {
                activate();
            }

            lensPos = {
                x: e.pageX - self.offset().left,
                y: e.pageY - self.offset().top
            };

            lensPos = lens.moveLens(lensPos);
            zoomContainer.moveImage(lensPos);
        }

        self.on('touchstart.photozoom mouseover.photozoom', handleMouseMove);

        self.switchImage = function (src, zoomSrc) {
            var img = self.find('img');
            if (img.attr('src') === src) {
                // Not changing image
                return;
            }

            deactivate();
            zoomContainer.destroy();
            lens.destroy();

            img.attr('src', src);

            zoomContainer = self.zoomContainer = new ZoomContainer({
                'image': self,
                'target': options.target,
                'zoomImage': zoomSrc
            });

            lens = self.lens = new Lens({
                'image': self,
                'zoomContainer': zoomContainer
            });
        };

        self.destroy = function () {
            if (lens) {
                lens.destroy();
                lens = null;
            }

            if (zoomContainer) {
                zoomContainer.destroy();
                zoomContainer = null;
            }

            if (gallery) {
                gallery.destroy();
                gallery = null;
            }

            self = null;
            self.off('touchstart.photozoom touchmove.photozoom mousemove.photozoom mouseout.photozoom touchend.photozoom');

            return self;
        };

        return self;
    };

    $.fn.photozoom = photozoom;
})(jQuery, window);
