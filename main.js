(function ($) {
$(function () {
VK.init(function() {
    var elements = {
            canvas: $('#graph-canvas')
        },
        app = new App(elements);
    app.init();
});
});
})(jQuery);

function View () {
    
}

View.prototype = {
    renderProgress: function (progress) {
        
    }
};

function GraphRenderer (domElements, nodesLength) {
    this.canvasElement = domElements.canvas;
    this.canvas = this.canvasElement.get(0).getContext('2d');
    this.canvasSize = {
        width: this.canvasElement.width(),
        height: this.canvasElement.height()
    };
    this.setOptions(nodesLength);
}

GraphRenderer.prototype = {
    init: function (system) {
        this.sys = system;
        this.sys.screenSize(this.screenSize.width, this.screenSize.height);
        this.sys.screenPadding(10);
    },

    clearEdges: function () {
        for (var k in this.drawedEdges) {
            this.svgElement.removeChild(this.drawedEdges[k]);
        }
        this.drawedEdges = {};
    },

    redrawEdges: function () {
        var canvas = this.canvas;
        canvas.beginPath();
        this.sys.eachEdge(function (edge, pt1, pt2) {
            canvas.moveTo(pt1.x, pt1.y);
            canvas.lineTo(pt2.x, pt2.y);
        });
        canvas.closePath();
        canvas.stroke();
    },

    redrawNodes: function () {
        var canvas = this.canvas;
        this.sys.eachNode(function (node, pt) {
            var img = new Image();
            img.src = node.data.photo;
            canvas.save();
            canvas.beginPath();
            canvas.arc(pt.x, pt.y, 40, 0, 2 * Math.PI, true);
            canvas.drawImage(img, pt.x - 20, pt.y - 20);
            canvas.clip();
            canvas.closePath();
            canvas.restore();
            /*
            if (!_this.drawedNodes[node.name]) {
                var a = document.createElement('a'),
                    img = new Image();
                a.href = 'http://vkontakte.ru/id' + node.name;
                a.title = node.data.name;
                a.target = 'blank';
                img.src = node.data.photo;
                a.appendChild(img);
                a.className = 'graph-point inited';
                setTimeout(function () { a.className = 'graph-point'; }, 1);
                _this.wrapperElement.appendChild(a);
                _this.drawedNodes[node.name] = a;
            }
            _this.setPointPos(_this.drawedNodes[node.name], pt);
            */
        });
    },

    redraw: function () {
        var _this = this;
        this.prepareCanvas();
        this.canvas.save();
        this.canvas.translate(0, 0);

        this.redrawEdges();
        this.redrawNodes();
        this.canvas.restore();/*
        this.sys.eachNode(function (node, pt) {
            if (!_this.drawedNodes[node.name]) {
                var a = document.createElement('a'),
                    img = new Image();
                a.href = 'http://vkontakte.ru/id' + node.name;
                a.title = node.data.name;
                a.target = 'blank';
                img.src = node.data.photo;
                a.appendChild(img);
                a.className = 'graph-point inited';
                setTimeout(function () { a.className = 'graph-point'; }, 1);
                _this.wrapperElement.appendChild(a);
                _this.drawedNodes[node.name] = a;
            }
            _this.setPointPos(_this.drawedNodes[node.name], pt);
        });
        
        this.sys.eachEdge(function (edge, pt1, pt2) {
            var name = edge.source.name + ',' + edge.target.name;
            if (!_this.drawedEdges[name]) {
                var line = document.createElement('line');
                line.className = 'graph-edge inited';
                setTimeout(function () { line.className = 'graph-edge'; }, 1);
                _this.svgElement.appendChild(line);
                _this.drawedEdges[name] = line;
            }
            _this.setEdgePos(_this.drawedEdges[name], pt1, pt2);
        });*/
    },
    
    setPointPos: function (element, pt) {
        cssTranslate(element, pt);
    },
    
    setEdgePos: function (element, pt1, pt2) {
        element.setAttribute('x1', pt1.x);
        element.setAttribute('y1', pt1.y);
        element.setAttribute('x2', pt2.x);
        element.setAttribute('y2', pt2.y);
    },
    
    setOptions: function (nodesLength) {
        this.nodesLength = nodesLength;
        this.screenSize = { width: 100 * Math.sqrt(nodesLength), height: 100 * Math.sqrt(nodesLength) };
    },
    
    prepareCanvas: function () {
        this.canvas.restore();
        this.canvas.save();
        this.canvas.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
        this.canvas.translate(-this.screenSize.width/2 + this.canvasSize.width/2, -this.screenSize.height/2 + this.canvasSize.height/2);
    }
};

function Graph (domElements, nodesLength) {
    this.sys = arbor.ParticleSystem(1000); // создаём систему
    this.sys.parameters({ gravity:true }); // гравитация вкл
    this.sys.renderer = new GraphRenderer(domElements, nodesLength); //начинаем рисовать в выбраной области
}

Graph.prototype = {
    addNodes: function (nodes) {
        for (var k in nodes) {
            this.sys.addNode(k, nodes[k]);
        }
    },
    
    clearNodes: function () {
        var sys = this.sys;
        sys.eachNode(function (node, pt) {
            sys.pruneNode(node);
        });
    },
    
    addEdge: function (edge) {
        this.sys.addEdge(edge.src, edge.target);
    },
    
    clearEdges: function () {
        var sys = this.sys;
        sys.eachEdge(function (edge, pt1, pt2) {
            sys.pruneEdge(edge);
        });
    },
    
    setNodesLength: function (length) {
        this.sys.renderer.setNodesLength(length);
    }
};

function App (domElements) {
    this.domElements = domElements;
    this.friends = {};
    this.relations = {};
    this.uidFriends = [];
    this.graph;
    this.progress = 0; //loading progress
    this.view = new View();
}

App.prototype = {
    init: function () {
        this.getMyFriends();
    },
    
    refresh: function () {
        this.graph.clearEdges();
        this.computeRelations();
    },
    
    getMyFriends: function () {
        var _this = this;
        VK.api(
            'friends.get',
            {
                fields: 'uid,first_name,last_name,sex,photo'
            },
            function (data) {
                if (data.error) {
                    if (data.error == 6 || data.error == 1) {
                        _this.getMyFriends();
                    }
                    return;
                }
                
                var friends = data.response;
                _this.graph = new Graph(_this.domElements, friends.length);
                for (var i = 0, il = friends.length; i < il; i++) {
                    var friend = friends[i];
                    _this.uidFriends.push(friend.uid);
                    _this.friends[friend.uid] = {
                        name: friend.first_name + ' ' + friend.last_name,
                        male: friend.sex == 1 ? false : true,
                        photo: friend.photo
                    };
                }
                _this.uidFriends.sort();
                _this.friendsMD5 = calcMD5(_this.uidFriends.join(''));
                _this.setRelations();
                _this.graph.addNodes(_this.friends);
            }
        );
    },
    
    setRelations: function () {
        var _this = this;
        VK.api(
            'storage.get',
            {
                key: 'relationsMeta'
            },
            function (data) {
                if (data.error) {
                    if (data.error == 10) {
                        _this.setRelations();
                    }
                    return;
                }
                
                var d = data.response.split(','),
                    md5 = d[0],
                    encodedRelationsLength = d[1];
                if (md5 == _this.friendsMD5) {
                    _this.computeRelationsFromStorage(encodedRelationsLength); // если всё ок берем связи друзей из стораджа
                } else {
                    _this.computeRelations(); // иначе вычисляем все связи
                }
            }
        );
    },
    
    // вычисляем связи друзей из хранилища
    computeRelationsFromStorage: function (encodedRelationsLength) {
        var _this = this,
            increaseBy = 1 / encodedRelationsLength;
        for (var i = 0, il = encodedRelationsLength; i < il; i++) {
            (function (i) {
                var get = function (i) {                
                    VK.api(
                        'storage.get',
                        {
                            key: 'relations' + i
                        },
                        function (data) {
                            if (data.error) {
                                if (data.error == 10) {
                                    get(i);
                                }
                                return;
                            }
                            var edges = _this.parseEncodedRelations(data.response);
                            _this.addEdges(edges);
                            _this.updateProgress({ increaseBy: increaseBy });
                        }
                    );
                }
                get(i);
            })(i);
        }
    },
    
    // gf
    parseEncodedRelations: function (encoded) {
        var perFriend = encoded.split('|'),
            edges = [];
        for (var i = 0, il = perFriend.length; i < il; i++) {
            var encodedRelations = perFriend[i],
                indexes = encodedRelations.split('='),
                friendIndex = indexes[0],
                friendsIndexes = indexes[1].split(',');
            for (var j = 0, jl = friendsIndexes.length; j < jl; j++) {
                var srcUid = this.uidFriends[friendIndex],
                    targetUid = this.uidFriends[friendsIndexes[j]];
                if (!this.relations[srcUid]) {
                    this.relations[srcUid] = {};
                }
                this.relations[srcUid][targetUid] = true;
                edges.push({ src: srcUid, target: targetUid });
            }
        }
        return edges;
    },
    
    addEdges: function (edges) {
        for (var i = 0, il = edges.length; i < il; i++) {
            this.graph.addEdge(edges[i]);
        }
    },
    
    // вычисляем связи друзей по запросу
    computeRelations: function () {
        var _this = this,
            uidsHash = {},
            increaseBy = 1 / this.uidFriends.length;
        for (var i = 0, k = 0, il = this.uidFriends.length; i < il; i++) {
            (function (i) {
                var uid = _this.uidFriends[i],
                    getFriends = function () {
                    VK.api(
                        'friends.get',
                        {
                            fields: 'uid',
                            uid: uid
                        },
                        function (data) {
                            if (data.error) {
                                if (data.error == 6 || data.error == 1) {
                                   getFriends();
                                }
                                return;
                            }
                            var friends = data.response,
                                edges = [];
                            for (var j = 0, jl = friends.length; j < jl; j++) {
                                var friendUid = friends[j].uid;
                                if (_this.friends[friendUid] && (!_this.relations[friendUid] || !_this.relations[friendUid][uid])) {
                                    if (!_this.relations[uid]) {
                                        _this.relations[uid] = {};
                                    }
                                    _this.relations[uid][friendUid] = true;
                                    edges.push({ src: uid, target: friendUid });
                                }
                            }
                            _this.addEdges(edges);
                            if (++k == il) {
                                _this.saveEncoded(uidsHash);
                                _this.updateProgress({ value: 1 });
                            } else {
                                _this.updateProgress({ increaseBy: increaseBy });
                            }
                        }
                    );
                }
                uidsHash[uid] = i;
                getFriends();
            })(i);
        }
    },
    
    saveEncoded: function (uidsHash) {
        var encodedRelations = [],
            maxLength = 4096,
            tempStr = '';
        for (var uid in this.relations) {
            var friends = this.relations[uid],
                encodedRelationStr = uidsHash[uid] + '=';
                var friendsIndexes = [];
            for (var friendUid in friends) {
                friendsIndexes.push(uidsHash[friendUid]);
            }
            encodedRelationStr += friendsIndexes.join(',');
            if (tempStr != '') {
                tempStr += '|';
            }
            tempStr += encodedRelationStr;
            if (tempStr.length >= maxLength) {
                encodedRelations.push(tempStr);
                tempStr = '';
            }
        }
        
        this.saveEncodedRelations(encodedRelations);
        this.saveEncodedRelationsMeta(this.friendsMD5, encodedRelations.length);
    },
    
    saveEncodedRelations: function (encodedRelations) {
        for (var i = 0, il = encodedRelations.length; i < il; i++) {
            (function (i) {
                var set = function (i) {
                    VK.api(
                        'storage.set',
                        {
                            key: 'relations' + i,
                            value: encodedRelations[i]
                        },
                        function (data) {
                            if (data.error && data.error == 10) {
                                set(i);
                                return;
                            }
                        }
                    );
                };
                set(i);
            })(i);
        }
    },
    
    saveEncodedRelationsMeta: function (friendsMD5, relationsLength) {
        var _this = this;
        VK.api(
            'storage.set',
            {
                key: 'relationsMeta',
                value: friendsMD5 + ',' + relationsLength
            },
            function (data) {
                if (data.error && data.error == 10) {
                    _this.saveEncodedRelationsMeta(friendsMD5, relationsLength);
                    return;
                }
            }
        );
    },
    
    updateProgress: function (progress) {
        if (progress.increaseBy) {
            this.progress += progress.increaseBy;
        }
        if (progress.value) {
            this.progress = progress.value;
        }
        if (this.progress > 1) {
            this.progress = 1;
        }
        this.view.renderProgress(this.progress);
    }
};

var cssTranslate = (function () {
    var el = document.createElement('div');
    if (typeof el.style.MozTransform != 'undefined') {
        return function (element, pt) {
            element.style.MozTransform = 'translate(' + pt.x + 'px,' + pt.y + 'px)';
        };
    }
    if (typeof el.style.OTransform != 'undefined') {
        return function (element, pt) {
            element.style.OTransform = 'translate(' + pt.x + 'px,' + pt.y + 'px)';
        };
    }
    if (typeof el.style.msTransform != 'undefined') {
        return function (element, pt) {
            element.style.msTransform = 'translate(' + pt.x + 'px,' + pt.y + 'px)';
        };
    }
    el.style['-webkit-transform'] = 'scale(0)';
    if (el.style.getPropertyValue('-webkit-transform')) {
        return function (element, pt) {
            element.style['-webkit-transform'] = 'translate3d(' + pt.x + 'px,' + pt.y + 'px,0px)';
        };
    }
    return function (element, pt) {
        element.style.left = pt.x + 'px';
        element.style.top = pt.y + 'px';
    };
})();
