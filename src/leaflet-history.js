/**
 * Created by cscott530 on 12/8/13.
 */
(function (window, document) {
    L.ZoomCenter = L.Class.extend({
        initialize: function(zoom, centerPoint) {
            this.zoom = zoom;
            this.centerPoint = centerPoint;
        }
    });
    L.HistoryControl = L.Control.extend({
        map: null,
        _backButton: null,
        _forwardButton: null,
        options: {
            position: 'topright',
            maxHistorySize: 10, //set to 0 for unlimited
            maxFutureSize: 10,   //set to 0 for unlimited
            backImage: 'fa fa-caret-left',
            backText: '',
            backTooltip: 'Go to Previous Extent',
            backImageBeforeText: true,
            forwardImage: 'fa fa-caret-right',
            forwardText: '',
            forwardTooltip: 'Go to Next Extent',
            forwardImageBeforeText: false
        },
        initialize: function(options) {
            L.Util.setOptions(this, options);

            this._state.history.maxSize = this.options.maxHistorySize;
            this._state.future.maxSize = this.options.maxFutureSize;
        },
        onAdd: function(map) {
            var _this = this;
            this.map = map;

            var container = L.DomUtil.create('div', 'history-control btn-group leaflet-control');
            this._backButton = this._createButton('back', container, this.goBack, this);
            this._forwardButton = this._createButton('forward', container, this.goForward, this);
            this._updateDisabled();
            this._addMapListeners();

            return container;
        },
        onRemove: function(map) {
            map.off('movestart');
        },
        performActionWithoutTriggerEvent: function(action) {
            var ignoring = this._state.ignoringEvents;
            this._state.ignoringEvents = true;
            if($.isFunction(action)) {
                action();
            }
            this._state.ignoringEvents = ignoring;
        },
        moveWithoutTriggerEvent: function(map, zoomCenter) {
            this.performActionWithoutTriggerEvent(function() {
                map.setView(zoomCenter.centerPoint, zoomCenter.zoom);
            });
        },
        goBack: function() {
            this._invokeBackOrForward('historyback', this._state.history, this._state.future);
        },
        goForward: function() {
            this._invokeBackOrForward('historyforward', this._state.future, this._state.history);
        },
        _state: {
            ignoringEvents: false,
            history: {
                items: [],
                maxSize: 0
            },
            future: {
                items: [],
                maxSize: 0
            }
        },
        _createButton: function (name, container, action, _this) {
            var text = this.options[name + 'Text'] || '';
            var imageClass = this.options[name + 'Image'] || '';
            var tooltip = this.options[name + 'Tooltip'] || '';
            var button = L.DomUtil.create('a', 'history-' + name + '-button btn btn-default', container);
            if(imageClass) {
                var imageElement = '<i class="' + imageClass + '"></i>';
                if(this.options[name + 'ImageBeforeText']) {
                    text = imageElement + ' ' + text;
                }
                else {
                    text += ' ' + imageElement;
                }
            }
            button.innerHTML = text;
            button.href = '#';
            button.title = tooltip;

            var stop = L.DomEvent.stopPropagation;

            L.DomEvent
                .on(button, 'click', stop)
                .on(button, 'mousedown', stop)
                .on(button, 'dblclick', stop)
                .on(button, 'click', L.DomEvent.preventDefault)
                .on(button, 'click', action, _this)
                .on(button, 'click', this._refocusOnMap, _this);

            return button;
        },
        _updateDisabled: function () {
            $(this._backButton).attr('disabled', (this._state.history.items.length === 0));
            $(this._forwardButton).attr('disabled', (this._state.future.items.length === 0));
        },
        _pop: function(stack) {
            stack = stack.items;
            if($.isArray(stack) && stack.length > 0) {
                return stack.splice(stack.length - 1, 1)[0];
            }
            return undefined;
        },
        _push: function(stack, value) {
            var maxLength = stack.maxSize;
            stack = stack.items;
            if($.isArray(stack)) {
                stack.push(value);
                if(maxLength > 0 && stack.length > maxLength) {
                    stack.splice(0, 1);
                }
            }
        },
        _invokeBackOrForward: function(eventName, stackToPop, stackToPushCurrent) {
            var response = this._popStackAndUseLocation(stackToPop, stackToPushCurrent);
            if(response) {
                map.fire(eventName, response);
                return true;
            }
            return false;
        },
        _popStackAndUseLocation : function(stackToPop, stackToPushCurrent) {
            //check if we can pop
            if($.isArray(stackToPop.items) && stackToPop.items.length > 0) {
                //get most recent
                var previous =  this._pop(stackToPop);
                //save where we currently are in the 'other' stack
                var current = this._buildZoomCenterObjectFromCurrent(this.map);
                this._push(stackToPushCurrent, current);
                this.moveWithoutTriggerEvent(this.map, previous);

                return {
                    previousLocation: previous,
                    newLocation: current
                };
            }
        },
        _buildZoomCenterObjectFromCurrent:function(map) {
            return new L.ZoomCenter(map.getZoom(), map.getCenter());
        },
        _addMapListeners: function() {
            var _this = this;
            this.map.on('movestart', function(e) {
                if(!_this._state.ignoringEvents) {
                    _this._state.future.items = [];
                    _this._push(_this._state.history, _this._buildZoomCenterObjectFromCurrent(e.target));
                }

                _this._updateDisabled();
            });
        }
    });
}(this, document));