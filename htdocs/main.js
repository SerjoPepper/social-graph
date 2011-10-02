(function ($) {
$(function () {
VK.init(function() {
    var app = new App();
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

function Graph (nodes) {
    this.tickId = 0;
    this.nodeSize = { w: 20, h: 20, hw: 10, hh: 10 };
    this.screenSize = { width: 200 * Math.sqrt(nodes.length), height: 200 * Math.sqrt(nodes.length) };
    
    this.svg = d3.select("#graph-wrapper").append("svg:svg")
        .attr("width", $('#graph-wrapper').width())
        .attr("height", $('#graph-wrapper').height());
    
    var svgNode = this.svg.node(),
        g = this.svg.append('svg:g'),
        gNode = g.node(),
        _this = this;
        
    gNode.lastX = 0;
    gNode.lastY = 0;
    
    $(svgNode)
        .mousedown(function (e) {
            console.log(e.target)
            if (e.target === svgNode) {
                this.drugging = true;
                this.startPageX = e.pageX;
                this.startPageY = e.pageY;
            }
        });
    $(document)
        .mouseup(function (e) {
            if (svgNode.drugging) {
                gNode.lastX = gNode.lastX + e.pageX - svgNode.startPageX;
                gNode.lastY = gNode.lastY + e.pageY - svgNode.startPageY;
                svgNode.drugging = false;
            }
        })
        .mousemove(function (e) {
        if (svgNode.drugging) {
            gNode.setAttribute('transform', 'translate(' + (gNode.lastX + e.pageX - svgNode.startPageX) +', ' + (gNode.lastY + e.pageY - svgNode.startPageY) +')');
        }
    });
    
    this.linesWrapper = g.append('svg:g').attr('class', 'lines');
    this.nodesWrapper = g.append('svg:g').attr('class', 'nodes');
        
    this.nodes = nodes;
    this.links = [];
    this.force = d3.layout.force()
        .nodes(this.nodes)
        .links(this.links)
        .linkDistance(80) // link distance
        .linkStrength(0.5) // link strength
        .friction(0.8) // friction coefficient
        .charge(-220) // charge strength
        .gravity(.1) // gravity strength
        .theta(1) // accuracy of the charge interaction
        .size([607, 500]) // layout size in x and y;
    
    this.svgNodes = this.nodesWrapper.selectAll('a.node')
        .data(this.nodes)
        .enter().append('svg:a')
        .attr('class', 'node')
        .attr('xlink:href', function (d) { return 'http://vkontakte.ru/id' + d.uid; })
        .attr('xlink:title', function(d) { return d.name; })
        .attr('target', 'blank')
        .call(this.force.drag);

    //this.svgNodes.append('svg:title')
    //    .text(function(d) { return d.name; });
    
    this.svgNodes.append('svg:image')
        .attr('class', 'photo')
        .attr('xlink:href', function (d) { return d.photo; })
        .attr('x', -this.nodeSize.hw)
        .attr('y', -this.nodeSize.hh)
        .attr('width', this.nodeSize.h + 'px')
        .attr('height', this.nodeSize.w + 'px');
    
    this.svgNodes.append('svg:rect')
        .attr('class', function (d) { return d.sex + ' rect'; })
        .attr('x', -this.nodeSize.hw)
        .attr('y', -this.nodeSize.hh)
        .attr('width', this.nodeSize.h + 'px')
        .attr('height', this.nodeSize.w + 'px')
        .attr('rx', 2 + 'px')
        .attr('ry', 2 + 'px');
        
    this.svgNodes.on('mouseover', function (d, i) { _this.force.resume(); });
    this.svgNodes.on('mouseout', function (d, i) { _this.force.resume(); });
        
    this.svgLinks;
    
    this.force.on('tick', function () { _this.onTick(); });
    this.force.start();
}

Graph.prototype = {
    clearNodes: function () {
        this.nodes = [];
    },
    
    addLink: function (link) {
        this.links.push(link);
        
        
        this.svgLines = this.linesWrapper.selectAll('line.link')
            .data(this.links)
            .enter().append('svg:line')
            .attr('class', 'link');
 
        this.drawLinks();
        
        this.force.start();
    },
    
    clearLink: function () {
        this.links = [];
    },
    
    onTick: function () {
        this.drawLinks();
        this.svgNodes.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ') scale(' + (d.fixed ? 1.8 : 1) +')'; })
                     .attr('class', function (d) { return 'node' + (d.focused ? ' focused' : '') + (d.fixed ? ' fixed' : ''); });
    },
    
    drawLinks: function () {
        var id = this.tickId++;
        
        this.linesWrapper.selectAll('line.link').each(function (d, i) {
            if (typeof d.source.index == 'undefined' || typeof d.target.index == 'undefined'){
                return;
            }
            var sf = d.source.fixed,
                tf = d.target.fixed;

            if (!sf && !tf) {
                this.setAttribute('class', 'link');
                d.source.focused = (d.source.tickId == id);
                d.target.focused = (d.target.tickId == id);
                return;
            }
            
            d.source.focused = true;
            d.target.focused = true;
            d.source.tickId = id;
            d.target.tickId = id;
            
            this.setAttribute('class', 'link active');
            this.setAttribute('x1', d.source.x);
            this.setAttribute('y1', d.source.y);
            this.setAttribute('x2', d.target.x);
            this.setAttribute('y2', d.target.y);
        });
    }
};

function App () {
    this.relations = {};
    this.friendsData = []; // данные о друзьях
    this.uidFriendsArr = [];
    this.uidFriendsHash = {};
    this.graph;
    this.progress = 0; //loading progress
    this.view = new View();
    this.requestDelay = 400; // задержка м/у запросами
    this.edgeAppearDelay = 0; // задержка м/у появлениями ребер
    this.myUid;
}

App.prototype = {
    init: function () {
        this.getMe();
    },
    
    refresh: function () {
        this.graph.clearEdges();
        this.computeRelations();
    },
    
    getMe: function () {
        var _this = this;
        VK.api('getUserInfoEx', function (data) {
            if (!data.error) {
                /*
                var myself = data.response;
                // сам себе любимый друг :)
                _this.myUid = myself.user_id;
                _this.uidFriendsArr.push(myself.user_id);
                _this.uidFriendsHash[myself.user_id] = true;
                _this.friendsData.push({
                    uid: myself.user_id,
                    name: myself.user_name,
                    sex: myself.user_sex == 1 ? 'girl' : 'boy',
                    photo: myself.user_photo
                });*/
                _this.getMyFriends();
            }
            
        });
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
                    if (data.error.error_code == 6 || data.error.error_code == 1) {
                        setTimeout(function () { _this.getMyFriends(); }, _this.requestDelay);
                    }
                    return;
                }
                
                var friends = data.response;
                for (var i = 0, il = friends.length; i < il; i++) {
                    var friend = friends[i];
                    _this.uidFriendsArr.push(friend.uid);
                    _this.uidFriendsHash[friend.uid] = true
                    _this.friendsData.push({
                        uid: friend.uid,
                        name: friend.first_name + ' ' + friend.last_name,
                        sex: friend.sex == 1 ? 'girl' : 'boy',
                        photo: friend.photo
                    });
                }
                _this.friendsData.sort(function (a, b) { return (a.uid > b.uid) ? 1 : -1; });
                _this.graph = new Graph(_this.friendsData);
                _this.uidFriendsArr.sort(function (a, b) { return a > b ? 1 : -1; });
                _this.friendsMD5 = calcMD5(_this.uidFriendsArr.join('+'));
                _this.setRelations();
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
                    if (data.error.error_code == 10 || data.error.error_code == 6) {
                        setTimeout(function () { _this.setRelations(); }, _this.requestDelay);
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
                var get = function () {                
                    VK.api(
                        'storage.get',
                        {
                            key: 'relations' + i
                        },
                        function (data) {
                            if (data.error) {
                                if (data.error.error_code == 10 || data.error.error_code == 6) {
                                    setTimeout(get, _this.requestDelay);
                                }
                                return;
                            }
                            var edges = _this.parseEncodedRelations(data.response);
                            _this.addLinks(edges);
                            _this.updateProgress({ increaseBy: increaseBy });
                        }
                    );
                }
                setTimeout(get, i * _this.requestDelay);
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
                var srcUid = this.uidFriendsArr[friendIndex],
                    targetUid = this.uidFriendsArr[friendsIndexes[j]];
                if (!this.relations[srcUid]) {
                    this.relations[srcUid] = {};
                }
                this.relations[srcUid][targetUid] = true;
                edges.push({
                    source: this.uidFriendsArr.indexOf(srcUid),
                    target: this.uidFriendsArr.indexOf(targetUid)
                });
            }
        }
        return edges;
    },
    
    addLinks: function (edges) {
        var _this = this;
        for (var i = 0, il = edges.length; i < il; i++) {
            (function (i) {
                setTimeout(function () { _this.graph.addLink(edges[i]); }, _this.edgeAppearDelay * i);
            })(i);
        }
    },
    
    // вычисляем связи друзей по запросу
    computeRelations: function () {
        var _this = this,
            uidsHash = {},
            increaseBy = 1 / this.uidFriendsArr.length;
        for (var i = 0, k = 0, il = this.uidFriendsArr.length; i < il; i++) {
            (function (i) {
                var uid = _this.uidFriendsArr[i];
                uidsHash[uid] = i;
                var getFriends = function () {
                    VK.api(
                        'friends.get',
                        {
                            fields: 'uid',
                            uid: uid
                        },
                        function (data) {
                            if (data.error) {
                                if (data.error.error_code == 6 || data.error.error_code == 1) {
                                   setTimeout(getFriends, _this.requestDelay);
                                } else {
                                    if (++k == il) {
                                        _this.saveEncoded(uidsHash);
                                        _this.updateProgress({ value: 1 });
                                    } else {
                                        _this.updateProgress({ increaseBy: increaseBy });
                                    }
                                }
                                return;
                            }
                            var friends = data.response,
                                edges = [];
                            for (var j = 0, jl = friends.length; j < jl; j++) {
                                var friendUid = friends[j].uid;
                                if (_this.uidFriendsHash[friendUid] && (!_this.relations[friendUid] || !_this.relations[friendUid][uid])) {
                                    if (!_this.relations[uid]) {
                                        _this.relations[uid] = {};
                                    }
                                    _this.relations[uid][friendUid] = true;
                                    edges.push({
                                        source: _this.uidFriendsArr.indexOf(uid),
                                        target: _this.uidFriendsArr.indexOf(friendUid)
                                    });
                                }
                            }
                            _this.addLinks(edges);
                            if (++k == il) {
                                _this.saveEncoded(uidsHash);
                                _this.updateProgress({ value: 1 });
                            } else {
                                _this.updateProgress({ increaseBy: increaseBy });
                            }
                        }
                    );
                };
                setTimeout(getFriends, i * _this.requestDelay);
            })(i);
        }
    },
    
    saveEncoded: function (uidsHash) {
        var encodedRelations = [],
            maxLength = 4096,
            tempStr = '',
            s = '';
        for (var uid in this.relations) {
            var friends = this.relations[uid],
                encodedRelationStr = uidsHash[uid] + '=',
                friendsIndexes = [];
            for (var friendUid in friends) {
                friendsIndexes.push(uidsHash[friendUid]);
            }
            encodedRelationStr += friendsIndexes.join(',');
            
            s = tempStr + (tempStr != '' ? '|' : '') + encodedRelationStr;
            if (s.length > maxLength) {
                encodedRelations.push(tempStr);
                tempStr = encodedRelationStr;
            } else {
                tempStr = s;
            }
        }
        encodedRelations.push(tempStr);
        
        this.saveEncodedRelations(encodedRelations);
        this.saveEncodedRelationsMeta(this.friendsMD5, encodedRelations.length);
    },
    
    saveEncodedRelations: function (encodedRelations) {
        var _this = this;
        for (var i = 0, il = encodedRelations.length; i < il; i++) {
            (function (i) {
                var set = function () {
                    VK.api(
                        'storage.set',
                        {
                            key: 'relations' + i,
                            value: encodedRelations[i]
                        },
                        function (data) {
                            if (data.error && (data.error.error_code == 10 || data.error.error_code == 6)) {
                                setTimeout(set, _this.requestDelay);
                                return;
                            }
                        }
                    );
                };
                setTimeout(set, i * _this.requestDelay)
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
                if (data.error && (data.error.error_code == 10 || data.error.error_code == 6)) {
                    setTimeout(function () { _this.saveEncodedRelationsMeta(friendsMD5, relationsLength); }, _this.requestDelay);
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
